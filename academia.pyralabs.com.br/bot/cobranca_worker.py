"""
cobranca_worker.py — Worker de disparo em lote de cobranças via WhatsApp.

Fluxo:
  1. Consome fila Redis `cobrancas_queue:{tenant_id}` (RPOP), só quando o tenant
     está dentro do horário comercial configurado (evita disparo fora de hora)
  2. Para cada cobrança: busca dados no banco, monta mensagem, envia via Evolution
  3. Aguarda um delay calculado para espalhar os envios pela janela de disparo
     (COBRANCA_JANELA_INICIO–COBRANCA_JANELA_FIM) em vez de esvaziar a fila em
     rajada sempre no mesmo horário — reduz o "fingerprint" de bot pra Meta
  4. Atualiza hash de progresso `cobrancas_progress:{tenant_id}`
  5. Respeita limite diário `cobrancas_daily:{tenant_id}:{data}` (TTL 24h)

Estrutura Redis:
  cobrancas_queue:{tenant_id}     → List  [cobranca_id, ...]
  cobrancas_progress:{tenant_id}  → Hash  {total, sent, failed, status, started_at}
  cobrancas_daily:{tenant_id}:{YYYY-MM-DD} → String contador (TTL 86400s)
  cobranca_horarios_cache:{tenant_id} → String JSON (TTL 300s, cache do config_nicho.horarios)
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
import re
from datetime import date, datetime
from typing import Any

import asyncpg

import os

from config import BOT_DATABASE_CONNECTION_URI, EVOLUTION_API_URL, EVOLUTION_AUTHENTICATION_API_KEY
from router import is_within_hours

logger = logging.getLogger(__name__)

# ─── Configuração ─────────────────────────────────────────────────────────────

DELAY_MIN = int(os.getenv('COBRANCA_DELAY_MIN', '45'))
DELAY_MAX = int(os.getenv('COBRANCA_DELAY_MAX', '90'))
DAILY_LIMIT_DEFAULT = 50   # máximo de mensagens por dia por tenant
QUEUE_POLL_INTERVAL = 5    # segundos entre polls quando fila está vazia

# Janela de disparo: fora dela o worker não envia, só espera. Os envios dentro
# da janela são espaçados para cobrir o período inteiro (em vez de uma rajada
# de DELAY_MIN-DELAY_MAX segundos logo no início da janela todo santo dia).
JANELA_DISPARO_INICIO = int(os.getenv('COBRANCA_JANELA_INICIO', '8'))
JANELA_DISPARO_FIM = int(os.getenv('COBRANCA_JANELA_FIM', '19'))
DELAY_MAX_ESPACADO = int(os.getenv('COBRANCA_DELAY_MAX_ESPACADO', '900'))  # teto de 15min entre envios
HORARIOS_CACHE_TTL = 300  # 5 minutos

# ─── Helpers Redis ────────────────────────────────────────────────────────────

def _progress_key(tenant_id: str) -> str:
    return f'cobrancas_progress:{tenant_id}'

def _queue_key(tenant_id: str) -> str:
    return f'cobrancas_queue:{tenant_id}'

def _daily_key(tenant_id: str) -> str:
    return f'cobrancas_daily:{tenant_id}:{date.today().isoformat()}'


async def _get_daily_count(redis, tenant_id: str) -> int:
    try:
        val = await redis.get(_daily_key(tenant_id))
        return int(val or 0)
    except Exception:
        return 0


async def _increment_daily(redis, tenant_id: str) -> None:
    key = _daily_key(tenant_id)
    try:
        await redis.incr(key)
        await redis.expire(key, 86400)
    except Exception:
        pass


async def _set_progress(redis, tenant_id: str, **kwargs: Any) -> None:
    key = _progress_key(tenant_id)
    try:
        mapping = {k: str(v) for k, v in kwargs.items()}
        await redis.hset(key, mapping=mapping)
        await redis.expire(key, 3600)
    except Exception:
        pass


# ─── Janela de disparo / anti-burst ────────────────────────────────────────────

def _horarios_cache_key(tenant_id: str) -> str:
    return f'cobranca_horarios_cache:{tenant_id}'


async def _get_tenant_horarios_cached(redis, tenant_id: str) -> list:
    """Busca o config_nicho.horarios do tenant, cacheado em Redis por
    HORARIOS_CACHE_TTL para não bater no banco a cada poll do worker."""
    cache_key = _horarios_cache_key(tenant_id)
    try:
        cached = await redis.get(cache_key)
        if cached is not None:
            return json.loads(cached)
    except Exception:
        pass

    horarios: list = []
    if BOT_DATABASE_CONNECTION_URI:
        conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
        try:
            row = await conn.fetchrow('SELECT config_nicho FROM tenants WHERE id = $1', tenant_id)
            if row:
                cfg = row['config_nicho'] or {}
                if isinstance(cfg, str):
                    try:
                        cfg = json.loads(cfg)
                    except Exception:
                        cfg = {}
                candidato = cfg.get('horarios')
                if isinstance(candidato, list):
                    horarios = candidato
        except Exception as exc:
            logger.warning('[WORKER] erro ao buscar horarios do tenant=%s: %s', tenant_id, exc)
        finally:
            await conn.close()

    try:
        await redis.setex(cache_key, HORARIOS_CACHE_TTL, json.dumps(horarios))
    except Exception:
        pass

    return horarios


def _dentro_da_janela_disparo(agora: datetime) -> bool:
    """Janela global de disparo (além do horário comercial do tenant) —
    nunca dispara cobrança de madrugada, independente da config do tenant."""
    return JANELA_DISPARO_INICIO <= agora.hour < JANELA_DISPARO_FIM


def _calcular_delay_espalhado(
    agora: datetime,
    fila_restante: int,
    janela_fim_hora: int = JANELA_DISPARO_FIM,
    delay_min: int = DELAY_MIN,
    delay_max: int = DELAY_MAX,
    delay_max_espacado: int = DELAY_MAX_ESPACADO,
) -> float:
    """Calcula quanto esperar até o próximo envio, espalhando o que resta da
    fila pelo tempo restante da janela de disparo em vez de drenar tudo em
    rajada logo no início. Sempre respeita o piso de `delay_min`.
    """
    fim_janela = agora.replace(hour=janela_fim_hora, minute=0, second=0, microsecond=0)
    segundos_restantes = (fim_janela - agora).total_seconds()

    if fila_restante <= 0 or segundos_restantes <= delay_min:
        return random.uniform(delay_min, delay_max)

    delay_alvo = segundos_restantes / (fila_restante + 1)
    delay_alvo *= random.uniform(0.6, 1.4)  # jitter — evita um padrão temporal previsível
    return max(delay_min, min(delay_alvo, delay_max_espacado))


# ─── Banco de dados ───────────────────────────────────────────────────────────

async def _get_cobranca(tenant_id: str, cobranca_id: str) -> dict | None:
    if not BOT_DATABASE_CONNECTION_URI:
        return None
    conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
    try:
        # Nomes reais das tabelas/colunas seguem os @@map/@map do schema.prisma
        # (snake_case), exceto os poucos campos do Tenant sem @map (camelCase
        # com aspas). Os aliases abaixo mantêm as chaves camelCase usadas no
        # resto deste worker.
        row = await conn.fetchrow(
            '''
            SELECT
                ca.id,
                ca.aluno_id          AS "alunoId",
                ca.valor_cents       AS "valorCents",
                ca.data_vencimento   AS "dataVencimento",
                ca.descricao,
                ca.pix_chave         AS "pixChave",
                ca.enviada_whatsapp  AS "enviadaWhatsapp",
                ca.status,
                a.nome     AS aluno_nome,
                a.telefone AS aluno_telefone,
                a.optout_cobranca AS "alunoOptout",
                t."companyName"          AS negocio_nome,
                t."evolutionInstanceName" AS instance,
                t."evolutionApiKey"       AS api_key,
                t.config_nicho AS config_nicho
            FROM cobrancas_alunos ca
            JOIN alunos  a ON a.id = ca.aluno_id
            JOIN tenants t ON t.id = ca.tenant_id
            WHERE ca.id = $1 AND ca.tenant_id = $2
            ''',
            cobranca_id,
            tenant_id,
        )
        return dict(row) if row else None
    finally:
        await conn.close()


async def _marcar_enviada(tenant_id: str, cobranca_id: str) -> None:
    if not BOT_DATABASE_CONNECTION_URI:
        return
    conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
    try:
        await conn.execute(
            'UPDATE cobrancas_alunos SET enviada_whatsapp = TRUE WHERE id = $1 AND tenant_id = $2',
            cobranca_id,
            tenant_id,
        )
    finally:
        await conn.close()


# ─── Montagem da mensagem ─────────────────────────────────────────────────────

_TEMPLATE_KEY_PREFIX = 'cobranca_last_tpl'


def _fmt_valor(cents: int) -> str:
    valor = cents / 100
    return f'R$ {valor:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def _fmt_data(d) -> str:
    if hasattr(d, 'strftime'):
        return d.strftime('%d/%m/%Y')
    return str(d)[:10]


def _contexto_vencimento(data_vencimento) -> tuple[str, str]:
    """Retorna (status, descricao_humana) baseado em quantos dias faltam/passaram."""
    try:
        if hasattr(data_vencimento, 'date'):
            dv = data_vencimento.date()
        elif hasattr(data_vencimento, 'year'):
            dv = data_vencimento
        else:
            from datetime import date as _date
            dv = _date.fromisoformat(str(data_vencimento)[:10])
        delta = (dv - date.today()).days
    except Exception:
        return 'pendente', 'em aberto'

    if delta > 1:
        return 'futuro', f'vence em {delta} dias ({_fmt_data(data_vencimento)})'
    if delta == 1:
        return 'amanha', f'vence amanhã, dia {_fmt_data(data_vencimento)}'
    if delta == 0:
        return 'hoje', f'vence *hoje*, {_fmt_data(data_vencimento)}'
    if delta == -1:
        return 'vencido', f'venceu *ontem*, {_fmt_data(data_vencimento)}'
    return 'vencido', f'venceu há {abs(delta)} dias ({_fmt_data(data_vencimento)})'


# Cada template é uma função que recebe os dados já resolvidos e retorna a string final.
# Estruturas, tons e ordens de informação completamente diferentes entre si.

def _tpl_direto(nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave):
    linhas = [
        f'Oi, *{nome}*! Tudo bem?',
        '',
        f'Passando rapidinho aqui da *{negocio}* para avisar que identificamos uma mensalidade pendente no seu cadastro.',
        '',
        f'• Valor: *{valor}*',
        f'• Vencimento: *{venc_data}*',
    ]
    if descricao:
        linhas.append(f'• Referência: {descricao}')
    if pix_chave:
        linhas += ['', f'Para facilitar, nossa chave Pix é:', f'`{pix_chave}`']
    linhas += ['', 'Qualquer dúvida é só falar aqui! 😊']
    return '\n'.join(linhas)


def _tpl_amigavel(nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave):
    abertura = {
        'hoje': f'⚠️ *{nome}*, sua mensalidade vence *hoje*!',
        'amanha': f'👋 *{nome}*, sua mensalidade vence amanhã!',
        'vencido': f'👋 Olá, *{nome}*! Sua mensalidade está em atraso.',
        'futuro': f'👋 Olá, *{nome}*! Tudo bem?',
    }.get(venc_ctx, f'👋 Olá, *{nome}*!')

    linhas = [abertura, '', f'🏋️ *{negocio}*', '']

    if venc_ctx == 'vencido':
        linhas.append(f'Identificamos que sua mensalidade de *{valor}* ainda está em aberto.')
        linhas.append(f'Data de vencimento: {venc_data}')
    elif venc_ctx in ('hoje', 'amanha'):
        linhas.append(f'Valor: *{valor}*')
        linhas.append(f'Vencimento: {venc_data}')
    else:
        linhas.append(f'Sua próxima mensalidade no valor de *{valor}* {venc_ctx}.')

    if descricao:
        linhas += ['', f'📋 {descricao}']
    if pix_chave:
        linhas += ['', f'🔑 Chave Pix: `{pix_chave}`']
    linhas += ['', 'Estamos à disposição! 💪']
    return '\n'.join(linhas)


def _tpl_conciso(nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave):
    linha_status = {
        'hoje': 'vence hoje',
        'amanha': 'vence amanhã',
        'vencido': 'em atraso',
        'futuro': f'vence em {venc_data}',
    }.get(venc_ctx, f'vence em {venc_data}')

    linhas = [
        f'*{negocio}* — aviso de mensalidade',
        '',
        f'Olá, {nome}!',
        f'Mensalidade de *{valor}* — {linha_status}.',
    ]
    if pix_chave:
        linhas += ['', f'Pix: `{pix_chave}`']
    if descricao:
        linhas.append(f'Ref: {descricao}')
    linhas += ['', 'Dúvidas? Responda aqui. 😊']
    return '\n'.join(linhas)


def _tpl_pix_destaque(nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave):
    linhas = [f'Olá, {nome}! 👋', '', f'A *{negocio}* informa:']

    if venc_ctx == 'vencido':
        linhas.append(f'Sua mensalidade de *{valor}* está pendente desde {venc_data}.')
    else:
        linhas.append(f'Sua mensalidade de *{valor}* {venc_ctx}.')

    if descricao:
        linhas.append(f'({descricao})')

    if pix_chave:
        linhas += [
            '',
            '💳 *Pagamento via Pix:*',
            f'Chave: `{pix_chave}`',
            '',
            'É só copiar a chave e fazer a transferência no seu banco. ✅',
        ]
    else:
        linhas += ['', 'Entre em contato para mais informações sobre o pagamento.']

    linhas += ['', 'Qualquer dúvida, estamos aqui! 🏋️']
    return '\n'.join(linhas)


def _tpl_formal(nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave):
    linhas = [
        f'Prezado(a) *{nome}*,',
        '',
        f'Entramos em contato em nome da *{negocio}* para informar sobre uma pendência financeira em seu cadastro.',
        '',
        f'*Valor em aberto:* {valor}',
        f'*Vencimento:* {venc_data}',
    ]
    if descricao:
        linhas.append(f'*Descrição:* {descricao}')
    if pix_chave:
        linhas += ['', f'Para regularização, utilize nossa chave Pix: `{pix_chave}`']
    linhas += [
        '',
        'Caso o pagamento já tenha sido efetuado, desconsidere esta mensagem.',
        '',
        'Agradecemos a atenção. 🙏',
    ]
    return '\n'.join(linhas)


def _tpl_motivacional(nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave):
    linhas = [
        f'💪 Oi, *{nome}*!',
        '',
        f'Aqui é a equipe da *{negocio}*.',
        'Você é parte importante da nossa família e queremos continuar te apoiando nos seus treinos!',
        '',
        f'Sua mensalidade de *{valor}* está pendente.',
    ]
    if venc_ctx != 'futuro':
        linhas.append(f'Data: {venc_data}')
    if pix_chave:
        linhas += ['', f'🔑 Nossa chave Pix: `{pix_chave}`']
    if descricao:
        linhas.append(f'Ref: {descricao}')
    linhas += ['', 'Regularize e continue treinando! 🏃‍♂️', 'Qualquer dúvida, é só chamar.']
    return '\n'.join(linhas)


_TEMPLATES = [
    _tpl_direto,
    _tpl_amigavel,
    _tpl_conciso,
    _tpl_pix_destaque,
    _tpl_formal,
    _tpl_motivacional,
]

_N_TEMPLATES = len(_TEMPLATES)


def _montar_mensagem(c: dict, ultimo_template: int | None = None) -> tuple[str, int]:
    """
    Monta a mensagem de cobrança com variação estrutural real.
    Retorna (texto, indice_template_usado) para persistência.
    Garante que o template escolhido seja diferente do último enviado ao mesmo aluno.
    """
    valor = _fmt_valor(c['valorCents'])
    venc_ctx, venc_human = _contexto_vencimento(c['dataVencimento'])
    venc_data = _fmt_data(c['dataVencimento'])
    negocio = c.get('negocio_nome') or 'Academia'
    nome = c.get('aluno_nome') or 'aluno(a)'

    config_nicho = c.get('_config_nicho_parsed') or c.get('config_nicho') or {}
    if isinstance(config_nicho, str):
        try:
            config_nicho = json.loads(config_nicho)
        except Exception:
            config_nicho = {}

    pix_chave = c.get('pixChave') or config_nicho.get('pixChave') or config_nicho.get('pix_chave')
    descricao = c.get('descricao') or ''

    # Escolhe template diferente do último (garante variação entre disparos)
    candidatos = list(range(_N_TEMPLATES))
    if ultimo_template is not None and _N_TEMPLATES > 1:
        candidatos = [i for i in candidatos if i != ultimo_template]
    idx = random.choice(candidatos)

    texto = _TEMPLATES[idx](nome, negocio, valor, venc_ctx, venc_data, descricao, pix_chave)
    return texto, idx


# ─── Envio via Evolution API ──────────────────────────────────────────────────

async def _enviar_whatsapp(instance: str, api_key: str | None, telefone: str, texto: str) -> None:
    import aiohttp
    url = f'{EVOLUTION_API_URL}/message/sendText/{instance}'
    headers = {
        'apikey': api_key or EVOLUTION_AUTHENTICATION_API_KEY or '',
        'Content-Type': 'application/json',
    }
    payload = {'number': telefone, 'text': texto}
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
            resp.raise_for_status()


# ─── Worker principal ──────────────────────────────────────────────────────────

async def _processar_uma(redis, tenant_id: str, cobranca_id: str, daily_limit: int) -> bool:
    """Processa uma cobrança. Retorna True se enviou, False se pulou/falhou."""
    cobranca = await _get_cobranca(tenant_id, cobranca_id)
    if not cobranca:
        logger.warning('[WORKER] cobrança não encontrada: %s', cobranca_id)
        return False

    # Limite diário: usa o do config_nicho do tenant se disponível
    config_nicho = cobranca.get('config_nicho') or {}
    if isinstance(config_nicho, str):
        try:
            config_nicho = json.loads(config_nicho)
        except Exception:
            config_nicho = {}
    tenant_limit = int(config_nicho.get('limite_diario_cobrancas', daily_limit))

    daily = await _get_daily_count(redis, tenant_id)
    if daily >= tenant_limit:
        logger.warning('[WORKER] limite diário atingido para tenant=%s (%d/%d)', tenant_id, daily, tenant_limit)
        return False

    cobranca['_config_nicho_parsed'] = config_nicho

    if cobranca.get('enviadaWhatsapp') or cobranca.get('status') in (
        'PAGO', 'CANCELADA', 'AGUARDANDO_VALIDACAO',
    ):
        logger.info('[WORKER] cobrança já enviada, paga ou com comprovante pendente, pulando: %s', cobranca_id)
        return False

    if cobranca.get('alunoOptout'):
        logger.info('[WORKER] aluno em opt-out de cobranças, pulando: %s', cobranca_id)
        return False

    instance = cobranca.get('instance')
    if not instance:
        logger.warning('[WORKER] tenant sem Evolution configurado: %s', tenant_id)
        return False

    aluno_id = str(cobranca.get('alunoId') or '')
    tpl_redis_key = f'{_TEMPLATE_KEY_PREFIX}:{tenant_id}:{aluno_id}'
    ultimo_template: int | None = None
    try:
        val = await redis.get(tpl_redis_key)
        if val is not None:
            ultimo_template = int(val)
    except Exception:
        pass

    mensagem, tpl_idx = _montar_mensagem(cobranca, ultimo_template)

    telefone_raw = re.sub(r'\D', '', cobranca['aluno_telefone'] or '')
    if telefone_raw and not telefone_raw.startswith('55'):
        telefone_raw = '55' + telefone_raw
    telefone = telefone_raw

    try:
        await _enviar_whatsapp(instance, cobranca.get('api_key'), telefone, mensagem)
        await _marcar_enviada(tenant_id, cobranca_id)
        await _increment_daily(redis, tenant_id)
        # Persiste qual template foi usado para este aluno (TTL 60 dias)
        try:
            await redis.set(tpl_redis_key, str(tpl_idx), ex=60 * 86400)
        except Exception:
            pass
        logger.info('[WORKER] enviada cobrança=%s para %s (template=%d)', cobranca_id, telefone, tpl_idx)
        return True
    except Exception as exc:
        logger.error('[WORKER] erro ao enviar cobrança=%s: %s', cobranca_id, exc)
        return False


async def run_cobranca_worker(redis, daily_limit: int = DAILY_LIMIT_DEFAULT) -> None:
    """
    Loop principal do worker. Roda em background enquanto o FastAPI está up.
    Escaneia todas as filas ativas (uma por tenant).
    """
    logger.info('[WORKER] cobrança worker iniciado')

    while True:
        try:
            agora = datetime.now()

            # Janela global de disparo — nunca manda cobrança de madrugada,
            # independente do horário comercial configurado por tenant.
            if not _dentro_da_janela_disparo(agora):
                await asyncio.sleep(QUEUE_POLL_INTERVAL * 12)  # ~1min, não precisa pollar rápido fora da janela
                continue

            # Busca todas as filas ativas (padrão cobrancas_queue:*)
            keys = await redis.keys('cobrancas_queue:*')

            if not keys:
                await asyncio.sleep(QUEUE_POLL_INTERVAL)
                continue

            algum_enviado = False

            for key in keys:
                key_str = key if isinstance(key, str) else key.decode()
                tenant_id = key_str.replace('cobrancas_queue:', '')

                # Respeita o horário comercial configurado pelo tenant — se
                # estiver fora, nem mexe na fila desse tenant neste ciclo.
                horarios_tenant = await _get_tenant_horarios_cached(redis, tenant_id)
                if not is_within_hours(horarios_tenant):
                    continue

                # Pega próxima da fila (RPOP = do final, ou seja, FIFO com LPUSH)
                cobranca_id = await redis.rpop(key_str)
                if not cobranca_id:
                    continue

                if isinstance(cobranca_id, bytes):
                    cobranca_id = cobranca_id.decode()

                # Atualiza progresso: processando
                progress_raw = await redis.hgetall(_progress_key(tenant_id))
                total = int(progress_raw.get('total', 0) or 0)
                sent = int(progress_raw.get('sent', 0) or 0)
                failed = int(progress_raw.get('failed', 0) or 0)

                await _set_progress(redis, tenant_id, status='enviando', current=cobranca_id)

                ok = await _processar_uma(redis, tenant_id, cobranca_id, daily_limit)
                algum_enviado = True

                if ok:
                    sent += 1
                else:
                    failed += 1

                # Verifica se fila esvaziou
                fila_restante = await redis.llen(key_str)
                status_final = 'concluido' if fila_restante == 0 else 'enviando'

                await _set_progress(
                    redis, tenant_id,
                    total=total,
                    sent=sent,
                    failed=failed,
                    status=status_final,
                    updated_at=datetime.now().isoformat(timespec='seconds'),
                )

                if ok:
                    # Espalha os envios pelo resto da janela de disparo em vez
                    # de drenar a fila em rajada — reduz o padrão temporal fixo.
                    delay = _calcular_delay_espalhado(datetime.now(), fila_restante)
                    logger.info('[WORKER] aguardando %.0fs antes da próxima mensagem (fila_restante=%d)', delay, fila_restante)
                    await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(2)

            if not algum_enviado:
                await asyncio.sleep(QUEUE_POLL_INTERVAL)

        except asyncio.CancelledError:
            logger.info('[WORKER] worker cancelado, encerrando.')
            break
        except Exception as exc:
            logger.error('[WORKER] erro inesperado no loop: %s', exc, exc_info=True)
            await asyncio.sleep(10)

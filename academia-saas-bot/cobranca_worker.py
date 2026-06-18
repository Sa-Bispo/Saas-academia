"""
cobranca_worker.py — Worker de disparo em lote de cobranças via WhatsApp.

Fluxo:
  1. Consome fila Redis `cobrancas_queue:{tenant_id}` (RPOP)
  2. Para cada cobrança: busca dados no banco, monta mensagem, envia via Evolution
  3. Aguarda delay aleatório (45-90s) antes da próxima
  4. Atualiza hash de progresso `cobrancas_progress:{tenant_id}`
  5. Respeita limite diário `cobrancas_daily:{tenant_id}:{data}` (TTL 24h)

Estrutura Redis:
  cobrancas_queue:{tenant_id}     → List  [cobranca_id, ...]
  cobrancas_progress:{tenant_id}  → Hash  {total, sent, failed, status, started_at}
  cobrancas_daily:{tenant_id}:{YYYY-MM-DD} → String contador (TTL 86400s)
"""
from __future__ import annotations

import asyncio
import json
import logging
import random
from datetime import date, datetime
from typing import Any

import asyncpg

from config import BOT_DATABASE_CONNECTION_URI, EVOLUTION_API_URL, EVOLUTION_AUTHENTICATION_API_KEY

logger = logging.getLogger(__name__)

# ─── Configuração ─────────────────────────────────────────────────────────────

DELAY_MIN = 45       # segundos mínimos entre mensagens
DELAY_MAX = 90       # segundos máximos entre mensagens
DAILY_LIMIT_DEFAULT = 50   # máximo de mensagens por dia por tenant
QUEUE_POLL_INTERVAL = 5    # segundos entre polls quando fila está vazia

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

_SAUDACOES = ['Olá', 'Oi', 'Olá']
_FECHAMENTOS = [
    'Qualquer dúvida, é só chamar! 😊',
    'Estamos à disposição! 💪',
    'Fique à vontade para entrar em contato. 😊',
]


def _montar_mensagem(c: dict) -> str:
    saudacao = random.choice(_SAUDACOES)
    fechamento = random.choice(_FECHAMENTOS)

    valor = (c['valorCents'] / 100)
    valor_fmt = f'R$ {valor:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    venc_fmt = c['dataVencimento'].strftime('%d/%m/%Y') if hasattr(c['dataVencimento'], 'strftime') else str(c['dataVencimento'])[:10]
    negocio = c.get('negocio_nome') or 'Academia'

    config_nicho = c.get('config_nicho') or {}
    if isinstance(config_nicho, str):
        try:
            config_nicho = json.loads(config_nicho)
        except Exception:
            config_nicho = {}

    pix_chave = c.get('pixChave') or config_nicho.get('pixChave') or config_nicho.get('pix_chave')

    linhas = [
        f'{saudacao}, {c["aluno_nome"]}! 👋',
        '',
        f'🏋️ *{negocio}*',
        '',
        'Identificamos uma mensalidade em aberto:',
        f'💰 *Valor:* {valor_fmt}',
        f'📅 *Vencimento:* {venc_fmt}',
    ]

    if c.get('descricao'):
        linhas.append(f'📋 *Ref:* {c["descricao"]}')

    if pix_chave:
        linhas += ['', f'🔑 *Chave Pix:* `{pix_chave}`']

    linhas += ['', fechamento]
    return '\n'.join(linhas)


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
    daily = await _get_daily_count(redis, tenant_id)
    if daily >= daily_limit:
        logger.warning('[WORKER] limite diário atingido para tenant=%s (%d/%d)', tenant_id, daily, daily_limit)
        return False

    cobranca = await _get_cobranca(tenant_id, cobranca_id)
    if not cobranca:
        logger.warning('[WORKER] cobrança não encontrada: %s', cobranca_id)
        return False

    if cobranca.get('enviadaWhatsapp') or cobranca.get('status') in (
        'PAGO', 'CANCELADA', 'AGUARDANDO_VALIDACAO',
    ):
        logger.info('[WORKER] cobrança já enviada, paga ou com comprovante pendente, pulando: %s', cobranca_id)
        return False

    instance = cobranca.get('instance')
    if not instance:
        logger.warning('[WORKER] tenant sem Evolution configurado: %s', tenant_id)
        return False

    mensagem = _montar_mensagem(cobranca)
    telefone = cobranca['aluno_telefone']

    try:
        await _enviar_whatsapp(instance, cobranca.get('api_key'), telefone, mensagem)
        await _marcar_enviada(tenant_id, cobranca_id)
        await _increment_daily(redis, tenant_id)
        logger.info('[WORKER] enviada cobrança=%s para %s', cobranca_id, telefone)
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
            # Busca todas as filas ativas (padrão cobrancas_queue:*)
            keys = await redis.keys('cobrancas_queue:*')

            if not keys:
                await asyncio.sleep(QUEUE_POLL_INTERVAL)
                continue

            for key in keys:
                key_str = key if isinstance(key, str) else key.decode()
                tenant_id = key_str.replace('cobrancas_queue:', '')

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
                    # Delay aleatório entre mensagens — comportamento humano
                    delay = random.uniform(DELAY_MIN, DELAY_MAX)
                    logger.info('[WORKER] aguardando %.0fs antes da próxima mensagem', delay)
                    await asyncio.sleep(delay)
                else:
                    await asyncio.sleep(2)

        except asyncio.CancelledError:
            logger.info('[WORKER] worker cancelado, encerrando.')
            break
        except Exception as exc:
            logger.error('[WORKER] erro inesperado no loop: %s', exc, exc_info=True)
            await asyncio.sleep(10)

"""
cobranca_scheduler.py — Scheduler diário de cobranças.

Roda uma vez por dia no horário configurável (SCHEDULER_HORA_DISPARO, padrão: 8h).
Para cada tenant ativo com WhatsApp configurado:
  1. Gera registros de cobrança para matrículas que vencem nos próximos X dias
     (equivalente ao gerarCobrancasVencimento() do dashboard Next.js)
  2. Enfileira no Redis as cobranças PENDENTE/VENCIDO ainda não enviadas
     (cobrancas_queue:{tenant_id}) para o cobranca_worker processar

Variáveis de ambiente:
  SCHEDULER_HORA_DISPARO  — hora do dia (0–23) para rodar (padrão: 8)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import date, datetime, timedelta

import asyncpg

from config import BOT_DATABASE_CONNECTION_URI

logger = logging.getLogger(__name__)

SCHEDULER_HORA_DISPARO = int(os.getenv('SCHEDULER_HORA_DISPARO', '8'))
SCHEDULER_POLL_INTERVAL = 60  # verifica a hora a cada 60s


# ─── Banco de dados ───────────────────────────────────────────────────────────

async def _get_tenants_ativos(conn) -> list[dict]:
    """Retorna tenants com instância Evolution configurada."""
    rows = await conn.fetch(
        '''
        SELECT
            id,
            "evolutionInstanceName" AS instance,
            config_nicho
        FROM tenants
        WHERE "evolutionInstanceName" IS NOT NULL
          AND "evolutionInstanceName" != ''
        '''
    )
    return [dict(r) for r in rows]


async def _gerar_cobrancas_vencimento(conn, tenant_id: str, dias_antecedencia: int) -> int:
    """
    Cria cobranças para matrículas ATIVA que vencem nos próximos X dias
    e ainda não têm cobrança PENDENTE ou PAGO vinculada.
    Retorna o número de cobranças geradas.
    """
    hoje = date.today()
    limite = hoje + timedelta(days=dias_antecedencia)

    matriculas = await conn.fetch(
        '''
        SELECT
            m.id          AS matricula_id,
            m.aluno_id,
            m.data_vencimento,
            p.nome        AS plano_nome,
            p.valor_cents AS plano_valor_cents
        FROM matriculas_alunos m
        JOIN planos_academia p ON p.id = m.plano_id
        WHERE m.tenant_id = $1
          AND m.status = 'ATIVA'
          AND m.data_vencimento BETWEEN $2 AND $3
          AND NOT EXISTS (
              SELECT 1 FROM cobrancas_alunos c
              WHERE c.matricula_id = m.id
                AND c.tenant_id   = $1
                AND c.status IN ('PENDENTE', 'PAGO')
          )
        ''',
        tenant_id,
        hoje,
        limite,
    )

    count = 0
    for m in matriculas:
        try:
            await conn.execute(
                '''
                INSERT INTO cobrancas_alunos
                    (id, tenant_id, aluno_id, matricula_id, valor_cents,
                     data_vencimento, descricao, status, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDENTE', NOW())
                ''',
                str(uuid.uuid4()),
                tenant_id,
                str(m['aluno_id']),
                str(m['matricula_id']),
                int(m['plano_valor_cents']),
                m['data_vencimento'],
                f'Renovação: {m["plano_nome"]}',
            )
            count += 1
        except Exception as exc:
            logger.warning(
                '[SCHEDULER] erro ao gerar cobrança para matrícula=%s: %s',
                m['matricula_id'], exc,
            )

    return count


async def _enfileirar_cobrancas(redis, conn, tenant_id: str, dias_antecedencia: int) -> int:
    """
    Enfileira no Redis as cobranças PENDENTE/VENCIDO ainda não enviadas
    que vencem dentro do prazo de antecedência (ou já vencidas).
    Evita duplicatas verificando o que já está na fila.
    Retorna o número de IDs enfileirados.
    """
    limite = date.today() + timedelta(days=dias_antecedencia)

    rows = await conn.fetch(
        '''
        SELECT id
        FROM cobrancas_alunos
        WHERE tenant_id         = $1
          AND status            IN ('PENDENTE', 'VENCIDO')
          AND enviada_whatsapp  = FALSE
          AND data_vencimento  <= $2
        ORDER BY data_vencimento ASC
        ''',
        tenant_id,
        limite,
    )

    if not rows:
        return 0

    ids = [str(r['id']) for r in rows]
    queue_key = f'cobrancas_queue:{tenant_id}'

    # Evita reenviar o que já está aguardando na fila
    fila_atual = set(await redis.lrange(queue_key, 0, -1))
    novos = [id_ for id_ in ids if id_ not in fila_atual]

    if not novos:
        return 0

    await redis.lpush(queue_key, *novos)

    # Inicializa / atualiza o hash de progresso
    progress_key = f'cobrancas_progress:{tenant_id}'
    total_anterior = int(await redis.hget(progress_key, 'total') or 0)
    await redis.hset(progress_key, mapping={
        'total': str(total_anterior + len(novos)),
        'sent': '0',
        'failed': '0',
        'status': 'aguardando',
        'started_at': datetime.now().isoformat(timespec='seconds'),
    })
    await redis.expire(progress_key, 3600)

    return len(novos)


# ─── Ciclo por tenant ─────────────────────────────────────────────────────────

async def _processar_tenant(redis, conn, tenant_id: str, config_nicho: dict) -> None:
    # Lê prazo de antecedência do config_nicho (gravado pela página de Configurações)
    dias = int(
        config_nicho.get('dias_antecedencia_cobranca')
        or config_nicho.get('diasAntecedenciaCobranca')
        or 5
    )

    geradas = await _gerar_cobrancas_vencimento(conn, tenant_id, dias)
    if geradas:
        logger.info('[SCHEDULER] tenant=%s — %d cobrança(s) gerada(s)', tenant_id, geradas)

    enfileiradas = await _enfileirar_cobrancas(redis, conn, tenant_id, dias)
    logger.info('[SCHEDULER] tenant=%s — %d cobrança(s) enfileirada(s)', tenant_id, enfileiradas)


# ─── Loop principal ───────────────────────────────────────────────────────────

async def run_cobranca_scheduler(redis) -> None:
    """
    Loop principal do scheduler. Acorda a cada SCHEDULER_POLL_INTERVAL segundos,
    dispara o processamento completo uma vez por dia na hora configurada e volta
    a dormir. Safe para rodar em paralelo com run_cobranca_worker.
    """
    logger.info('[SCHEDULER] iniciado (disparo diário às %dh)', SCHEDULER_HORA_DISPARO)
    ultimo_disparo: date | None = None

    while True:
        try:
            agora = datetime.now()
            hoje = agora.date()

            if agora.hour >= SCHEDULER_HORA_DISPARO and ultimo_disparo != hoje:
                logger.info('[SCHEDULER] iniciando ciclo diário %s', hoje.isoformat())
                ultimo_disparo = hoje

                if not BOT_DATABASE_CONNECTION_URI:
                    logger.warning('[SCHEDULER] BOT_DATABASE_CONNECTION_URI não configurada, pulando')
                else:
                    conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
                    try:
                        tenants = await _get_tenants_ativos(conn)
                        logger.info('[SCHEDULER] %d tenant(s) ativo(s)', len(tenants))
                        for t in tenants:
                            raw_cfg = t.get('config_nicho') or {}
                            if isinstance(raw_cfg, str):
                                try:
                                    raw_cfg = json.loads(raw_cfg)
                                except Exception:
                                    raw_cfg = {}
                            try:
                                await _processar_tenant(redis, conn, t['id'], raw_cfg)
                            except Exception as exc:
                                logger.error(
                                    '[SCHEDULER] erro no tenant=%s: %s',
                                    t['id'], exc, exc_info=True,
                                )
                    finally:
                        await conn.close()

        except asyncio.CancelledError:
            logger.info('[SCHEDULER] encerrado')
            break
        except Exception as exc:
            logger.error('[SCHEDULER] erro inesperado: %s', exc, exc_info=True)

        await asyncio.sleep(SCHEDULER_POLL_INTERVAL)

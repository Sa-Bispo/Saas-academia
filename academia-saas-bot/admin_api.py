"""
admin_api.py — Endpoints de administração do SaaS (painel do dono).

Rotas HTTP (prefix /api/admin):
  GET    /confusion-events          lista eventos por status
  GET    /confusion-events/count    contagem de pendentes (badge)
  PATCH  /confusion-events/{id}     resolver / ignorar / adicionar padrão

  GET    /learned-patterns          lista padrões por nicho
  POST   /learned-patterns          adiciona padrão manualmente
  DELETE /learned-patterns/{id}     desativa padrão

WebSocket:
  WS     /api/admin/ws/notifications   stream Redis pub/sub → cliente
"""
from __future__ import annotations

import json
import logging
from datetime import datetime

import asyncpg
from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from config import BOT_DATABASE_CONNECTION_URI, REDIS_URL
from confusion_tracker import invalidate_patterns_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/admin', tags=['admin'])

_REDIS_URI = REDIS_URL or 'redis://redis:6379/6'

# asyncpg não aceita parâmetros Prisma como ?schema=public
def _clean_db_uri(uri: str | None) -> str | None:
    if not uri:
        return uri
    return uri.split('?')[0]

_DB_URI = _clean_db_uri(BOT_DATABASE_CONNECTION_URI)
_ADMIN_NOTIF_CHANNEL = 'admin:notifications'


async def _get_redis():
    import redis.asyncio as aioredis
    return aioredis.from_url(_REDIS_URI, decode_responses=True)


def _row_to_event(r) -> dict:
    return {
        'id': str(r['id']),
        'tenantId': str(r['tenant_id']) if r['tenant_id'] else None,
        'tenantNome': r.get('tenant_nome') or '',
        'nicho': r['nicho'],
        'phone': r['phone'] or '',
        'messages': json.loads(r['messages_json']) if r['messages_json'] else [],
        'textoProblema': r['texto_problema'],
        'status': r['status'],
        'createdAt': r['created_at'].isoformat() if r['created_at'] else None,
        'resolvedAt': r['resolved_at'].isoformat() if r['resolved_at'] else None,
    }


# ─── Eventos de confusão ──────────────────────────────────────────────────────

@router.get('/confusion-events')
async def list_confusion_events(status: str = 'pendente', limit: int = 50):
    if not _DB_URI:
        return JSONResponse({'error': 'DB não configurado'}, status_code=500)
    conn = await asyncpg.connect(_DB_URI)
    try:
        rows = await conn.fetch(
            '''
            SELECT e.id, e.tenant_id, e.nicho, e.phone,
                   e.messages_json, e.texto_problema, e.status,
                   e.created_at, e.resolved_at,
                   NULL::text AS tenant_nome
            FROM bot_confusion_events e
            WHERE e.status = $1
            ORDER BY e.created_at DESC
            LIMIT $2
            ''',
            status, limit,
        )
        return JSONResponse({'events': [_row_to_event(r) for r in rows], 'total': len(rows)})
    finally:
        await conn.close()


@router.get('/confusion-events/count')
async def count_pending_events():
    if not _DB_URI:
        return JSONResponse({'count': 0})
    conn = await asyncpg.connect(_DB_URI)
    try:
        row = await conn.fetchrow(
            "SELECT COUNT(*) AS cnt FROM bot_confusion_events WHERE status = 'pendente'"
        )
        return JSONResponse({'count': int(row['cnt'])})
    finally:
        await conn.close()


@router.patch('/confusion-events/{event_id}')
async def update_confusion_event(event_id: str, request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido'}, status_code=400)

    # action: 'resolver' | 'ignorar' | 'adicionar_pattern'
    action = (body.get('action') or '').strip()
    frase = (body.get('frase') or '').strip()
    intent_alvo = (body.get('intentAlvo') or '').strip()

    if not action:
        return JSONResponse({'error': 'action é obrigatório'}, status_code=422)
    if not _DB_URI:
        return JSONResponse({'error': 'DB não configurado'}, status_code=500)

    conn = await asyncpg.connect(_DB_URI)
    try:
        event = await conn.fetchrow(
            'SELECT id, nicho, texto_problema FROM bot_confusion_events WHERE id = $1',
            event_id,
        )
        if not event:
            return JSONResponse({'error': 'Evento não encontrado'}, status_code=404)

        nicho = event['nicho']
        now = datetime.now()

        if action == 'ignorar':
            await conn.execute(
                "UPDATE bot_confusion_events SET status='ignorado', resolved_at=$1 WHERE id=$2",
                now, event_id,
            )

        elif action in ('resolver', 'adicionar_pattern'):
            # Se vieram frase + intent → grava padrão aprendido
            if frase and intent_alvo:
                await conn.execute(
                    '''
                    INSERT INTO bot_learned_patterns
                        (nicho, frase, intent_alvo, evento_id, ativo, created_at)
                    VALUES ($1, $2, $3, $4, TRUE, NOW())
                    ''',
                    nicho, frase, intent_alvo, event_id,
                )
                redis = await _get_redis()
                try:
                    await invalidate_patterns_cache(redis, nicho)
                finally:
                    await redis.aclose()

            await conn.execute(
                "UPDATE bot_confusion_events SET status='resolvido', resolved_at=$1 WHERE id=$2",
                now, event_id,
            )

        return JSONResponse({'status': 'ok'})
    finally:
        await conn.close()


# ─── Padrões aprendidos ───────────────────────────────────────────────────────

@router.get('/learned-patterns')
async def list_learned_patterns(nicho: str = 'academia'):
    if not _DB_URI:
        return JSONResponse({'patterns': []})
    conn = await asyncpg.connect(_DB_URI)
    try:
        rows = await conn.fetch(
            '''
            SELECT id, nicho, frase, intent_alvo, ativo, created_at
            FROM bot_learned_patterns
            WHERE nicho = $1
            ORDER BY created_at DESC
            ''',
            nicho,
        )
        patterns = [
            {
                'id': str(r['id']),
                'nicho': r['nicho'],
                'frase': r['frase'],
                'intentAlvo': r['intent_alvo'],
                'ativo': r['ativo'],
                'createdAt': r['created_at'].isoformat(),
            }
            for r in rows
        ]
        return JSONResponse({'patterns': patterns})
    finally:
        await conn.close()


@router.post('/learned-patterns')
async def create_learned_pattern(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido'}, status_code=400)

    nicho = (body.get('nicho') or '').strip()
    frase = (body.get('frase') or '').strip()
    intent_alvo = (body.get('intentAlvo') or '').strip()

    if not all([nicho, frase, intent_alvo]):
        return JSONResponse({'error': 'nicho, frase e intentAlvo são obrigatórios'}, status_code=422)
    if not _DB_URI:
        return JSONResponse({'error': 'DB não configurado'}, status_code=500)

    conn = await asyncpg.connect(_DB_URI)
    try:
        row = await conn.fetchrow(
            '''
            INSERT INTO bot_learned_patterns (nicho, frase, intent_alvo, ativo, created_at)
            VALUES ($1, $2, $3, TRUE, NOW())
            RETURNING id
            ''',
            nicho, frase, intent_alvo,
        )
        redis = await _get_redis()
        try:
            await invalidate_patterns_cache(redis, nicho)
        finally:
            await redis.aclose()
        return JSONResponse({'id': str(row['id']), 'status': 'ok'})
    finally:
        await conn.close()


@router.delete('/learned-patterns/{pattern_id}')
async def deactivate_learned_pattern(pattern_id: str):
    if not _DB_URI:
        return JSONResponse({'error': 'DB não configurado'}, status_code=500)
    conn = await asyncpg.connect(_DB_URI)
    try:
        row = await conn.fetchrow(
            "UPDATE bot_learned_patterns SET ativo=FALSE WHERE id=$1 RETURNING nicho",
            pattern_id,
        )
        if not row:
            return JSONResponse({'error': 'Padrão não encontrado'}, status_code=404)
        redis = await _get_redis()
        try:
            await invalidate_patterns_cache(redis, row['nicho'])
        finally:
            await redis.aclose()
        return JSONResponse({'status': 'ok'})
    finally:
        await conn.close()


# ─── WebSocket de notificações ────────────────────────────────────────────────

@router.websocket('/ws/notifications')
async def ws_admin_notifications(websocket: WebSocket):
    await websocket.accept()
    import redis.asyncio as aioredis
    r = aioredis.from_url(_REDIS_URI, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(_ADMIN_NOTIF_CHANNEL)
    logger.info('[WS-ADMIN] cliente conectado')
    try:
        async for message in pubsub.listen():
            if message.get('type') == 'message':
                await websocket.send_text(message['data'])
    except WebSocketDisconnect:
        logger.info('[WS-ADMIN] cliente desconectado')
    except Exception as exc:
        logger.warning('[WS-ADMIN] erro: %s', exc)
    finally:
        await pubsub.unsubscribe(_ADMIN_NOTIF_CHANNEL)
        await r.aclose()

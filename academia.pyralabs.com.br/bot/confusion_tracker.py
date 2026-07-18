"""
confusion_tracker.py — Captura eventos de confusão do bot e gerencia padrões aprendidos.

Responsabilidades:
  - Persistir evento de confusão no banco (bot_confusion_events)
  - Publicar notificação no canal Redis para o painel admin em tempo real
  - Carregar padrões aprendidos do admin (bot_learned_patterns) via cache Redis
  - Invalidar cache quando admin adiciona nova correção
"""
from __future__ import annotations

import json
import logging
from datetime import datetime

import asyncpg

from config import BOT_DATABASE_CONNECTION_URI

logger = logging.getLogger(__name__)

_PATTERNS_CACHE_KEY = 'bot:learned_patterns:{nicho}'
_PATTERNS_CACHE_TTL = 300          # 5 minutos
_ADMIN_NOTIF_CHANNEL = 'admin:notifications'


# ─── Eventos de confusão ──────────────────────────────────────────────────────

async def save_confusion_event(
    tenant_id: str | None,
    nicho: str,
    phone: str,
    messages: list[dict],
    texto_problema: str,
) -> str | None:
    """Persiste um evento de confusão e retorna o UUID gerado."""
    if not BOT_DATABASE_CONNECTION_URI:
        return None
    try:
        conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
        try:
            row = await conn.fetchrow(
                '''
                INSERT INTO bot_confusion_events
                    (tenant_id, nicho, phone, messages_json, texto_problema, status, created_at)
                VALUES ($1, $2, $3, $4::jsonb, $5, 'pendente', NOW())
                RETURNING id
                ''',
                tenant_id or None,
                nicho,
                phone,
                json.dumps(messages, ensure_ascii=False),
                texto_problema,
            )
            return str(row['id']) if row else None
        finally:
            await conn.close()
    except Exception as exc:
        logger.error('[CONFUSION] erro ao salvar evento: %s', exc)
        return None


async def publish_confusion_notification(redis, event_id: str, nicho: str, tenant_id: str | None) -> None:
    """Publica notificação de novo evento no canal Redis para o WebSocket do admin."""
    try:
        payload = json.dumps({
            'type': 'confusion_event',
            'event_id': event_id,
            'nicho': nicho,
            'tenant_id': tenant_id or '',
            'ts': datetime.now().isoformat(),
        }, ensure_ascii=False)
        await redis.publish(_ADMIN_NOTIF_CHANNEL, payload)
    except Exception as exc:
        logger.warning('[CONFUSION] erro ao publicar notificação: %s', exc)


# ─── Padrões aprendidos ───────────────────────────────────────────────────────

async def load_learned_patterns(nicho: str, redis) -> list[dict]:
    """
    Retorna padrões aprendidos para o nicho.
    Usa Redis como cache; em miss, busca no banco e preenche o cache.
    """
    cache_key = _PATTERNS_CACHE_KEY.format(nicho=nicho)
    try:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    patterns = await _fetch_learned_patterns_db(nicho)

    try:
        await redis.set(cache_key, json.dumps(patterns, ensure_ascii=False), ex=_PATTERNS_CACHE_TTL)
    except Exception:
        pass

    return patterns


async def _fetch_learned_patterns_db(nicho: str) -> list[dict]:
    if not BOT_DATABASE_CONNECTION_URI:
        return []
    try:
        conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
        try:
            rows = await conn.fetch(
                '''
                SELECT frase, intent_alvo
                FROM bot_learned_patterns
                WHERE nicho = $1 AND ativo = TRUE
                ORDER BY created_at DESC
                ''',
                nicho,
            )
            return [{'frase': r['frase'], 'intentAlvo': r['intent_alvo']} for r in rows]
        finally:
            await conn.close()
    except Exception as exc:
        logger.error('[CONFUSION] erro ao buscar padrões aprendidos: %s', exc)
        return []


async def invalidate_patterns_cache(redis, nicho: str) -> None:
    """Invalida o cache de padrões após o admin adicionar uma correção."""
    try:
        await redis.delete(_PATTERNS_CACHE_KEY.format(nicho=nicho))
    except Exception:
        pass

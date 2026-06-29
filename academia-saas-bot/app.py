import asyncio
import json
import logging
import re
import time
import uuid
from datetime import datetime

from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from chains import generate_persona_response, _get_redis_sync
from database_api import (
    get_tenant_by_instance,
    get_tenant_configs,
    get_aluno_by_phone,
    get_matricula_ativa,
    get_cobrancas_pendentes,
    get_pix_chave_tenant,
    salvar_comprovante_pagamento,
)
from academia_flow import process_academia_message, AcademiaState, detectar_intent
from ai_intent_classifier import classify_intent as _ai_classify_intent
from message_buffer import buffer_message
from config import GEMINI_API_KEY, GEMINI_MODEL_NAME, REDIS_URL as _REDIS_URL

_REDIS_URI = _REDIS_URL or 'redis://redis:6379/6'
from admin_api import router as admin_router
from evolution_api import send_whatsapp_message
from router import detect_intent, detect_intent_with_context, is_within_hours
from script_responses import (
    resposta_saudacao,
    resposta_horario,
    resposta_fora_horario,
)
from memory import get_session_history
from order_extractor import build_order_payload_from_history_window_async
from order_extractor import extract_confirmed_product_from_history, extract_quantity_from_confirmation
from cobranca_worker import run_cobranca_worker
from cobranca_scheduler import run_cobranca_scheduler


# Configure logging to stdout
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

logger = logging.getLogger(__name__)


async def _get_redis_async():
    import redis.asyncio as aioredis
    return aioredis.from_url(_REDIS_URI, decode_responses=True)


from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app_instance):
    redis_async = await _get_redis_async()
    worker_task = asyncio.create_task(run_cobranca_worker(redis_async))
    scheduler_task = asyncio.create_task(run_cobranca_scheduler(redis_async))
    logger.info('[STARTUP] cobrança worker e scheduler iniciados')
    yield
    worker_task.cancel()
    scheduler_task.cancel()
    for task in (worker_task, scheduler_task):
        try:
            await task
        except asyncio.CancelledError:
            pass
    await redis_async.aclose()
    logger.info('[SHUTDOWN] cobrança worker e scheduler encerrados')


app = FastAPI(lifespan=lifespan)
app.include_router(admin_router)
logger = logging.getLogger(__name__)


_startup_time = time.time()


@app.get('/')
async def root():
    return {
        'status': 'ok',
        'message': 'API online.',
        'docs': 'http://localhost:8000/docs',
        'landing_page': 'http://localhost:3000',
    }


@app.get('/health')
async def health():
    redis_ok = False
    try:
        r = await _get_redis_async()
        await r.ping()
        await r.aclose()
        redis_ok = True
    except Exception:
        pass

    uptime_seconds = int(time.time() - _startup_time)
    status = 'ok' if redis_ok else 'degraded'
    return JSONResponse(
        status_code=200 if redis_ok else 503,
        content={
            'status': status,
            'uptime_seconds': uptime_seconds,
            'redis': 'ok' if redis_ok else 'unavailable',
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# ============================================================================
# Modelos Pydantic para Visão Computacional (Import de Cardápio)
# ============================================================================

class ProdutoVisionResponse(BaseModel):
    """Schema para um produto extraído por visão computacional."""
    nome: str
    preco_base: float
    categoria: str
    regras_ia: str = Field(default='')


class ProdutosVisionList(BaseModel):
    """Array de produtos extraído pela IA."""
    produtos: list[ProdutoVisionResponse]


gemini_client = genai.Client(api_key=(GEMINI_API_KEY or '').strip()) if GEMINI_API_KEY else None


def extract_chat_id(payload: dict) -> str | None:
    key = payload.get('data', {}).get('key', {})

    # Ignora mensagens enviadas pelo próprio bot — evita processar
    # o echo do outgoing e contaminar sessões de outros alunos.
    if key.get('fromMe'):
        return None

    raw_chat_id = key.get('remoteJid')
    if not raw_chat_id or raw_chat_id.endswith('@g.us'):
        return None

    number = raw_chat_id.split('@')[0]
    number = re.sub(r'\D', '', number)
    return number or None


def extract_message_text(payload: dict) -> str | None:
    message_data = payload.get('data', {}).get('message', {})

    possible_texts = [
        message_data.get('conversation'),
        message_data.get('extendedTextMessage', {}).get('text'),
        message_data.get('imageMessage', {}).get('caption'),
        message_data.get('videoMessage', {}).get('caption'),
    ]

    for text in possible_texts:
        if isinstance(text, str) and text.strip():
            return text.strip()

    return None


def extract_instance_name(payload: dict) -> str | None:
    instance = payload.get('instance')

    if isinstance(instance, str) and instance.strip():
        return instance.strip()

    if isinstance(instance, dict):
        nested_name = instance.get('instanceName') or instance.get('name')
        if isinstance(nested_name, str) and nested_name.strip():
            return nested_name.strip()

    data_instance = payload.get('data', {}).get('instance')
    if isinstance(data_instance, str) and data_instance.strip():
        return data_instance.strip()

    return None


def extract_image_message(payload: dict) -> dict | None:
    """Retorna o dict imageMessage quando a mensagem do webhook traz uma imagem."""
    message_data = payload.get('data', {}).get('message', {})
    image_msg = message_data.get('imageMessage')
    return image_msg if isinstance(image_msg, dict) else None


async def _fetch_media_base64(instance: str, api_key: str | None, evolution_data: dict) -> str | None:
    """
    Busca o base64 de uma mídia recebida via Evolution API
    (endpoint /chat/getBase64FromMediaMessage/{instance}), usado para
    capturar o comprovante de pagamento (foto) enviado pelo aluno.
    Retorna uma data URI (data:<mimetype>;base64,<...>) ou None se falhar.
    """
    if not instance or not evolution_data:
        return None
    try:
        import aiohttp
        from config import EVOLUTION_API_URL, EVOLUTION_AUTHENTICATION_API_KEY

        url = f'{EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/{instance}'
        headers = {
            'apikey': api_key or EVOLUTION_AUTHENTICATION_API_KEY or '',
            'Content-Type': 'application/json',
        }
        # A Evolution API espera o objeto `data` completo (contém key + message + timestamp)
        message_payload = evolution_data.get('data', evolution_data)
        body = {'message': message_payload, 'convertToMp4': False}

        async with aiohttp.ClientSession() as http_session:
            async with http_session.post(
                url, json=body, headers=headers, timeout=aiohttp.ClientTimeout(total=20)
            ) as resp:
                if resp.status not in (200, 201):
                    logger.warning('[MEDIA] getBase64FromMediaMessage status=%s', resp.status)
                    return None
                result = await resp.json()
                b64 = result.get('base64')
                if not b64:
                    return None
                mimetype = (
                    (evolution_data.get('message', {}) or {}).get('imageMessage', {}) or {}
                ).get('mimetype', 'image/jpeg')
                return f'data:{mimetype};base64,{b64}'
    except Exception as exc:
        logger.error('[MEDIA] erro ao buscar base64 da mídia: %s', exc, exc_info=True)
        return None


async def _process_chat_message(
    tenant_id: str,
    message: str,
    phone: str,
    session_id: str | None = None,
    imagem_recebida: bool = False,
    instance_name: str | None = None,
    evolution_api_key: str | None = None,
    evolution_raw_data: dict | None = None,
):
    """Shared message router used by both API simulator and WhatsApp webhook.

    `imagem_recebida`/`evolution_raw_data` só são usados pelo fluxo de
    academia (captura de comprovante de pagamento); os demais nichos os
    ignoram por enquanto.
    """
    t0 = time.time()

    tenant_id = (tenant_id or '').strip()
    message = (message or '').strip()
    phone = (phone or '').strip()
    session_id = (session_id or phone or tenant_id).strip()

    if not tenant_id or not message:
        raise ValueError('tenant_id e message são obrigatórios.')

    try:
        configs = await get_tenant_configs(tenant_id)
        logger.info('[ROUTER] sub_nicho: %s', configs.get('sub_nicho'))
        conversation_id = f'{tenant_id}:{session_id}'
        
        # PARTE 1: ROTEADOR — verificar intenções pré-IA
        horarios = configs.get('horarios', [])
        if horarios and not is_within_hours(horarios):
            reply = resposta_fora_horario(configs)
            return {'reply': reply, 'response': reply, 'sale_complete': False, 'confetti': False}

        import redis
        redis_async = redis.asyncio.from_url(_REDIS_URI, decode_responses=True)
        intent = await detect_intent_with_context(
            text=message,
            tenant_id=tenant_id,
            phone=session_id,
            sub_nicho=str(configs.get('sub_nicho') or '').strip().lower(),
            redis_client=redis_async
        )
        if intent:
            if intent == 'saudacao':
                historico = get_session_history(conversation_id)
                if not historico.messages:
                    reply = resposta_saudacao(configs)
                    return {'reply': reply, 'response': reply, 'sale_complete': False, 'confetti': False}
            elif intent == 'horario':
                reply = resposta_horario(configs)
                return {'reply': reply, 'response': reply, 'sale_complete': False, 'confetti': False}

        # ── ACADEMIA ──────────────────────────────────────────────────────────
        if str(configs.get('sub_nicho') or '').strip().lower() == 'academia':
            redis_sync = _get_redis_sync()
            session_key = f'academia_session:{tenant_id}:{session_id}'

            try:
                session_raw = redis_sync.get(session_key) if redis_sync else None
                session = json.loads(session_raw) if session_raw else {}
            except Exception:
                session = {}

            # Carrega dados do aluno — na primeira mensagem (IDENTIFICANDO) ou se ainda não temos
            aluno_id = session.get('aluno_id')
            aluno = None
            matricula = None
            cobrancas: list = []
            pix_chave = None

            try:
                if aluno_id:
                    # Dados já identificados, busca direto
                    aluno = {'id': aluno_id, 'nome': session.get('aluno_nome', '')}
                    matricula = await get_matricula_ativa(tenant_id, aluno_id)
                    cobrancas = await get_cobrancas_pendentes(tenant_id, aluno_id)
                else:
                    aluno = await get_aluno_by_phone(tenant_id, session_id)
                    if aluno:
                        matricula = await get_matricula_ativa(tenant_id, str(aluno['id']))
                        cobrancas = await get_cobrancas_pendentes(tenant_id, str(aluno['id']))

                pix_chave = await get_pix_chave_tenant(tenant_id)
            except Exception as exc:
                logger.error('[ACADEMIA] erro ao buscar dados do aluno: %s', exc, exc_info=True)

            # Se chegou uma imagem (possível comprovante), tenta buscar o base64 dela
            # ANTES de processar a máquina de estados, para já termos o conteúdo
            # pronto para salvar caso o fluxo confirme que é um comprovante.
            comprovante_url = None
            if imagem_recebida and aluno:
                comprovante_url = await _fetch_media_base64(
                    instance=instance_name or '',
                    api_key=evolution_api_key,
                    evolution_data=evolution_raw_data or {},
                )

            # Fallback de IA: só chama quando o regex não reconhece a mensagem
            # e o aluno já está no menu (após identificado). Custo zero no caminho feliz.
            ai_result = None
            state_atual = session.get('state', AcademiaState.IDENTIFICANDO.value)
            if (
                state_atual == AcademiaState.MENU.value
                and not imagem_recebida
                and GEMINI_API_KEY
                and detectar_intent(message) == 'desconhecido'
            ):
                # Monta status da matrícula para contexto da IA
                _mat_status = ''
                if matricula:
                    from academia_flow import _dias_ate, _fmt_data
                    dias = _dias_ate(matricula.get('data_vencimento'))
                    if dias is None:
                        _mat_status = 'ATIVA'
                    elif dias < 0:
                        _mat_status = f'VENCIDA há {abs(dias)} dias'
                    elif dias == 0:
                        _mat_status = 'vence HOJE'
                    elif dias <= 7:
                        _mat_status = f'vence em {dias} dias'
                    else:
                        _mat_status = f'ATIVA até {_fmt_data(matricula.get("data_vencimento"))}'

                try:
                    ai_result = await _ai_classify_intent(
                        message,
                        nome=session.get('aluno_nome', ''),
                        estado=state_atual,
                        num_cobrancas=len(cobrancas),
                        matricula_status=_mat_status,
                        historico=session.get('historico', []),
                        ultima_msg_bot=session.get('ultima_msg_bot', ''),
                        api_key=GEMINI_API_KEY,
                        model=GEMINI_MODEL_NAME or 'gemini-2.5-flash',
                    )
                except Exception:
                    ai_result = None

            reply_academia, session_atualizada = process_academia_message(
                text=message,
                session=session,
                aluno=aluno,
                matricula=matricula,
                cobrancas=cobrancas,
                pix_chave=pix_chave,
                tenant_config=configs,
                imagem_recebida=bool(imagem_recebida and aluno is not None),
                ai_result=ai_result,
            )

            # Persiste histórico e última msg do bot para enriquecer contexto da próxima chamada
            historico = list(session_atualizada.get('historico', session.get('historico', [])))
            historico.append({'r': 'a', 't': (message or '')[:200]})
            resp_text = reply_academia if isinstance(reply_academia, str) else (reply_academia[-1] if reply_academia else '')
            historico.append({'r': 'b', 't': resp_text[:300]})
            session_atualizada['historico'] = historico[-10:]  # últimas 5 trocas
            session_atualizada['ultima_msg_bot'] = resp_text[:400]

            # Se o aluno acabou de enviar o comprovante, registra no banco
            # (cobranças PENDENTE/VENCIDO → AGUARDANDO_VALIDACAO + anexa a foto).
            # A confirmação final é manual, feita pelo dono no dashboard.
            if session_atualizada.get('comprovante_enviado') and not session.get('comprovante_enviado'):
                try:
                    aid = session_atualizada.get('aluno_id') or (aluno or {}).get('id')
                    if aid:
                        await salvar_comprovante_pagamento(
                            tenant_id,
                            str(aid),
                            comprovante_url or '',
                        )
                except Exception as exc:
                    logger.error('[ACADEMIA] erro ao salvar comprovante de pagamento: %s', exc, exc_info=True)

            try:
                if redis_sync:
                    redis_sync.setex(session_key, 3600, json.dumps(session_atualizada, ensure_ascii=False))
            except Exception:
                pass

            resp = reply_academia if isinstance(reply_academia, str) else (reply_academia[-1] if reply_academia else '')
            payload: dict = {
                'reply': resp,
                'response': resp,
                'sale_complete': False,
                'confetti': False,
            }
            if isinstance(reply_academia, list) and len(reply_academia) > 1:
                payload['messages'] = reply_academia
            return payload

        # ── GEMINI FALLBACK ───────────────────────────────────────────────────
        prompt_ia = configs.get('promptIa') or ''
        bot_objective = configs.get('botObjective') or 'FECHAR_PEDIDO'

        instruction_ia = 'Responda à mensagem do usuário de forma natural, seguindo sua persona.'

        reply: str = await asyncio.to_thread(
            generate_persona_response,
            instruction_ia,
            message,
            conversation_id,
            prompt_ia or None,
            bot_objective,
            tenant_id,
        )
    except Exception as exc:
        print(f'[chat-sync] erro ao gerar resposta: {exc}')
        raise

    ai_response = (reply or '').rstrip()
    is_sale_complete = ai_response.endswith('✅')

    payload = {
        'reply': ai_response,
        'response': ai_response,
        'sale_complete': is_sale_complete,
        'summary': ai_response if is_sale_complete else None,
        'confetti': is_sale_complete,
    }

    logger.info('[CHAT-SYNC] processed in %.2fms tenant=%s session=%s', (time.time() - t0) * 1000, tenant_id, session_id)
    return payload

@app.post('/api/chat-sync')
async def chat_sync(request: Request):
    """Porta síncrona para o simulador da Landing Page.
    Recebe tenant_id + message, carrega a persona do banco e devolve a
    resposta da IA sem disparar nada na Evolution API.
    Inclui roteador de script para intenções pré-IA.
    """
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido.'}, status_code=400)

    tenant_id = (data.get('tenant_id') or '').strip()
    message = (data.get('message') or '').strip()
    # session_id permite manter histórico separado por visitante.
    # Prioriza session_id explícito, depois phone, e por fim tenant_id.
    phone = (data.get('phone') or '').strip()
    session_id = (data.get('session_id') or phone or tenant_id).strip()

    if not tenant_id or not message:
        return JSONResponse(
            {'error': 'Os campos tenant_id e message são obrigatórios.'},
            status_code=422,
        )

    try:
        result = await _process_chat_message(tenant_id, message, phone, session_id)
        return JSONResponse(result)
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=422)
    except Exception as e:
        logger.error('[CHAT-SYNC] erro inesperado: %s', e, exc_info=True)
        return JSONResponse({'error': 'Erro interno no servidor.'}, status_code=500)


@app.post('/webhook/evolution')
async def webhook_evolution(request: Request):
    """Recebe mensagens da Evolution API e responde via WhatsApp."""
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido.'}, status_code=400)

    event = data.get('event', '')
    if event not in ('messages.upsert', 'MESSAGES_UPSERT', ''):
        return JSONResponse({'status': 'ignored', 'event': event})

    phone = extract_chat_id(data)
    message_text = extract_message_text(data)
    image_msg = extract_image_message(data)
    instance_name = extract_instance_name(data)

    if not phone or (not message_text and not image_msg):
        return JSONResponse({'status': 'ignored', 'reason': 'no phone or message'})

    imagem_recebida = bool(image_msg)
    if not message_text:
        # Imagem sem legenda — usamos um marcador só para preencher o
        # campo obrigatório de texto; o flag imagem_recebida é o que importa.
        message_text = '📷 (imagem recebida)'

    logger.info(
        '[WEBHOOK] instance=%s phone=%s message=%s imagem=%s',
        instance_name, phone, message_text[:80], imagem_recebida,
    )

    tenant = await get_tenant_by_instance(instance_name or '')
    if not tenant:
        logger.warning('[WEBHOOK] tenant não encontrado para instance=%s', instance_name)
        return JSONResponse({'status': 'tenant not found'})

    tenant_id = str(tenant.get('id') or '')
    evolution_api_key = tenant.get('evolutionApiKey')

    # Se a mensagem é uma imagem, baixa o base64 agora (enquanto temos o payload completo)
    # e cacheia no Redis para o _handle_academia_message consumir após o debounce.
    if imagem_recebida and tenant_id:
        try:
            media_b64 = await _fetch_media_base64(instance_name or '', evolution_api_key, data)
            if media_b64:
                import redis as _redis_sync_mod
                _r = _redis_sync_mod.from_url(_REDIS_URI, decode_responses=True)
                _r.setex(f'media:{phone}:{tenant_id}', 120, media_b64)
                _r.close()
        except Exception as _exc:
            logger.warning('[WEBHOOK] erro ao cachear mídia: %s', _exc)

    # Buffer para debounce (agrupa mensagens rápidas do mesmo número).
    # O envio acontece de forma assíncrona via handle_debounce em message_buffer.py.
    await buffer_message(phone, message_text, tenant_id=tenant_id, instance_name=instance_name)
    return JSONResponse({'status': 'buffered'})


# ─── Endpoint de enqueue de cobranças ──────────────────────────────────────

@app.post('/api/cobrancas/enqueue')
async def enqueue_cobrancas(request: Request):
    """
    Recebe lista de IDs de cobranças e empurra na fila Redis do worker.
    Body: {tenant_id, cobranca_ids: [str], daily_limit?: int}
"""
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido.'}, status_code=400)

    tenant_id = (data.get('tenant_id') or '').strip()
    cobranca_ids: list = data.get('cobranca_ids') or []

    if not tenant_id or not cobranca_ids:
        return JSONResponse({'error': 'tenant_id e cobranca_ids são obrigatórios.'}, status_code=422)

    from cobranca_worker import _queue_key, _progress_key
    import redis.asyncio as aioredis
    redis_async = aioredis.from_url(_REDIS_URI, decode_responses=True)

    try:
        queue_key = _queue_key(tenant_id)
        # Limpa fila anterior do mesmo tenant se ainda houver
        await redis_async.delete(queue_key)
        # LPUSH para que o RPOP processe na ordem certa (FIFO)
        for cid in reversed(cobranca_ids):
            await redis_async.lpush(queue_key, cid)
        await redis_async.expire(queue_key, 86400)

        # Inicializa progresso
        progress_key = _progress_key(tenant_id)
        await redis_async.hset(progress_key, mapping={
            'total': str(len(cobranca_ids)),
            'sent': '0',
            'failed': '0',
            'status': 'aguardando',
            'started_at': datetime.now().isoformat(timespec='seconds'),
        })
        await redis_async.expire(progress_key, 3600)

        logger.info('[ENQUEUE] %d cobranças enfileiradas para tenant=%s', len(cobranca_ids), tenant_id)
        return JSONResponse({'enfileiradas': len(cobranca_ids), 'status': 'ok'})
    finally:
        await redis_async.aclose()


@app.get('/api/cobrancas/progresso/{tenant_id}')
async def progresso_cobrancas(tenant_id: str):
    """Retorna o progresso atual do disparo em lote para o tenant."""
    from cobranca_worker import _progress_key, _queue_key, _daily_key
    import redis.asyncio as aioredis
    redis_async = aioredis.from_url(_REDIS_URI, decode_responses=True)

    try:
        progress = await redis_async.hgetall(_progress_key(tenant_id))
        fila_restante = await redis_async.llen(_queue_key(tenant_id))
        daily_count = await redis_async.get(_daily_key(tenant_id))

        return JSONResponse({
            'total': int(progress.get('total', 0) or 0),
            'sent': int(progress.get('sent', 0) or 0),
            'failed': int(progress.get('failed', 0) or 0),
            'status': progress.get('status', 'inativo'),
            'fila_restante': fila_restante,
            'daily_count': int(daily_count or 0),
            'updated_at': progress.get('updated_at', ''),
        })
    finally:
        await redis_async.aclose()


# ─── Endpoints de teste (apenas para ambiente de desenvolvimento) ──────────────

@app.post('/api/test/seed-cobranca')
async def test_seed_cobranca(request: Request):
    """
    Cria uma cobrança de teste no banco e a enfileira para o worker.
    Body: {tenant_id, aluno_id, valor_cents?, data_vencimento?, descricao?, pix_chave?, matricula_id?}
    Retorna: {cobranca_id, enfileirada: true}
    """
    import os
    if os.getenv('ALLOW_TEST_ENDPOINTS', '').lower() not in ('1', 'true', 'yes'):
        return JSONResponse({'error': 'Endpoints de teste desabilitados. Configure ALLOW_TEST_ENDPOINTS=true.'}, status_code=403)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido.'}, status_code=400)

    tenant_id = (data.get('tenant_id') or '').strip()
    aluno_id = (data.get('aluno_id') or '').strip()
    if not tenant_id or not aluno_id:
        return JSONResponse({'error': 'tenant_id e aluno_id são obrigatórios.'}, status_code=422)

    from datetime import date as _date
    valor_cents = int(data.get('valor_cents') or 9000)
    descricao = data.get('descricao') or 'Mensalidade Academia - TESTE'
    pix_chave = data.get('pix_chave') or None
    matricula_id = data.get('matricula_id') or None
    _dv_raw = data.get('data_vencimento') or datetime.now().strftime('%Y-%m-%d')
    data_vencimento = _date.fromisoformat(_dv_raw) if isinstance(_dv_raw, str) else _dv_raw

    from config import BOT_DATABASE_CONNECTION_URI
    import asyncpg
    conn = await asyncpg.connect(BOT_DATABASE_CONNECTION_URI)
    try:
        cobranca_id = str(uuid.uuid4())
        now = datetime.now()
        await conn.execute(
            '''
            INSERT INTO cobrancas_alunos
                (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento,
                 descricao, pix_chave, status, enviada_whatsapp, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDENTE', false, $9, $9)
            ''',
            cobranca_id, tenant_id, aluno_id, matricula_id,
            valor_cents, data_vencimento,
            descricao, pix_chave, now,
        )
    finally:
        await conn.close()

    # Enfileira no Redis
    from cobranca_worker import _queue_key, _progress_key
    import redis.asyncio as aioredis
    redis_async = aioredis.from_url(_REDIS_URI, decode_responses=True)
    try:
        queue_key = _queue_key(tenant_id)
        await redis_async.lpush(queue_key, cobranca_id)
        await redis_async.expire(queue_key, 86400)
        progress_key = _progress_key(tenant_id)
        await redis_async.hset(progress_key, mapping={
            'total': '1',
            'sent': '0',
            'failed': '0',
            'status': 'aguardando',
            'started_at': now.isoformat(timespec='seconds'),
        })
        await redis_async.expire(progress_key, 3600)
    finally:
        await redis_async.aclose()

    logger.info('[TEST] Cobrança de teste criada: %s tenant=%s aluno=%s', cobranca_id, tenant_id, aluno_id)
    return JSONResponse({'cobranca_id': cobranca_id, 'enfileirada': True, 'valor_cents': valor_cents})


@app.post('/api/test/reset-daily-limit')
async def test_reset_daily_limit(request: Request):
    """
    Zera o contador diário de cobranças de um tenant (permite reenvio no mesmo dia).
    Body: {tenant_id}
    """
    import os
    if os.getenv('ALLOW_TEST_ENDPOINTS', '').lower() not in ('1', 'true', 'yes'):
        return JSONResponse({'error': 'Endpoints de teste desabilitados. Configure ALLOW_TEST_ENDPOINTS=true.'}, status_code=403)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'JSON inválido.'}, status_code=400)

    tenant_id = (data.get('tenant_id') or '').strip()
    if not tenant_id:
        return JSONResponse({'error': 'tenant_id é obrigatório.'}, status_code=422)

    from cobranca_worker import _daily_key, _progress_key, _queue_key
    import redis.asyncio as aioredis
    redis_async = aioredis.from_url(_REDIS_URI, decode_responses=True)
    try:
        deleted = await redis_async.delete(
            _daily_key(tenant_id),
            _progress_key(tenant_id),
            _queue_key(tenant_id),
        )
    finally:
        await redis_async.aclose()

    return JSONResponse({'deletadas': deleted, 'status': 'ok'})

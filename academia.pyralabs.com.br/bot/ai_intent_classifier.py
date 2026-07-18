"""
ai_intent_classifier.py — Fallback de IA para quando o regex da academia_flow
não reconhece a intenção da mensagem.

Usa Gemini Flash (google-genai) via asyncio.to_thread para não bloquear o event loop.
Só é chamado quando o regex retorna 'desconhecido', mantendo custo mínimo.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

VALID_INTENTS = frozenset([
    'matricula', 'cobranca', 'pix', 'paguei', 'renovar',
    'encerrar', 'menu', 'sim', 'nao', 'optout', 'desconhecido',
])

_FALLBACK = {'intent': 'desconhecido', 'resposta': None}

_PROMPT = """\
Você é classificador de intenções de um bot de WhatsApp para academia de ginástica.

Classifique a MENSAGEM ATUAL do aluno em UMA das intenções:
• matricula   — quer ver situação/plano/vencimento da matrícula
• cobranca    — quer ver débitos/mensalidade/quanto deve/cobranças pendentes
• pix         — quer a chave Pix para pagar
• paguei      — informa que já fez o pagamento, transferiu, enviou Pix
• renovar     — quer renovar ou reativar a matrícula
• encerrar    — quer encerrar o atendimento, tchauzinho, agradecer
• menu        — quer ver as opções, voltar ao menu, saudação genérica
• sim         — confirmação/afirmação em resposta ao que o bot perguntou
• nao         — negação/recusa em resposta ao que o bot perguntou
• optout      — pede explicitamente para parar de receber mensagens/cobranças, sair da lista, ser removido
• desconhecido — pergunta genérica sobre a academia ou não se encaixa em nada acima

━━━ CONTEXTO DO ATENDIMENTO ━━━
Nome do aluno: {nome}
Estado: {estado}
Cobranças pendentes: {cobrancas}
Situação da matrícula: {matricula_status}

━━━ HISTÓRICO RECENTE (do mais antigo ao mais recente) ━━━
{historico}

━━━ ÚLTIMA MENSAGEM DO BOT ━━━
{ultima_msg_bot}

━━━ MENSAGEM ATUAL DO ALUNO ━━━
"{texto}"

REGRAS:
1. Use o histórico e a última mensagem do bot para resolver ambiguidades ("sim", "isso", "esse", "pode ser", etc.)
2. Se o aluno responde a uma pergunta direta do bot (ex: "Quer pagar via Pix?"), interprete no contexto da pergunta
3. Resposta livre SOMENTE quando intent=desconhecido; deve ser curta, simpática e útil
4. Nunca invente intent — se genuinamente não se encaixa, use desconhecido

Responda SOMENTE com JSON válido, sem markdown:
{{"intent": "<uma das opções>", "resposta": "<texto se desconhecido, senão null>"}}"""


def _formatar_historico(historico: list[dict]) -> str:
    if not historico:
        return '(sem histórico)'
    linhas = []
    for h in historico[-6:]:  # últimas 3 trocas
        role = 'Aluno' if h.get('r') == 'a' else 'Bot'
        linhas.append(f'{role}: {h.get("t", "")[:200]}')
    return '\n'.join(linhas)


def _call_gemini_sync(prompt: str, api_key: str, model: str) -> dict[str, Any]:
    """Chamada síncrona ao Gemini — executada em thread separada."""
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.05,
            max_output_tokens=300,
            # Desativa thinking do Gemini 2.5+ para respostas rápidas e sem truncamento
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    raw = (response.text or '').strip()

    # Remove markdown se vier com ```json ... ```
    if raw.startswith('```'):
        parts = raw.split('```')
        raw = parts[1].lstrip('json').strip() if len(parts) > 1 else raw

    result: dict = json.loads(raw)

    if result.get('intent') not in VALID_INTENTS:
        result['intent'] = 'desconhecido'

    return result


async def classify_intent(
    text: str,
    *,
    nome: str = '',
    estado: str = 'menu',
    num_cobrancas: int = 0,
    matricula_status: str = '',
    historico: list[dict] | None = None,
    ultima_msg_bot: str = '',
    api_key: str,
    model: str = 'gemini-2.5-flash',
    timeout: float = 4.0,
) -> dict[str, Any]:
    """
    Classifica a intenção do aluno via Gemini Flash.

    Retorna {'intent': str, 'resposta': str | None}.
    Nunca lança exceção — retorna _FALLBACK em qualquer erro ou timeout.

    Parâmetros de contexto:
      historico       — lista de {'r': 'a'|'b', 't': texto} das últimas mensagens
      ultima_msg_bot  — última mensagem enviada pelo bot (resolve "sim"/"não" ambíguos)
      matricula_status — ex: 'ATIVA', 'VENCIDA', 'vence em 3 dias'
    """
    if not api_key:
        return _FALLBACK

    prompt = _PROMPT.format(
        nome=nome or 'Aluno',
        estado=estado,
        cobrancas=f'{num_cobrancas} pendente(s)' if num_cobrancas else 'nenhuma',
        matricula_status=matricula_status or 'desconhecida',
        historico=_formatar_historico(historico or []),
        ultima_msg_bot=ultima_msg_bot[:400] if ultima_msg_bot else '(primeira mensagem)',
        texto=(text or '')[:500],
    )

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_call_gemini_sync, prompt, api_key, model),
            timeout=timeout,
        )
        logger.debug('[AI_CLASSIFIER] intent=%s', result.get('intent'))
        return result

    except asyncio.TimeoutError:
        logger.warning('[AI_CLASSIFIER] timeout após %.1fs', timeout)
        return _FALLBACK
    except Exception as exc:
        logger.warning('[AI_CLASSIFIER] erro (%s): %s', type(exc).__name__, exc)
        return _FALLBACK

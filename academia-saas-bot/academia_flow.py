"""
academia_flow.py — Máquina de estados para o bot de academia.

Fluxo principal:
  IDENTIFICANDO       → busca o aluno pelo telefone no banco
  MENU                → apresenta as opções disponíveis
  AGUARD_COMPROVANTE  → aluno confirmou que vai pagar / disse que já pagou,
                         bot pede a foto do comprovante e aguarda
  FINALIZADO          → conversa encerrada

Pagamento (sem gateway/API): o bot informa o débito, envia a chave Pix,
pede o comprovante na própria conversa e, quando a imagem chega, registra
a cobrança como AGUARDANDO_VALIDACAO — a confirmação final é manual,
feita pelo dono no dashboard.

O aluno pode a qualquer momento:
  - Consultar situação da matrícula
  - Ver cobranças pendentes + chave Pix
  - Avisar que vai pagar / que já pagou (e enviar o comprovante)
  - Sair / encerrar
"""
from __future__ import annotations

import logging
import re
from datetime import date, datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# ─── Estados ──────────────────────────────────────────────────────────────────

class AcademiaState(Enum):
    IDENTIFICANDO      = 'identificando'
    MENU               = 'menu'
    AGUARD_COMPROVANTE = 'aguard_comprovante'
    FINALIZADO         = 'finalizado'


# ─── Helpers de formatação ────────────────────────────────────────────────────

def _fmt_brl(cents: int) -> str:
    return f'R$ {cents / 100:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')


def _fmt_data(value: Any) -> str:
    """Formata date / datetime / string ISO para dd/mm/aaaa."""
    if not value:
        return '?'
    if isinstance(value, (date, datetime)):
        return value.strftime('%d/%m/%Y')
    try:
        return datetime.fromisoformat(str(value)).strftime('%d/%m/%Y')
    except Exception:
        return str(value)


def _dias_ate(value: Any) -> int | None:
    """Retorna dias até a data (negativo = vencido)."""
    if not value:
        return None
    if isinstance(value, datetime):
        d = value.date()
    elif isinstance(value, date):
        d = value
    else:
        try:
            d = datetime.fromisoformat(str(value)).date()
        except Exception:
            return None
    return (d - date.today()).days


def _norm(text: str) -> str:
    import unicodedata
    raw = unicodedata.normalize('NFKD', (text or '').lower())
    return ''.join(c for c in raw if not unicodedata.combining(c)).strip()


# ─── Detecção de intenção ─────────────────────────────────────────────────────

_PATTERNS_MATRICULA = [
    r'\b(matricula|matrícula|plano|situação|situacao|minha situacao|status|venc(e|imento)|quando vence|vigencia|ativo)\b',
]

_PATTERNS_COBRANCA = [
    r'\b(cobranca|cobrança|mensalidade|debito|devo|boleto|pagar|pagamento|pendente|atrasado|inadimplente)\b',
    r'\b(tenho (alguma )?(cobranca|cobrança|divida|dívida))\b',
    r'\b(quanto (devo|fica|é))\b',
]

_PATTERNS_PIX = [
    r'\b(pix|chave pix|chave do pix|pagar (no )?pix)\b',
]

_PATTERNS_PAGUEI = [
    r'\b(paguei|já paguei|ja paguei|efetuei|fiz o pix|realizei|transferi|enviei)\b',
    r'\b(pix (enviado|feito|realizado|mandado))\b',
    r'\b(acabei de pagar|acabei de fazer)\b',
]

_PATTERNS_MENU = [
    r'\b(menu|opções|opcoes|ajuda|help|inicio|voltar)\b',
    r'^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|e ai|eai)[\s!?.]*$',
]

_PATTERNS_ENCERRAR = [
    r'\b(obrigad[ao]|valeu|ok|tudo certo|entendido|até|ate|tchau|flw|falou)\b',
    r'\b(nao preciso|não preciso|era isso|foi isso|sem mais)\b',
]

_PATTERNS_SIM = [
    r'^(sim|s|isso|pode|certo|confirmo|ok|yes|positivo|exato)[\s!.]*$',
    r'\b(sim|confirmo|isso mesmo)\b',
]

_PATTERNS_NAO = [
    r'^(nao|não|n|negativo|errado)[\s!.]*$',
]


def _detectar_intent(text: str) -> str:
    t = _norm(text)
    for p in _PATTERNS_PAGUEI:
        if re.search(p, t):
            return 'paguei'
    for p in _PATTERNS_PIX:
        if re.search(p, t):
            return 'pix'
    for p in _PATTERNS_COBRANCA:
        if re.search(p, t):
            return 'cobranca'
    for p in _PATTERNS_MATRICULA:
        if re.search(p, t):
            return 'matricula'
    for p in _PATTERNS_ENCERRAR:
        if re.search(p, t):
            return 'encerrar'
    for p in _PATTERNS_MENU:
        if re.search(p, t):
            return 'menu'
    for p in _PATTERNS_SIM:
        if re.search(p, t):
            return 'sim'
    for p in _PATTERNS_NAO:
        if re.search(p, t):
            return 'nao'
    return 'desconhecido'


# ─── Montagem de mensagens ─────────────────────────────────────────────────────

def _msg_nao_encontrado() -> str:
    return (
        '😅 Não encontrei seu cadastro aqui. '
        'Fala com a gente pessoalmente para verificar seu número! 📱'
    )


def _msg_menu(nome: str, matricula: dict | None, cobrancas: list[dict]) -> str:
    primeiro_nome = (nome or '').split()[0]
    linhas = [f'Olá, *{primeiro_nome}*! 💪 O que posso ajudar?\n']
    linhas.append('1️⃣ Minha matrícula')
    linhas.append('2️⃣ Cobranças pendentes')
    if cobrancas:
        linhas.append('3️⃣ Ver chave Pix para pagamento')
        linhas.append('4️⃣ Já fiz o pagamento')
    linhas.append('\nDigite o número ou descreva o que precisa 😊')
    return '\n'.join(linhas)


def _msg_matricula(matricula: dict | None) -> str:
    if not matricula:
        return '📋 Você não possui matrícula ativa no momento.\nFale com a recepção para renovar! 😊'

    plano = str(matricula.get('plano_nome') or '').strip()
    venc = matricula.get('data_vencimento')
    periodicidade = str(matricula.get('periodicidade') or '').lower()
    valor_cents = matricula.get('plano_valor_cents') or 0
    dias = _dias_ate(venc)

    status_linha = ''
    if dias is None:
        status_linha = '📋 *Status:* Ativa'
    elif dias < 0:
        status_linha = f'⚠️ *Status:* Vencida há {abs(dias)} dia(s)'
    elif dias == 0:
        status_linha = '⚠️ *Status:* Vence hoje!'
    elif dias <= 7:
        status_linha = f'⏰ *Status:* Vence em {dias} dia(s) — renove logo!'
    else:
        status_linha = f'✅ *Status:* Ativa'

    return (
        f'🏋️ *Sua matrícula:*\n\n'
        f'📌 *Plano:* {plano}\n'
        f'💰 *Valor:* {_fmt_brl(valor_cents)}/{periodicidade}\n'
        f'📅 *Vencimento:* {_fmt_data(venc)}\n'
        f'{status_linha}'
    )


def _msg_cobrancas(cobrancas: list[dict], pix_chave: str | None) -> str:
    if not cobrancas:
        return '✅ Você não possui cobranças pendentes. Tudo em dia! 🎉'

    linhas = ['💳 *Cobranças em aberto:*\n']
    for c in cobrancas:
        status = str(c.get('status') or '').upper()
        emoji = '🔴' if status == 'VENCIDO' else '🟡'
        descr = str(c.get('descricao') or 'Mensalidade').strip()
        venc = _fmt_data(c.get('data_vencimento'))
        valor = _fmt_brl(c.get('valor_cents') or 0)
        linhas.append(f'{emoji} {descr} — *{valor}* (venc. {venc})')

    if pix_chave:
        linhas.append('\nQuer pagar agora? Digite *Pix* que eu te mando a chave! 😊')
    else:
        linhas.append('\nEntre em contato com a recepção para realizar o pagamento.')

    return '\n'.join(linhas)


def _msg_pix(pix_chave: str | None, cobrancas: list[dict]) -> str:
    if not pix_chave:
        return '📵 A chave Pix ainda não foi configurada.\nFale com a recepção para efetuar o pagamento!'

    if not cobrancas:
        return '✅ Não há cobranças pendentes para você no momento!'

    total = sum(c.get('valor_cents') or 0 for c in cobrancas)
    linhas = [
        f'🔑 *Chave Pix:* `{pix_chave}`',
        f'💰 *Total pendente:* {_fmt_brl(total)}',
        '',
        'Depois de pagar, *envie a foto do comprovante aqui mesmo no chat* 📸 '
        'que eu já registro pra equipe confirmar! 😊',
    ]
    return '\n'.join(linhas)


def _msg_pedir_comprovante(cobrancas: list[dict]) -> str:
    if not cobrancas:
        return '✅ Não encontrei cobranças pendentes no seu cadastro.\nSe acabou de pagar, aguarde alguns instantes para processarmos! 😊'

    total = sum(c.get('valor_cents') or 0 for c in cobrancas)
    return (
        f'Perfeito! Para eu confirmar o pagamento de *{_fmt_brl(total)}*, '
        f'me envia uma *foto do comprovante* (print do Pix) aqui no chat 📸'
    )


def _msg_lembrar_envio_foto() -> str:
    return (
        '📸 Pode mandar a foto/print do comprovante aqui mesmo no chat. '
        'Assim que chegar, eu já deixo registrado pra equipe conferir.'
    )


def _msg_comprovante_recebido() -> str:
    return (
        '✅ *Comprovante recebido!* Vou repassar pra equipe confirmar o pagamento.\n\n'
        'Assim que for validado, te aviso por aqui. Obrigado(a)! 💪'
    )


def _msg_comprovante_sem_pendencia() -> str:
    return (
        '📸 Recebi sua imagem, mas não encontrei nenhuma cobrança pendente no seu cadastro. '
        'Se for sobre outro assunto, me conta que eu ajudo! 😊'
    )


def _msg_encerrar(nome: str) -> str:
    primeiro = (nome or 'você').split()[0]
    return f'Foi um prazer ajudar, *{primeiro}*! 💪\nQualquer coisa é só chamar. Bons treinos! 🏋️'


def _msg_nao_entendi() -> str:
    return (
        'Hmm, não entendi muito bem. 😅\n\n'
        'Posso ajudar com:\n'
        '1️⃣ Minha matrícula\n'
        '2️⃣ Cobranças pendentes\n'
        '3️⃣ Chave Pix\n'
        '4️⃣ Já fiz o pagamento'
    )


# ─── Máquina de estados ───────────────────────────────────────────────────────

def process_academia_message(
    text: str,
    session: dict[str, Any],
    aluno: dict[str, Any] | None,
    matricula: dict[str, Any] | None,
    cobrancas: list[dict[str, Any]],
    pix_chave: str | None,
    tenant_config: dict[str, Any],
    imagem_recebida: bool = False,
) -> tuple[str | list[str], dict[str, Any]]:
    """
    Processa uma mensagem do aluno e retorna (resposta, session_atualizada).
    `aluno` é None quando o telefone não foi encontrado no banco.
    `imagem_recebida` indica que a mensagem do WhatsApp trouxe uma imagem
    (possível comprovante de pagamento) — quem decide se há mídia real
    a salvar é a camada de cima (app.py); aqui só tratamos a intenção.
    """
    session = dict(session)
    state = session.get('state', AcademiaState.IDENTIFICANDO.value)

    # ── IDENTIFICANDO ──────────────────────────────────────────────────────────
    if state == AcademiaState.IDENTIFICANDO.value:
        if not aluno:
            session['state'] = AcademiaState.FINALIZADO.value
            return _msg_nao_encontrado(), session

        session['aluno_id']   = str(aluno.get('id') or '')
        session['aluno_nome'] = str(aluno.get('nome') or '')
        session['state']      = AcademiaState.MENU.value
        return _msg_menu(session['aluno_nome'], matricula, cobrancas), session

    nome = session.get('aluno_nome', '')

    # ── Imagem recebida em qualquer momento (após identificado) ────────────────
    # Tratamos como possível comprovante de pagamento, independente do estado
    # atual — na prática o aluno costuma só mandar a foto sem seguir o menu.
    if imagem_recebida:
        if cobrancas:
            session['comprovante_enviado'] = True
            session['state'] = AcademiaState.MENU.value
            return _msg_comprovante_recebido(), session
        session['state'] = AcademiaState.MENU.value
        return _msg_comprovante_sem_pendencia(), session

    # ── AGUARD_COMPROVANTE ──────────────────────────────────────────────────────
    if state == AcademiaState.AGUARD_COMPROVANTE.value:
        intent = _detectar_intent(text)
        if intent == 'menu':
            session['state'] = AcademiaState.MENU.value
            return _msg_menu(nome, matricula, cobrancas), session
        if intent == 'encerrar':
            session['state'] = AcademiaState.FINALIZADO.value
            return _msg_encerrar(nome), session
        # Qualquer outro texto enquanto aguardamos: só reforça o pedido da foto
        return _msg_lembrar_envio_foto(), session

    # ── MENU ───────────────────────────────────────────────────────────────────
    if state == AcademiaState.MENU.value:
        intent = _detectar_intent(text)
        text_norm = _norm(text)

        # Atalhos numéricos
        if text_norm in ('1', '1.'):
            intent = 'matricula'
        elif text_norm in ('2', '2.'):
            intent = 'cobranca'
        elif text_norm in ('3', '3.'):
            intent = 'pix'
        elif text_norm in ('4', '4.'):
            intent = 'paguei'

        session['state'] = AcademiaState.MENU.value  # permanece no menu por padrão

        if intent == 'matricula':
            return _msg_matricula(matricula), session

        if intent == 'cobranca':
            return _msg_cobrancas(cobrancas, pix_chave), session

        if intent == 'pix':
            if pix_chave and cobrancas:
                session['state'] = AcademiaState.AGUARD_COMPROVANTE.value
            return _msg_pix(pix_chave, cobrancas), session

        if intent == 'paguei':
            if not cobrancas:
                return _msg_pedir_comprovante([]), session
            session['state'] = AcademiaState.AGUARD_COMPROVANTE.value
            return _msg_pedir_comprovante(cobrancas), session

        if intent == 'encerrar':
            session['state'] = AcademiaState.FINALIZADO.value
            return _msg_encerrar(nome), session

        if intent == 'menu':
            return _msg_menu(nome, matricula, cobrancas), session

        # Não entendeu
        return _msg_nao_entendi(), session

    # ── FINALIZADO ─────────────────────────────────────────────────────────────
    if state == AcademiaState.FINALIZADO.value:
        # Se o aluno mandar mais alguma coisa, reabre o menu
        session['state'] = AcademiaState.MENU.value
        return _msg_menu(nome, matricula, cobrancas), session

    # Fallback de segurança
    session['state'] = AcademiaState.MENU.value
    return _msg_menu(nome, matricula, cobrancas), session

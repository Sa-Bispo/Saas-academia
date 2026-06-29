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


# Tabela de expansão de abreviações e erros comuns antes de aplicar os patterns.
_ABREVIACOES = [
    (r'\bpgei\b',      'paguei'),
    (r'\bpguei\b',     'paguei'),
    (r'\bpaguie\b',    'paguei'),
    (r'\bpgto\b',      'pagamento'),
    (r'\bpgt\b',       'pagamento'),
    (r'\bkd\b',        'cadê'),
    (r'\bkde\b',       'cadê'),
    (r'\bcade\b',      'cadê'),
    (r'\bvc\b',        'voce'),
    (r'\bvcs\b',       'voces'),
    (r'\bmsm\b',       'mesmo'),
    (r'\bmto\b',       'muito'),
    (r'\btd\b',        'tudo'),
    (r'\bblz\b',       'beleza'),
    (r'\bvlw\b',       'valeu'),
    (r'\bflw\b',       'falou'),
    (r'\bobg\b',       'obrigado'),
    (r'\bqto\b',       'quanto'),
    (r'\bqdo\b',       'quando'),
    (r'\bqndo\b',      'quando'),
    (r'\bpq\b',        'porque'),
    (r'\bmsld\b',      'mensalidade'),
    (r'\bcomprv\b',    'comprovante'),
    (r'\bcomprova\b',  'comprovante'),
    (r'\bcomp\b',      'comprovante'),
    (r'\bmtri[ck]ula\b', 'matricula'),
    (r'\breov\b',      'renovar'),
    (r'\brenov\b',     'renovar'),
    (r'\btransf\b',    'transferi'),
    (r'\bmandei\b',    'enviei'),
    (r'\bja\b',        'ja'),   # já sem acento já está ok no _norm
    (r'\beh\b',        'e'),
    (r'\bta\b',        'esta'),
    (r'\bfiz\b',       'fiz'),
    (r'\bbolt\b',      'boleto'),
    (r'\bpend\b',      'pendente'),
    (r'\bplano\b',     'plano'),
]


def _expandir_abreviacoes(text: str) -> str:
    result = text
    for pattern, replacement in _ABREVIACOES:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
    return result


# ─── Detecção de intenção ─────────────────────────────────────────────────────

_PATTERNS_MATRICULA = [
    r'\b(matricula|matriculas|plano|situacao|minha situacao|status|venci(mento)?|quando vence|vigencia|ativo|cadastro|meu plano)\b',
    r'\b(ver (minha )?(matricula|situacao|plano))\b',
    r'\b(como (esta|fica) (minha )?(matricula|plano))\b',
]

_PATTERNS_COBRANCA = [
    r'\b(cobranca|mensalidade|debito|devo|boleto|pagar|pagamento|pendente|atrasado|inadimplente|divida|deve)\b',
    r'\b(tenho (alguma )?(cobranca|divida))\b',
    r'\b(quanto (devo|fica|e|custa))\b',
    r'\b(to (devendo|em falta|atrasad))\b',
    r'\b(ta (devendo|atrasad))\b',
    r'\b(tem (alguma )?(cobranca|mensalidade|pendencia))\b',
    r'\b(cade (minha )?(cobranca|mensalidade|fatura))\b',
]

_PATTERNS_PIX = [
    r'\b(pix|chave pix|chave do pix|pagar (no )?pix|chave)\b',
    r'\b(cade (a |o )?(chave|pix))\b',
    r'\b(me (manda|passa|envia) (a |o )?(chave|pix))\b',
    r'\b(quero pagar (no )?pix)\b',
    r'\b(como pagar)\b',
]

_PATTERNS_PAGUEI = [
    r'\b(paguei|ja paguei|efetuei|fiz o pix|realizei|transferi|enviei|mandei)\b',
    r'\b(pix (enviado|feito|realizado|mandado|efetuado))\b',
    r'\b(acabei de pagar|acabei de fazer|acabei de transferir)\b',
    r'\b(fiz (o )?(pagamento|pix|transferencia))\b',
    r'\b(ja (fiz|realizei|efetuei|transferi|paguei))\b',
    r'\b(efetuei (o )?(pagamento|pix|transferencia))\b',
    r'\b(realizei (o )?pagamento)\b',
    r'\b(pagamento (feito|realizado|efetuado|enviado))\b',
]

_PATTERNS_DESISTIR = [
    r'\b(esquece|deixa pra la|deixa pra la|nao vou pagar|nao consigo pagar|nao tenho (como|dinheiro))\b',
    r'\b(vou pagar (depois|amanha|semana que vem|outro dia))\b',
    r'\b(pago (depois|amanha|mais tarde))\b',
    r'\b(sem (condicao|dinheiro) agora)\b',
    r'\b(volta(r)? (para o )?menu)\b',
    r'\b(cancela(r)?|desistir|desisto)\b',
]

_PATTERNS_MENU = [
    r'\b(menu|opcoes|ajuda|help|inicio|voltar|comecar|recomecar)\b',
    r'^(oi|ola|bom dia|boa tarde|boa noite|hey|e ai|eai|ola|hi)[\s!?.]*$',
    r'^[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\s!?.]*$',  # só emojis / pontuação
]

_PATTERNS_ENCERRAR = [
    r'\b(obrigad[ao]|valeu|vlw|ok|tudo certo|entendido|ate|tchau|flw|falou|ate logo|ate mais|xau)\b',
    r'\b(nao preciso|era isso|foi isso|sem mais|pode fechar|encerra|encerrar)\b',
    r'\b(nada mais|nao tem mais|nao quero mais nada)\b',
]

_PATTERNS_SIM = [
    r'^(sim|s|isso|pode|certo|confirmo|ok|yes|positivo|exato|claro|com certeza|quero)[\s!.]*$',
    r'\b(sim|confirmo|isso mesmo|pode ser|ta bom|beleza|tudo bem)\b',
]

_PATTERNS_NAO = [
    r'^(nao|n|negativo|errado|de jeito nenhum)[\s!.]*$',
    r'\b(nao quero|nao preciso|nao e isso)\b',
]

_PATTERNS_RENOVAR = [
    r'\b(renovar|renovacao|quero renovar|renovar matricula|renovar plano)\b',
    r'\b(como renov|preciso renov|quero continuar|quero ficar)\b',
    r'\b(reativar|reativacao|voltar (a treinar|para academia))\b',
]


def detectar_intent(text: str, learned_patterns: list[dict] | None = None) -> str:
    # Normaliza (remove acentos, lowercase) e expande abreviações
    t = _expandir_abreviacoes(_norm(text))

    # Padrões aprendidos pelo admin têm prioridade sobre os hardcoded
    if learned_patterns:
        for p in learned_patterns:
            try:
                frase_norm = _expandir_abreviacoes(_norm(p.get('frase', '')))
                if frase_norm and re.search(re.escape(frase_norm), t):
                    return p.get('intentAlvo', 'desconhecido')
            except Exception:
                pass

    # Prioridade: paguei > desistir > renovar > pix > cobranca > matricula > encerrar > menu > sim/nao
    for p in _PATTERNS_PAGUEI:
        if re.search(p, t):
            return 'paguei'
    for p in _PATTERNS_DESISTIR:
        if re.search(p, t):
            return 'desistir'
    for p in _PATTERNS_RENOVAR:
        if re.search(p, t):
            return 'renovar'
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
    # Menu e saudações verificados por último para não sobrescrever intents mais específicos
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
    dias = _dias_ate(matricula.get('data_vencimento')) if matricula else None
    vencendo = dias is not None and dias <= 7

    linhas = [f'Olá, *{primeiro_nome}*! 💪 O que posso ajudar?\n']
    linhas.append('1️⃣ Minha matrícula')
    linhas.append('2️⃣ Cobranças pendentes')
    if cobrancas:
        linhas.append('3️⃣ Ver chave Pix para pagamento')
        linhas.append('4️⃣ Já fiz o pagamento')
        linhas.append('5️⃣ Quero renovar minha matrícula')
    elif vencendo or not matricula:
        linhas.append('3️⃣ Quero renovar minha matrícula')
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


def _msg_renovar(matricula: dict | None, cobrancas: list[dict], pix_chave: str | None) -> str:
    if cobrancas and pix_chave:
        total = sum(c.get('valor_cents') or 0 for c in cobrancas)
        return (
            f'🔄 *Renovação de Matrícula*\n\n'
            f'Para renovar, pague a mensalidade em aberto via Pix:\n\n'
            f'🔑 *Chave Pix:* `{pix_chave}`\n'
            f'💰 *Valor:* {_fmt_brl(total)}\n\n'
            f'Depois de pagar, *envie a foto do comprovante aqui* 📸 '
            f'que eu já registro pra equipe confirmar! 😊'
        )
    if cobrancas:
        return (
            '🔄 Para renovar sua matrícula, regularize a pendência financeira.\n'
            'Entre em contato com a recepção para efetuar o pagamento.'
        )
    if not matricula:
        return (
            '🔄 Você ainda não possui matrícula cadastrada.\n'
            'Passe pela recepção para se matricular! 😊'
        )
    dias = _dias_ate(matricula.get('data_vencimento'))
    if dias is not None and dias > 7:
        venc = _fmt_data(matricula.get('data_vencimento'))
        return (
            f'✅ Sua matrícula ainda está ativa até *{venc}*.\n\n'
            f'Quando estiver perto do vencimento, entraremos em contato '
            f'com a cobrança de renovação. 😊'
        )
    return (
        '🔄 *Renovação de Matrícula*\n\n'
        'Sua matrícula está próxima do vencimento, mas ainda não há '
        'cobrança gerada.\n\n'
        'Entre em contato com a recepção para solicitar a renovação! 😊'
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


_DESISTIR_COMPROVANTE_VARIACOES = [
    'Sem problema! 😊 Se quiser regularizar depois, é só me chamar por aqui.',
    'Tudo bem! Quando quiser pagar, estou por aqui. 💪',
    'Entendido! Qualquer coisa é só mandar mensagem. 😊',
]


def _msg_nao_entendi(count: int, cobrancas: list | None = None, matricula: dict | None = None) -> str:
    """
    Recuperação em 3 níveis progressivos:
      0 → pede reformulação simples
      1 → menu contextual (só as opções relevantes pro estado do aluno)
      2+ → escalação para atendente com saída fácil pelo menu
    """
    if count == 0:
        return (
            'Hmm, não entendi muito bem essa. 😅\n\n'
            'Pode tentar me dizer de outra forma? '
            'Ou é só digitar *menu* que eu mostro as opções.'
        )

    if count == 1:
        # Menu contextual — só mostra o que faz sentido pro estado atual do aluno
        tem_cobranca = bool(cobrancas)
        tem_matricula = bool(matricula)
        linhas = ['Não consegui entender de novo. 🤔 Vou simplificar:\n']
        if tem_cobranca:
            linhas.append('💳 *Pix* — ver chave para pagar')
            linhas.append('✅ *Paguei* — já fiz o pagamento')
        if tem_matricula:
            linhas.append('📋 *Matrícula* — ver minha situação')
        if not tem_cobranca:
            linhas.append('🔄 *Renovar* — renovar minha matrícula')
        linhas.append('📋 *Cobrança* — ver o que devo')
        linhas.append('\nDigita uma dessas palavras ou o número do menu. 😊')
        return '\n'.join(linhas)

    # count >= 2 → escalação com saída fácil
    return (
        'Parece que estou com dificuldade de te ajudar nesse ponto. 😔\n\n'
        'Vou chamar nossa equipe para te atender diretamente. '
        'Se quiser continuar pelo bot enquanto isso, é só digitar *menu*. 👋'
    )


def _msg_desistir_comprovante() -> str:
    import random
    return random.choice(_DESISTIR_COMPROVANTE_VARIACOES)


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
    learned_patterns: list[dict] | None = None,
    ai_result: dict | None = None,
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
        intent = detectar_intent(text, learned_patterns)

        if intent in ('menu', 'matricula', 'cobranca', 'pix'):
            session['state'] = AcademiaState.MENU.value
            session['confusion_count'] = 0
            return _msg_menu(nome, matricula, cobrancas), session

        if intent in ('encerrar', 'desistir'):
            session['state'] = AcademiaState.MENU.value
            session['confusion_count'] = 0
            return _msg_desistir_comprovante(), session

        # Confirmou que pagou mas sem foto — reforça pedido uma vez
        if intent == 'paguei':
            return _msg_lembrar_envio_foto(), session

        # Qualquer texto não reconhecido: reforça pedido da foto (não conta como confusão)
        return _msg_lembrar_envio_foto(), session

    # ── MENU ───────────────────────────────────────────────────────────────────
    if state == AcademiaState.MENU.value:
        intent = detectar_intent(text, learned_patterns)
        text_norm = _norm(text)

        # Atalhos numéricos — aceita "1", "1.", "1)", "01", "opcao 1", "opção 1"
        _num_match = re.match(r'^(?:op[çc][aã]o\s*)?0?([1-5])[.):]?\s*$', text_norm)
        if _num_match:
            num = int(_num_match.group(1))
            if num == 1:
                intent = 'matricula'
            elif num == 2:
                intent = 'cobranca'
            elif num == 3:
                intent = 'pix' if cobrancas else 'renovar'
            elif num == 4:
                intent = 'paguei' if cobrancas else 'renovar'
            elif num == 5:
                intent = 'renovar'

        session['state'] = AcademiaState.MENU.value  # permanece no menu por padrão

        if intent == 'matricula':
            session['confusion_count'] = 0
            return _msg_matricula(matricula), session

        if intent == 'cobranca':
            session['confusion_count'] = 0
            return _msg_cobrancas(cobrancas, pix_chave), session

        if intent == 'pix':
            session['confusion_count'] = 0
            if pix_chave and cobrancas:
                session['state'] = AcademiaState.AGUARD_COMPROVANTE.value
            return _msg_pix(pix_chave, cobrancas), session

        if intent == 'paguei':
            session['confusion_count'] = 0
            if not cobrancas:
                return _msg_pedir_comprovante([]), session
            session['state'] = AcademiaState.AGUARD_COMPROVANTE.value
            return _msg_pedir_comprovante(cobrancas), session

        if intent == 'renovar':
            session['confusion_count'] = 0
            if cobrancas and pix_chave:
                session['state'] = AcademiaState.AGUARD_COMPROVANTE.value
            return _msg_renovar(matricula, cobrancas, pix_chave), session

        if intent == 'encerrar':
            session['confusion_count'] = 0
            session['state'] = AcademiaState.FINALIZADO.value
            return _msg_encerrar(nome), session

        if intent in ('menu', 'sim'):
            session['confusion_count'] = 0
            return _msg_menu(nome, matricula, cobrancas), session

        # Regex não reconheceu — tenta fallback de IA antes de contar confusão
        if intent == 'desconhecido' and ai_result:
            ai_intent = str(ai_result.get('intent') or 'desconhecido')
            if ai_intent != 'desconhecido':
                # IA classificou: redireciona para o mesmo bloco de intents acima
                # (chamada recursiva enxuta — sem risco de loop, pois ai_result=None)
                return process_academia_message(
                    text=ai_intent,          # texto sintético que casa com o padrão numérico
                    session=session,
                    aluno=aluno,
                    matricula=matricula,
                    cobrancas=cobrancas,
                    pix_chave=pix_chave,
                    tenant_config=tenant_config,
                    imagem_recebida=False,
                    learned_patterns=None,
                    ai_result=None,          # evita loop
                )
            resposta_livre = (ai_result.get('resposta') or '').strip()
            if resposta_livre:
                # IA respondeu livremente (ex.: pergunta geral sobre a academia)
                session['confusion_count'] = 0
                return resposta_livre, session

        # Nenhuma estratégia funcionou — incrementa contador de confusão
        count = session.get('confusion_count', 0) + 1
        session['confusion_count'] = count
        return _msg_nao_entendi(count - 1, cobrancas=cobrancas, matricula=matricula), session

    # ── FINALIZADO ─────────────────────────────────────────────────────────────
    if state == AcademiaState.FINALIZADO.value:
        # Se o aluno mandar mais alguma coisa, reabre o menu
        session['state'] = AcademiaState.MENU.value
        return _msg_menu(nome, matricula, cobrancas), session

    # Fallback de segurança
    session['state'] = AcademiaState.MENU.value
    return _msg_menu(nome, matricula, cobrancas), session

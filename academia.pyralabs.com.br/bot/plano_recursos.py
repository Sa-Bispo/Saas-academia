"""
O que o bot pode fazer em cada plano de academia (2026-11-15).

Os códigos batem com a tabela `plans` (migration 20261115000000 do dashboard) e com
`src/lib/planos-academia.ts`. Plano desconhecido ou antigo (academia_basico,
academia_pro, delivery...) recebe o comportamento de sempre — assim nenhum cliente
que já usa o sistema muda de comportamento por causa disto.
"""
from __future__ import annotations

import re

PADRAO = {'bot': True, 'atendimento_livre': True, 'cobranca_automatica': True}

PLANOS: dict[str, dict[str, bool]] = {
    # Gestão: sem WhatsApp. A cobrança é assistida (o dono manda do próprio celular).
    'academia_gestao': {'bot': False, 'atendimento_livre': False, 'cobranca_automatica': False},
    # Cobrança: o bot só cuida do pagamento; o resto fica pro humano no celular.
    'academia_cobranca': {'bot': True, 'atendimento_livre': False, 'cobranca_automatica': True},
    # Completo: tudo, inclusive responder dúvidas 24h.
    'academia_completo': {'bot': True, 'atendimento_livre': True, 'cobranca_automatica': True},
}

# Intenções que contam como "assunto de pagamento" no plano Cobrança
INTENTS_COBRANCA = {'pix', 'dinheiro', 'paguei', 'cobranca', 'renovar', 'matricula', 'optout'}

_OPCAO_NUMERICA = re.compile(r'^\s*(?:op[çc][aã]o\s*)?0?[1-5][.):]?\s*$', re.IGNORECASE)


def recursos_do_plano(plano_code: str | None) -> dict[str, bool]:
    return PLANOS.get((plano_code or '').strip(), PADRAO)


def responde_no_plano_cobranca(
    *,
    intent: str,
    texto: str,
    estado: str,
    imagem_recebida: bool,
    aluno_identificado: bool,
) -> bool:
    """No plano Cobrança o bot só entra em conversa de pagamento de aluno cadastrado.
    Qualquer outra coisa ("oi", dúvida, número desconhecido) fica sem resposta automática
    pra que a equipe responda pelo WhatsApp da academia."""
    if not aluno_identificado:
        return False
    if imagem_recebida:  # possível comprovante
        return True
    if estado in ('aguard_comprovante',):
        return True
    if intent in INTENTS_COBRANCA:
        return True
    # escolha numérica do menu que o próprio bot mandou
    if estado == 'menu' and _OPCAO_NUMERICA.match(texto or ''):
        return True
    return False

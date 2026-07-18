"""
script_responses.py — Respostas de script parametrizadas por tenant (academia).
Cada função monta a resposta usando dados da config, economizando tokens.
"""

import random


def resposta_saudacao(tenant_config: dict) -> str:
    """Retorna boas-vindas curtas e variáveis."""
    nome = tenant_config.get("nome_negocio", "nossa academia")

    opcoes = [
        f"Olá! 💪 Aqui é o assistente da *{nome}*. Identificando seu cadastro...",
        f"Oi! Bem-vindo à *{nome}* 🏋️ Um segundinho que já te atendo!",
    ]
    return random.choice(opcoes)


def resposta_horario(tenant_config: dict) -> str:
    """Retorna horários de funcionamento formatados."""
    nome = tenant_config.get("nome_negocio", "nossa academia")
    turnos = tenant_config.get("horarios", [])

    if not turnos:
        return (
            f"🕐 Horário de funcionamento do {nome} ainda não foi configurado.\n"
            f"Entre em contato para mais informações!"
        )

    dias_map = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    linhas = [f"🕐 *Horários do {nome}:*\n"]

    for turno in turnos:
        if not turno.get("ativo", True):
            continue

        dias_nums = turno.get("dias", [])
        dias = [dias_map[d % 7] for d in dias_nums if 0 <= d < 7]
        dias_str = ", ".join(dias) if dias else "Não configurado"

        abertura = turno.get("abertura", "00:00")
        fechamento = turno.get("fechamento", "00:00")
        nome_turno = turno.get("nome", "Funcionamento")

        linhas.append(f"*{nome_turno}*: {dias_str}")
        linhas.append(f"⏰ {abertura} às {fechamento}\n")

    return "".join(linhas).strip()


def resposta_fora_horario(tenant_config: dict) -> str:
    """Resposta quando está fora do horário."""
    nome = tenant_config.get("nome_negocio", "nossa academia")
    turnos = tenant_config.get("horarios", [])
    proximo = ""

    if turnos:
        primeiro = next((t for t in turnos if t.get("ativo", True)), None)
        if primeiro:
            abertura = primeiro.get("abertura", "")
            if abertura:
                proximo = f" Voltamos às *{abertura}*."

    return (
        f"😴 Estamos fechados no momento.{proximo}\n\n"
        f"Pode mandar sua mensagem que respondemos assim que abrirmos! ✉️"
    )

"""
Simulador de confusão do bot — para testar o painel admin em tempo real.
Uso: python simular_confusao.py
"""
import asyncio
import json
from datetime import datetime

DB_URI = "postgresql://postgres:postgres@localhost:5432/postgres"
REDIS_URI = "redis://localhost:6379/6"
CHANNEL  = "admin:notifications"

MENSAGENS_FAKE = [
    {"role": "bot",  "text": "Oi! Sou o assistente da academia. Como posso te ajudar?", "ts": "2026-06-21T13:00:00"},
    {"role": "user", "text": "oi",                                                         "ts": "2026-06-21T13:00:05"},
    {"role": "bot",  "text": "Olá! Escolha uma opção:\n1. Matrícula\n2. Pagamento\n3. Planos", "ts": "2026-06-21T13:00:06"},
    {"role": "user", "text": "preciso falar sobre minha situacao la",                     "ts": "2026-06-21T13:00:20"},
    {"role": "bot",  "text": "Hmm, não consegui entender. Pode escolher uma das opções?", "ts": "2026-06-21T13:00:21"},
    {"role": "user", "text": "e ai nao vou mais nao mas quero saber do meu negocio",      "ts": "2026-06-21T13:00:35"},
    {"role": "bot",  "text": "Não entendi desta vez! Tente: 1, 2 ou 3.",                 "ts": "2026-06-21T13:00:36"},
    {"role": "user", "text": "cara to tentando cancelar minha academia",                  "ts": "2026-06-21T13:00:50"},
    {"role": "bot",  "text": "Opa, essa eu não peguei bem! Vou chamar um atendente.",    "ts": "2026-06-21T13:00:51"},
]

TEXTO_PROBLEMA = "cara to tentando cancelar minha academia"


async def criar_tabelas_se_nao_existir(conn):
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS bot_confusion_events (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id     uuid,
            nicho         varchar(50) NOT NULL,
            phone         varchar(50),
            messages_json jsonb        NOT NULL DEFAULT '[]',
            texto_problema text        NOT NULL,
            status        varchar(20)  NOT NULL DEFAULT 'pendente',
            created_at    timestamptz  NOT NULL DEFAULT now(),
            resolved_at   timestamptz
        )
    """)


async def main():
    import asyncpg
    import redis.asyncio as aioredis

    print("Conectando ao banco...")
    conn = await asyncpg.connect(DB_URI)

    print("Garantindo tabela bot_confusion_events...")
    await criar_tabelas_se_nao_existir(conn)

    print("Inserindo evento de confusão falso...")
    row = await conn.fetchrow("""
        INSERT INTO bot_confusion_events
            (tenant_id, nicho, phone, messages_json, texto_problema, status, created_at)
        VALUES (NULL, 'academia', '5511999990000', $1::jsonb, $2, 'pendente', NOW())
        RETURNING id
    """,
        json.dumps(MENSAGENS_FAKE, ensure_ascii=False),
        TEXTO_PROBLEMA,
    )
    event_id = str(row["id"])
    await conn.close()
    print(f"  Evento criado: {event_id}")

    print("Publicando notificação no Redis...")
    r = aioredis.from_url(REDIS_URI, decode_responses=True)
    payload = json.dumps({
        "type":      "confusion_event",
        "event_id":  event_id,
        "nicho":     "academia",
        "tenant_id": "",
        "ts":        datetime.now().isoformat(),
    }, ensure_ascii=False)
    await r.publish(CHANNEL, payload)
    await r.aclose()

    print()
    print("Simulacao concluida!")
    print(f"  event_id : {event_id}")
    print(f"  Mensagem : \"{TEXTO_PROBLEMA}\"")
    print()
    print("Olha o painel admin agora — o toast deve ter aparecido!")


asyncio.run(main())

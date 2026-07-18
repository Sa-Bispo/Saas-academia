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
);

INSERT INTO bot_confusion_events (nicho, phone, messages_json, texto_problema, status)
VALUES (
  'academia',
  '5511999990000',
  '[{"role":"bot","text":"Oi! Como posso te ajudar?","ts":"2026-06-21T13:00:00"},{"role":"user","text":"oi","ts":"2026-06-21T13:00:05"},{"role":"bot","text":"Escolha: 1. Matricula  2. Pagamento  3. Planos","ts":"2026-06-21T13:00:06"},{"role":"user","text":"preciso falar sobre minha situacao la","ts":"2026-06-21T13:00:20"},{"role":"bot","text":"Nao entendi. Pode escolher uma das opcoes?","ts":"2026-06-21T13:00:21"},{"role":"user","text":"cara to tentando cancelar minha academia","ts":"2026-06-21T13:00:50"},{"role":"bot","text":"Opa, essa eu nao peguei bem! Vou chamar um atendente.","ts":"2026-06-21T13:00:51"}]',
  'cara to tentando cancelar minha academia',
  'pendente'
) RETURNING id;

-- Planos da landing (2026-11-15): Gestão, Cobrança e Completo.
-- Migration SÓ DE DADOS: só insere. Não altera nem remove os planos
-- "academia_basico"/"academia_pro" nem nenhuma assinatura existente
-- (a Academia Elite Club continua no academia_pro até o admin trocar).
INSERT INTO "plans" ("id", "code", "niche", "name", "price_cents", "reports_enabled", "reminders_enabled", "human_handoff_enabled", "rag_enabled")
VALUES
  (gen_random_uuid(), 'academia_gestao',   'ACADEMIA', 'Gestão',   8990,  true, false, false, false),
  (gen_random_uuid(), 'academia_cobranca', 'ACADEMIA', 'Cobrança', 15990, true, true,  false, false),
  (gen_random_uuid(), 'academia_completo', 'ACADEMIA', 'Completo', 24990, true, true,  true,  true)
ON CONFLICT ("code") DO NOTHING;

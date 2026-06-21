-- Bot Feedback System: tabelas de eventos de confusão e padrões aprendidos

CREATE TABLE "bot_confusion_events" (
    "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"      UUID,
    "nicho"          VARCHAR(50) NOT NULL,
    "phone"          VARCHAR(50),
    "messages_json"  JSONB       NOT NULL DEFAULT '[]',
    "texto_problema" TEXT        NOT NULL,
    "status"         VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at"    TIMESTAMP(3),

    CONSTRAINT "bot_confusion_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bot_confusion_events_tenant_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL
);

CREATE INDEX "bot_confusion_events_status_idx"      ON "bot_confusion_events"("status");
CREATE INDEX "bot_confusion_events_created_at_idx"  ON "bot_confusion_events"("created_at" DESC);
CREATE INDEX "bot_confusion_events_tenant_id_idx"   ON "bot_confusion_events"("tenant_id");

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "bot_learned_patterns" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "nicho"       VARCHAR(50)  NOT NULL,
    "frase"       TEXT         NOT NULL,
    "intent_alvo" VARCHAR(50)  NOT NULL,
    "evento_id"   UUID,
    "ativo"       BOOLEAN      NOT NULL DEFAULT TRUE,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_learned_patterns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bot_learned_patterns_evento_fkey"
        FOREIGN KEY ("evento_id") REFERENCES "bot_confusion_events"("id") ON DELETE SET NULL
);

CREATE INDEX "bot_learned_patterns_nicho_ativo_idx" ON "bot_learned_patterns"("nicho", "ativo");
CREATE INDEX "bot_learned_patterns_created_at_idx"  ON "bot_learned_patterns"("created_at" DESC);

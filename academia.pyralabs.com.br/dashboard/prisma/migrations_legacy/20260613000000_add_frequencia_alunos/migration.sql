-- CreateTable: frequencia_alunos
-- Registra cada check-in/presença de um aluno na academia
CREATE TABLE "frequencia_alunos" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"   UUID         NOT NULL,
    "aluno_id"    UUID         NOT NULL,
    "data"        DATE         NOT NULL,
    "hora_entrada" TIME,
    "hora_saida"  TIME,
    "observacoes" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frequencia_alunos_pkey" PRIMARY KEY ("id")
);

-- Unique: um aluno não pode dar check-in duas vezes no mesmo dia
CREATE UNIQUE INDEX "frequencia_alunos_aluno_data_idx" ON "frequencia_alunos"("aluno_id", "data");

-- Índices para queries comuns
CREATE INDEX "frequencia_alunos_tenant_id_idx"   ON "frequencia_alunos"("tenant_id");
CREATE INDEX "frequencia_alunos_aluno_id_idx"    ON "frequencia_alunos"("aluno_id");
CREATE INDEX "frequencia_alunos_tenant_data_idx" ON "frequencia_alunos"("tenant_id", "data");

-- ForeignKeys
ALTER TABLE "frequencia_alunos"
    ADD CONSTRAINT "frequencia_alunos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "frequencia_alunos"
    ADD CONSTRAINT "frequencia_alunos_aluno_id_fkey"
    FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

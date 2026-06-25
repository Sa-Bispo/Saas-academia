-- AlterEnum: adicionar SEM_MATRICULA
ALTER TYPE "AlunoStatus" ADD VALUE IF NOT EXISTS 'SEM_MATRICULA';

-- AlterTable: adicionar precisa_liberacao_medica em alunos
ALTER TABLE "alunos" ADD COLUMN IF NOT EXISTS "precisa_liberacao_medica" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: parq_perguntas
CREATE TABLE IF NOT EXISTS "parq_perguntas" (
    "id" SERIAL PRIMARY KEY,
    "ordem" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: fichas_parq
CREATE TABLE IF NOT EXISTS "fichas_parq" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "respostas" JSONB NOT NULL,
    "precisa_liberacao_medica" BOOLEAN NOT NULL DEFAULT false,
    "assinatura_url" TEXT,
    "termo_hash" VARCHAR(64) NOT NULL,
    "assinante_nome" VARCHAR(120) NOT NULL,
    "assinante_cpf" VARCHAR(14) NOT NULL,
    "ip" VARCHAR(50),
    "user_agent" TEXT,
    "consentimento_lgpd" BOOLEAN NOT NULL DEFAULT false,
    "assinado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fichas_parq_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "fichas_parq" ADD CONSTRAINT "fichas_parq_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fichas_parq" ADD CONSTRAINT "fichas_parq_aluno_id_fkey"
    FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "fichas_parq_tenant_id_idx" ON "fichas_parq"("tenant_id");
CREATE INDEX IF NOT EXISTS "fichas_parq_aluno_id_idx" ON "fichas_parq"("aluno_id");

-- Add missing AGUARDANDO_VALIDACAO value to CobrancaStatus enum
ALTER TYPE "CobrancaStatus" ADD VALUE IF NOT EXISTS 'AGUARDANDO_VALIDACAO' AFTER 'PENDENTE';

-- Add missing columns to cobrancas_alunos
ALTER TABLE "cobrancas_alunos"
  ADD COLUMN IF NOT EXISTS "comprovante_url"       TEXT,
  ADD COLUMN IF NOT EXISTS "comprovante_enviado_em" TIMESTAMP(3);

-- Change hora_entrada / hora_saida from TIME to VARCHAR(5) in frequencia_alunos
-- (schema.prisma declares them as String @db.VarChar(5), migrations created as TIME)
ALTER TABLE "frequencia_alunos"
  ALTER COLUMN "hora_entrada" TYPE VARCHAR(5) USING TO_CHAR("hora_entrada", 'HH24:MI'),
  ALTER COLUMN "hora_saida"   TYPE VARCHAR(5) USING TO_CHAR("hora_saida",   'HH24:MI');

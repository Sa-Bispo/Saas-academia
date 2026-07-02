-- Distingue perguntas médicas (Sim/Não) de blocos informativos (regulamento,
-- horário de funcionamento etc.) que hoje ficam misturados na mesma lista e
-- eram tratados incorretamente como perguntas Sim/Não no formulário público.
DO $$ BEGIN
  CREATE TYPE "ParqPerguntaTipo" AS ENUM ('PERGUNTA', 'INFORMATIVO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE parq_perguntas
  ADD COLUMN IF NOT EXISTS tipo "ParqPerguntaTipo" NOT NULL DEFAULT 'PERGUNTA';

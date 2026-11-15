-- Distingue perguntas médicas (Sim/Não) de blocos informativos (regulamento,
-- horário de funcionamento etc.) que hoje ficam misturados na mesma lista e
-- eram tratados incorretamente como perguntas Sim/Não no formulário público.
--
-- O enum "ParqItemTipo" e a coluna parq_perguntas.tipo já existiam em
-- produção (criados manualmente, fora de qualquer migration versionada) —
-- este arquivo apenas alinha schema.prisma/ambientes novos a esse estado.
DO $$ BEGIN
  CREATE TYPE "ParqItemTipo" AS ENUM ('PERGUNTA', 'TEXTO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE parq_perguntas
  ADD COLUMN IF NOT EXISTS tipo "ParqItemTipo" NOT NULL DEFAULT 'PERGUNTA';

-- Remove um esqueleto de "páginas/seções" que foi criado direto no banco de
-- produção em algum momento, nunca versionado em migration e nunca lido pelo
-- app (apenas 2 páginas / 2 seções, sem código que as consulte).
ALTER TABLE parq_perguntas DROP COLUMN IF EXISTS secao_id;
DROP TABLE IF EXISTS parq_secoes;
DROP TABLE IF EXISTS parq_paginas;

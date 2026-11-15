-- AddEnum: AlunoStatus
CREATE TYPE "AlunoStatus" AS ENUM ('ATIVO', 'INADIMPLENTE', 'INATIVO', 'SUSPENSO');

-- AddEnum: MatriculaStatus
CREATE TYPE "MatriculaStatus" AS ENUM ('ATIVA', 'VENCIDA', 'CANCELADA');

-- AddEnum: CobrancaStatus
CREATE TYPE "CobrancaStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADA');

-- AddEnum: Periodicidade
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateTable: alunos
CREATE TABLE "alunos" (
    "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"        UUID         NOT NULL,
    "nome"             VARCHAR(120) NOT NULL,
    "telefone"         VARCHAR(30)  NOT NULL,
    "email"            VARCHAR(255),
    "cpf"              VARCHAR(14),
    "data_nascimento"  TIMESTAMP(3),
    "observacoes"      TEXT,
    "status"           "AlunoStatus" NOT NULL DEFAULT 'ATIVO',
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: planos_academia
CREATE TABLE "planos_academia" (
    "id"            UUID           NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"     UUID           NOT NULL,
    "nome"          VARCHAR(120)   NOT NULL,
    "descricao"     TEXT,
    "valor_cents"   INTEGER        NOT NULL,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "ativo"         BOOLEAN        NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3)   NOT NULL,

    CONSTRAINT "planos_academia_pkey" PRIMARY KEY ("id")
);

-- CreateTable: matriculas_alunos
CREATE TABLE "matriculas_alunos" (
    "id"             UUID             NOT NULL DEFAULT gen_random_uuid(),
    "aluno_id"       UUID             NOT NULL,
    "plano_id"       UUID             NOT NULL,
    "tenant_id"      UUID             NOT NULL,
    "data_inicio"    TIMESTAMP(3)     NOT NULL,
    "data_vencimento" TIMESTAMP(3)    NOT NULL,
    "status"         "MatriculaStatus" NOT NULL DEFAULT 'ATIVA',
    "observacoes"    TEXT,
    "created_at"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "matriculas_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cobrancas_alunos
CREATE TABLE "cobrancas_alunos" (
    "id"               UUID            NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id"        UUID            NOT NULL,
    "aluno_id"         UUID            NOT NULL,
    "matricula_id"     UUID,
    "valor_cents"      INTEGER         NOT NULL,
    "data_vencimento"  TIMESTAMP(3)    NOT NULL,
    "data_pagamento"   TIMESTAMP(3),
    "status"           "CobrancaStatus" NOT NULL DEFAULT 'PENDENTE',
    "descricao"        VARCHAR(255),
    "pix_chave"        VARCHAR(120),
    "observacoes"      TEXT,
    "enviada_whatsapp" BOOLEAN         NOT NULL DEFAULT false,
    "created_at"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)    NOT NULL,

    CONSTRAINT "cobrancas_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alunos_tenant_id_idx"        ON "alunos"("tenant_id");
CREATE INDEX "alunos_tenant_id_status_idx"  ON "alunos"("tenant_id", "status");

CREATE INDEX "planos_academia_tenant_id_idx" ON "planos_academia"("tenant_id");

CREATE INDEX "matriculas_alunos_aluno_id_idx"          ON "matriculas_alunos"("aluno_id");
CREATE INDEX "matriculas_alunos_tenant_id_idx"         ON "matriculas_alunos"("tenant_id");
CREATE INDEX "matriculas_alunos_tenant_id_vencimento_idx" ON "matriculas_alunos"("tenant_id", "data_vencimento");

CREATE INDEX "cobrancas_alunos_tenant_id_idx"          ON "cobrancas_alunos"("tenant_id");
CREATE INDEX "cobrancas_alunos_aluno_id_idx"           ON "cobrancas_alunos"("aluno_id");
CREATE INDEX "cobrancas_alunos_tenant_id_status_idx"   ON "cobrancas_alunos"("tenant_id", "status");
CREATE INDEX "cobrancas_alunos_tenant_id_vencimento_idx" ON "cobrancas_alunos"("tenant_id", "data_vencimento");

-- AddForeignKey
ALTER TABLE "alunos"
    ADD CONSTRAINT "alunos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "planos_academia"
    ADD CONSTRAINT "planos_academia_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matriculas_alunos"
    ADD CONSTRAINT "matriculas_alunos_aluno_id_fkey"
    FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "matriculas_alunos"
    ADD CONSTRAINT "matriculas_alunos_plano_id_fkey"
    FOREIGN KEY ("plano_id") REFERENCES "planos_academia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "matriculas_alunos"
    ADD CONSTRAINT "matriculas_alunos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cobrancas_alunos"
    ADD CONSTRAINT "cobrancas_alunos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cobrancas_alunos"
    ADD CONSTRAINT "cobrancas_alunos_aluno_id_fkey"
    FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cobrancas_alunos"
    ADD CONSTRAINT "cobrancas_alunos_matricula_id_fkey"
    FOREIGN KEY ("matricula_id") REFERENCES "matriculas_alunos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

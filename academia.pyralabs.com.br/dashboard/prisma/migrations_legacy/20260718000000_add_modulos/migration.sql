-- CreateTable: modulos (catálogo de módulos da plataforma)
CREATE TABLE IF NOT EXISTS "modulos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chave" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: chave única
CREATE UNIQUE INDEX IF NOT EXISTS "modulos_chave_key" ON "modulos"("chave");

-- CreateTable: tenant_modulos (estado de cada módulo por tenant)
CREATE TABLE IF NOT EXISTS "tenant_modulos" (
    "tenant_id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tenant_modulos_pkey" PRIMARY KEY ("tenant_id","modulo_id")
);

-- AddForeignKey
ALTER TABLE "tenant_modulos" ADD CONSTRAINT "tenant_modulos_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modulos" ADD CONSTRAINT "tenant_modulos_modulo_id_fkey"
    FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: catálogo de módulos
INSERT INTO "modulos" ("id", "chave", "nome", "descricao", "ordem") VALUES
    (gen_random_uuid(), 'alunos',      'Alunos',      'Cadastro e ficha do aluno',           1),
    (gen_random_uuid(), 'documentos',  'Documentos',  'PAR-Q, termos e assinatura digital',  2),
    (gen_random_uuid(), 'financeiro',  'Financeiro',  'Mensalidades, baixas, inadimplência', 3),
    (gen_random_uuid(), 'frequencia',  'Frequência',  'Check-in e presença',                 4),
    (gen_random_uuid(), 'treinos',     'Treinos',     'Fichas e prescrição',                 5),
    (gen_random_uuid(), 'comunicacao', 'Comunicação', 'WhatsApp e avisos',                   6),
    (gen_random_uuid(), 'relatorios',  'Relatórios',  'Dashboard e métricas',                7)
ON CONFLICT ("chave") DO NOTHING;

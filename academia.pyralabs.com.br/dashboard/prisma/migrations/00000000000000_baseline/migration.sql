-- Baseline (2026-11-15): schema completo gerado com
--   prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script
-- Produção foi criada via db push e não tinha _prisma_migrations; lá esta migration
-- é só marcada como aplicada (migrate resolve --applied), nunca executada.
-- Histórico anterior: prisma/migrations_legacy/ (não é mais usado pelo Prisma).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Niche" AS ENUM ('DELIVERY', 'CLINICA', 'EMPRESA', 'ACADEMIA');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NOVO', 'PREPARANDO', 'ENVIADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AlunoStatus" AS ENUM ('ATIVO', 'INADIMPLENTE', 'INATIVO', 'SUSPENSO', 'SEM_MATRICULA');

-- CreateEnum
CREATE TYPE "MatriculaStatus" AS ENUM ('ATIVA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "CobrancaStatus" AS ENUM ('PENDENTE', 'AGUARDANDO_VALIDACAO', 'PAGO', 'VENCIDO', 'CANCELADA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX');

-- CreateEnum
CREATE TYPE "ParqItemTipo" AS ENUM ('PERGUNTA', 'TEXTO');

-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "plano" VARCHAR(20) NOT NULL DEFAULT 'pro',
    "promptIa" TEXT,
    "whatsappAdmin" VARCHAR(30),
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "evolutionInstanceName" VARCHAR(120),
    "evolutionApiKey" TEXT,
    "whatsappStatus" VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED',
    "botName" VARCHAR(80),
    "companyName" VARCHAR(120),
    "logo_url" TEXT,
    "parq_code" VARCHAR(16),
    "toneOfVoice" VARCHAR(40),
    "strictRules" TEXT,
    "botObjective" VARCHAR(40),
    "operationContext" TEXT,
    "config_nicho" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(60) NOT NULL,
    "niche" "Niche" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "max_messages_month" INTEGER NOT NULL DEFAULT -1,
    "max_products" INTEGER NOT NULL DEFAULT -1,
    "max_appointments_month" INTEGER NOT NULL DEFAULT -1,
    "max_professionals" INTEGER NOT NULL DEFAULT -1,
    "max_contacts_month" INTEGER NOT NULL DEFAULT -1,
    "max_documents" INTEGER NOT NULL DEFAULT -1,
    "menu_reader_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reports_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rag_enabled" BOOLEAN NOT NULL DEFAULT false,
    "human_handoff_enabled" BOOLEAN NOT NULL DEFAULT false,
    "reminders_enabled" BOOLEAN NOT NULL DEFAULT false,
    "cancellation_enabled" BOOLEAN NOT NULL DEFAULT false,
    "multi_professional" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "mp_payment_id" VARCHAR(80),
    "mp_preapproval_id" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "appointments" INTEGER NOT NULL DEFAULT 0,
    "tickets" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "variacao" VARCHAR(120),
    "preco" DECIMAL(10,2) NOT NULL,
    "tem_variacoes" BOOLEAN NOT NULL DEFAULT false,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "tenant_id" UUID NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_variacoes" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "sigla" VARCHAR(12),
    "preco" DOUBLE PRECISION NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_variacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_adicionais" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "preco_extra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_adicionais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_cardapio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_cardapio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chamados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "titulo" VARCHAR(160) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ABERTO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chamados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_chamado" (
    "id" UUID NOT NULL,
    "chamado_id" UUID NOT NULL,
    "autor" VARCHAR(20) NOT NULL,
    "texto" TEXT,
    "imagem_url" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_chamado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "descricao" TEXT,
    "preco" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "itens" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pizza_tamanhos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sigla" VARCHAR(6) NOT NULL,
    "nome" VARCHAR(40) NOT NULL,
    "fatias" INTEGER NOT NULL,
    "modificador_preco" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pizza_tamanhos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pizza_bordas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "preco_extra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pizza_bordas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bebidas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bebidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "order_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(160) NOT NULL,
    "categoria" VARCHAR(120) NOT NULL,
    "preco_base" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "classe_negocio" VARCHAR(50) NOT NULL,
    "config_nicho" JSONB NOT NULL DEFAULT '{}',
    "regras_ia" TEXT,
    "tenant_id" UUID NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "telefone" VARCHAR(30) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "endereco" VARCHAR(255) NOT NULL,
    "tenant_id" UUID NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NOVO',
    "total" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" VARCHAR(40) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoboys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "fixo_diario" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "turno_inicio" TEXT,
    "turno_fim" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motoboys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas_entrega" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#1D9E75',
    "taxa" DOUBLE PRECISION NOT NULL,
    "bairros" TEXT[],
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zonas_entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "motoboy_id" UUID NOT NULL,
    "zona_id" UUID,
    "taxa" DOUBLE PRECISION NOT NULL,
    "fixo_incluido" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "pago_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "nome_produto" VARCHAR(160) NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "client_name" VARCHAR(120) NOT NULL,
    "client_phone" VARCHAR(30) NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "professional" VARCHAR(120) NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "confirmed_by_bot" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "telefone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "cpf" VARCHAR(14),
    "data_nascimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "status" "AlunoStatus" NOT NULL DEFAULT 'ATIVO',
    "precisa_liberacao_medica" BOOLEAN NOT NULL DEFAULT false,
    "optout_cobranca" BOOLEAN NOT NULL DEFAULT false,
    "optout_cobranca_at" TIMESTAMP(3),
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planos_academia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" TEXT,
    "valor_cents" INTEGER NOT NULL,
    "valor_cents_dinheiro" INTEGER,
    "valor_cents_pix" INTEGER,
    "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_academia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas_alunos" (
    "id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "plano_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "status" "MatriculaStatus" NOT NULL DEFAULT 'ATIVA',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matriculas_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequencia_alunos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "hora_entrada" VARCHAR(5),
    "hora_saida" VARCHAR(5),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frequencia_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobrancas_alunos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "matricula_id" UUID,
    "valor_cents" INTEGER NOT NULL,
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "status" "CobrancaStatus" NOT NULL DEFAULT 'PENDENTE',
    "descricao" VARCHAR(255),
    "pix_chave" VARCHAR(120),
    "observacoes" TEXT,
    "enviada_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "comprovante_url" TEXT,
    "comprovante_enviado_em" TIMESTAMP(3),
    "forma_pagamento" "FormaPagamento",
    "confirmado_por_funcionario_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobrancas_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_confusion_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "nicho" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(50),
    "messages_json" JSONB NOT NULL DEFAULT '[]',
    "texto_problema" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "bot_confusion_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_learned_patterns" (
    "id" UUID NOT NULL,
    "nicho" VARCHAR(50) NOT NULL,
    "frase" TEXT NOT NULL,
    "intent_alvo" VARCHAR(50) NOT NULL,
    "evento_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_learned_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parq_perguntas" (
    "id" SERIAL NOT NULL,
    "tenant_id" UUID,
    "ordem" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "tipo" "ParqItemTipo" NOT NULL DEFAULT 'PERGUNTA',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parq_perguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichas_parq" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "aluno_id" UUID NOT NULL,
    "respostas" JSONB NOT NULL,
    "precisa_liberacao_medica" BOOLEAN NOT NULL DEFAULT false,
    "assinatura_url" TEXT,
    "assinatura_base64" TEXT,
    "termo_hash" VARCHAR(64) NOT NULL,
    "assinante_nome" VARCHAR(120) NOT NULL,
    "assinante_cpf" VARCHAR(14) NOT NULL,
    "ip" VARCHAR(50),
    "user_agent" TEXT,
    "consentimento_lgpd" BOOLEAN NOT NULL DEFAULT false,
    "arquivado" BOOLEAN NOT NULL DEFAULT false,
    "assinado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichas_parq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funcionarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "telefone" VARCHAR(30) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_pagamento" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cobranca_id" UUID NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "usado_em" TIMESTAMP(3),
    "funcionario_id" UUID,

    CONSTRAINT "codigos_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modulos" (
    "id" UUID NOT NULL,
    "chave" VARCHAR(40) NOT NULL,
    "nome" VARCHAR(80) NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_modulos" (
    "tenant_id" UUID NOT NULL,
    "modulo_id" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tenant_modulos_pkey" PRIMARY KEY ("tenant_id","modulo_id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "niche" VARCHAR(60) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_evolutionInstanceName_key" ON "tenants"("evolutionInstanceName");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_parq_code_key" ON "tenants"("parq_code");

-- CreateIndex
CREATE INDEX "tenants_user_id_idx" ON "tenants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenant_id_key" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_tenant_id_period_key" ON "usage_records"("tenant_id", "period");

-- CreateIndex
CREATE INDEX "stock_items_tenant_id_idx" ON "stock_items"("tenant_id");

-- CreateIndex
CREATE INDEX "item_variacoes_item_id_idx" ON "item_variacoes"("item_id");

-- CreateIndex
CREATE INDEX "item_adicionais_item_id_idx" ON "item_adicionais"("item_id");

-- CreateIndex
CREATE INDEX "categorias_cardapio_tenant_id_idx" ON "categorias_cardapio"("tenant_id");

-- CreateIndex
CREATE INDEX "chamados_tenant_id_idx" ON "chamados"("tenant_id");

-- CreateIndex
CREATE INDEX "chamados_status_idx" ON "chamados"("status");

-- CreateIndex
CREATE INDEX "mensagens_chamado_chamado_id_idx" ON "mensagens_chamado"("chamado_id");

-- CreateIndex
CREATE INDEX "mensagens_chamado_autor_lida_idx" ON "mensagens_chamado"("autor", "lida");

-- CreateIndex
CREATE INDEX "combos_tenant_id_idx" ON "combos"("tenant_id");

-- CreateIndex
CREATE INDEX "pizza_tamanhos_tenant_id_idx" ON "pizza_tamanhos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pizza_tamanhos_tenant_id_sigla_key" ON "pizza_tamanhos"("tenant_id", "sigla");

-- CreateIndex
CREATE INDEX "pizza_bordas_tenant_id_idx" ON "pizza_bordas"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "pizza_bordas_tenant_id_nome_key" ON "pizza_bordas"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "bebidas_tenant_id_idx" ON "bebidas"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_movements_tenant_id_idx" ON "stock_movements"("tenant_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "produtos_tenant_id_idx" ON "produtos"("tenant_id");

-- CreateIndex
CREATE INDEX "produtos_classe_negocio_idx" ON "produtos"("classe_negocio");

-- CreateIndex
CREATE INDEX "customers_tenant_id_idx" ON "customers"("tenant_id");

-- CreateIndex
CREATE INDEX "customers_tenant_id_telefone_idx" ON "customers"("tenant_id", "telefone");

-- CreateIndex
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "motoboys_tenant_id_idx" ON "motoboys"("tenant_id");

-- CreateIndex
CREATE INDEX "zonas_entrega_tenant_id_idx" ON "zonas_entrega"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "entregas_order_id_key" ON "entregas"("order_id");

-- CreateIndex
CREATE INDEX "entregas_tenant_id_idx" ON "entregas"("tenant_id");

-- CreateIndex
CREATE INDEX "entregas_motoboy_id_idx" ON "entregas"("motoboy_id");

-- CreateIndex
CREATE INDEX "entregas_zona_id_idx" ON "entregas"("zona_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_idx" ON "appointments"("tenant_id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_scheduled_at_idx" ON "appointments"("tenant_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "alunos_tenant_id_idx" ON "alunos"("tenant_id");

-- CreateIndex
CREATE INDEX "alunos_tenant_id_status_idx" ON "alunos"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "planos_academia_tenant_id_idx" ON "planos_academia"("tenant_id");

-- CreateIndex
CREATE INDEX "matriculas_alunos_aluno_id_idx" ON "matriculas_alunos"("aluno_id");

-- CreateIndex
CREATE INDEX "matriculas_alunos_tenant_id_idx" ON "matriculas_alunos"("tenant_id");

-- CreateIndex
CREATE INDEX "matriculas_alunos_tenant_id_data_vencimento_idx" ON "matriculas_alunos"("tenant_id", "data_vencimento");

-- CreateIndex
CREATE INDEX "frequencia_alunos_tenant_id_idx" ON "frequencia_alunos"("tenant_id");

-- CreateIndex
CREATE INDEX "frequencia_alunos_aluno_id_idx" ON "frequencia_alunos"("aluno_id");

-- CreateIndex
CREATE INDEX "frequencia_alunos_tenant_id_data_idx" ON "frequencia_alunos"("tenant_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "frequencia_alunos_aluno_id_data_key" ON "frequencia_alunos"("aluno_id", "data");

-- CreateIndex
CREATE INDEX "cobrancas_alunos_tenant_id_idx" ON "cobrancas_alunos"("tenant_id");

-- CreateIndex
CREATE INDEX "cobrancas_alunos_aluno_id_idx" ON "cobrancas_alunos"("aluno_id");

-- CreateIndex
CREATE INDEX "cobrancas_alunos_tenant_id_status_idx" ON "cobrancas_alunos"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "cobrancas_alunos_tenant_id_data_vencimento_idx" ON "cobrancas_alunos"("tenant_id", "data_vencimento");

-- CreateIndex
CREATE INDEX "bot_confusion_events_status_idx" ON "bot_confusion_events"("status");

-- CreateIndex
CREATE INDEX "bot_confusion_events_created_at_idx" ON "bot_confusion_events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "bot_confusion_events_tenant_id_idx" ON "bot_confusion_events"("tenant_id");

-- CreateIndex
CREATE INDEX "bot_learned_patterns_nicho_ativo_idx" ON "bot_learned_patterns"("nicho", "ativo");

-- CreateIndex
CREATE INDEX "bot_learned_patterns_created_at_idx" ON "bot_learned_patterns"("created_at" DESC);

-- CreateIndex
CREATE INDEX "parq_perguntas_tenant_id_idx" ON "parq_perguntas"("tenant_id");

-- CreateIndex
CREATE INDEX "fichas_parq_tenant_id_idx" ON "fichas_parq"("tenant_id");

-- CreateIndex
CREATE INDEX "fichas_parq_aluno_id_idx" ON "fichas_parq"("aluno_id");

-- CreateIndex
CREATE INDEX "funcionarios_tenant_id_idx" ON "funcionarios"("tenant_id");

-- CreateIndex
CREATE INDEX "funcionarios_tenant_id_telefone_idx" ON "funcionarios"("tenant_id", "telefone");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_pagamento_codigo_key" ON "codigos_pagamento"("codigo");

-- CreateIndex
CREATE INDEX "codigos_pagamento_tenant_id_idx" ON "codigos_pagamento"("tenant_id");

-- CreateIndex
CREATE INDEX "codigos_pagamento_cobranca_id_idx" ON "codigos_pagamento"("cobranca_id");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_chave_key" ON "modulos"("chave");

-- CreateIndex
CREATE INDEX "waitlist_entries_email_niche_idx" ON "waitlist_entries"("email", "niche");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_variacoes" ADD CONSTRAINT "item_variacoes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_adicionais" ADD CONSTRAINT "item_adicionais_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_cardapio" ADD CONSTRAINT "categorias_cardapio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamados" ADD CONSTRAINT "chamados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_chamado" ADD CONSTRAINT "mensagens_chamado_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES "chamados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "combos" ADD CONSTRAINT "combos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pizza_tamanhos" ADD CONSTRAINT "pizza_tamanhos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pizza_bordas" ADD CONSTRAINT "pizza_bordas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bebidas" ADD CONSTRAINT "bebidas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoboys" ADD CONSTRAINT "motoboys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_entrega" ADD CONSTRAINT "zonas_entrega_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_motoboy_id_fkey" FOREIGN KEY ("motoboy_id") REFERENCES "motoboys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas_entrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planos_academia" ADD CONSTRAINT "planos_academia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_alunos" ADD CONSTRAINT "matriculas_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_alunos" ADD CONSTRAINT "matriculas_alunos_plano_id_fkey" FOREIGN KEY ("plano_id") REFERENCES "planos_academia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_alunos" ADD CONSTRAINT "matriculas_alunos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencia_alunos" ADD CONSTRAINT "frequencia_alunos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequencia_alunos" ADD CONSTRAINT "frequencia_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas_alunos" ADD CONSTRAINT "cobrancas_alunos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas_alunos" ADD CONSTRAINT "cobrancas_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobrancas_alunos" ADD CONSTRAINT "cobrancas_alunos_matricula_id_fkey" FOREIGN KEY ("matricula_id") REFERENCES "matriculas_alunos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_confusion_events" ADD CONSTRAINT "bot_confusion_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_learned_patterns" ADD CONSTRAINT "bot_learned_patterns_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "bot_confusion_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parq_perguntas" ADD CONSTRAINT "parq_perguntas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_parq" ADD CONSTRAINT "fichas_parq_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichas_parq" ADD CONSTRAINT "fichas_parq_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funcionarios" ADD CONSTRAINT "funcionarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_pagamento" ADD CONSTRAINT "codigos_pagamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_pagamento" ADD CONSTRAINT "codigos_pagamento_cobranca_id_fkey" FOREIGN KEY ("cobranca_id") REFERENCES "cobrancas_alunos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_pagamento" ADD CONSTRAINT "codigos_pagamento_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modulos" ADD CONSTRAINT "tenant_modulos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modulos" ADD CONSTRAINT "tenant_modulos_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catálogo de módulos (dado-semente que vinha da migration legacy 20260718000000_add_modulos)
INSERT INTO "modulos" ("id", "chave", "nome", "descricao", "ordem") VALUES
    (gen_random_uuid(), 'alunos',      'Alunos',      'Cadastro e ficha do aluno',           1),
    (gen_random_uuid(), 'documentos',  'Documentos',  'PAR-Q, termos e assinatura digital',  2),
    (gen_random_uuid(), 'financeiro',  'Financeiro',  'Mensalidades, baixas, inadimplência', 3),
    (gen_random_uuid(), 'frequencia',  'Frequência',  'Check-in e presença',                 4),
    (gen_random_uuid(), 'treinos',     'Treinos',     'Fichas e prescrição',                 5),
    (gen_random_uuid(), 'comunicacao', 'Comunicação', 'WhatsApp e avisos',                   6),
    (gen_random_uuid(), 'relatorios',  'Relatórios',  'Dashboard e métricas',                7)
ON CONFLICT ("chave") DO NOTHING;

-- AlterTable: add tenant_id to parq_perguntas for per-tenant question customization
ALTER TABLE parq_perguntas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS parq_perguntas_tenant_id_idx
  ON parq_perguntas (tenant_id);

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "parq_code" VARCHAR(16);

-- Backfill: código curto pros tenants existentes
UPDATE "tenants" SET "parq_code" = substr(md5(random()::text || id::text), 1, 10) WHERE "parq_code" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_parq_code_key" ON "tenants"("parq_code");

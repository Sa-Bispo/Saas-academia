import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma v7 requer um adapter explícito (não conecta ao banco diretamente).
// Usa DATABASE_URL (pgbouncer, porta 6543) para aproveitar o pool em runtime.
// Em dev reutiliza a instância para não esgotar conexões com hot reload do Next.js.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function hasOrderDelegate(client: PrismaClient | undefined) {
  // Em dev, HMR pode manter client antigo sem os delegates novos após gerar o schema.
  return Boolean(
    client &&
      (client as unknown as { order?: unknown }).order &&
      (client as unknown as { fichaParq?: unknown }).fichaParq &&
      (client as unknown as { parqPergunta?: unknown }).parqPergunta
  );
}

const prismaClient = hasOrderDelegate(globalThis.__prisma)
  ? globalThis.__prisma!
  : createPrismaClient();

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

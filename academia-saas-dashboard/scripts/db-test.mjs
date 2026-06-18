/**
 * Connectivity test: verifica se o Prisma consegue se conectar ao Supabase.
 * Roda com: npm run db:test  (dentro do Docker conforme README)
 *
 * Usa DIRECT_URL (porta 5432, session mode) — o mesmo que prisma.config.ts
 * usa para operações de CLI. Node 22 carrega .env via --env-file no script.
 */

import { PrismaClient } from "../src/generated/prisma/index.js";

// Usa DIRECT_URL para o teste de conexão (espelha o comportamento do CLI)
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
  log: ["query", "info", "warn", "error"],
});


async function main() {
  console.log("⏳  Tentando conectar ao banco...");
  console.log("   DATABASE_URL:", process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ":***@"));
  console.log("   DIRECT_URL  :", process.env.DIRECT_URL?.replace(/:([^:@]+)@/, ":***@"));

  await prisma.$connect();
  console.log("✅  Conexão OK!\n");

  // Query mínima para confirmar que o banco responde
  const result = await prisma.$queryRaw`SELECT current_database() AS db, now() AS ts`;
  console.log("📦  Banco:", result[0].db);
  console.log("🕐  Hora no servidor:", result[0].ts);
}

main()
  .catch((err) => {
    console.error("\n❌  Falha na conexão:");
    console.error(err.message ?? err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// prisma.config.ts — usado apenas pelas ferramentas do Prisma CLI (db push, migrate, studio).
//
// IMPORTANTE — Prisma v7 removeu o conceito de `directUrl` do schema.prisma e do defineConfig.
// O campo `datasource.url` aqui é usado SOMENTE por operações de CLI (db push / migrate).
// Para isso precisamos da conexão DIRETA ao Postgres (DIRECT_URL, porta 5432, sem pgbouncer),
// pois o pgbouncer em transaction mode (porta 6543) não suporta operações de DDL.
//
// O PrismaClient da aplicação (src/lib/prisma.ts) usa DATABASE_URL (pgbouncer, porta 6543)
// para aproveitar o pool de conexões em runtime.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});

/**
 * prisma/seed-parq.ts — Seed das 7 perguntas PAR-Q padrão
 *
 * Execução:
 *   npx tsx prisma/seed-parq.ts
 *
 * Idempotente: trunca e reinserere sempre que rodar (tabela global, sem tenant).
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const perguntas = [
  "Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?",
  "Você sente dores no peito quando pratica atividade física?",
  "No último mês, você sentiu dores no peito quando praticou atividade física?",
  "Você apresenta desequilíbrio devido à tontura e/ou perda de consciência?",
  "Você possui algum problema ósseo ou articular que poderia ser piorado pela atividade física?",
  "Você toma atualmente algum medicamento para pressão arterial e/ou problema de coração?",
  "Sabe de alguma outra razão pela qual você não deveria praticar atividade física?",
];

async function main() {
  console.log("Seeding PAR-Q questions...");

  await prisma.parqPergunta.deleteMany();

  for (let i = 0; i < perguntas.length; i++) {
    await prisma.parqPergunta.create({
      data: { ordem: i + 1, texto: perguntas[i], ativo: true },
    });
    console.log(`  ✓ ${i + 1}. ${perguntas[i].slice(0, 60)}...`);
  }

  console.log(`\nDone. ${perguntas.length} perguntas PAR-Q seedadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

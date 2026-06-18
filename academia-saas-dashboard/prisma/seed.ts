/**
 * prisma/seed.ts — Seed dos 9 planos comerciais
 *
 * Execução:
 *   docker exec whatsapp_saas_web npx prisma db seed
 *
 * Idempotente: usa upsert por `code`.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const plans = [
  // ── DELIVERY ────────────────────────────────────────────────────────────────
  {
    code: "delivery_basico",
    niche: "DELIVERY" as const,
    name: "Plano Básico",
    priceCents: 4990,
    maxMessagesMonth: 500,
    maxProducts: 30,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: false,
    reportsEnabled: false,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },
  {
    code: "delivery_pro",
    niche: "DELIVERY" as const,
    name: "Plano Pro",
    priceCents: 8990,
    maxMessagesMonth: 2000,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: true,
    reportsEnabled: false,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },
  {
    code: "delivery_growth",
    niche: "DELIVERY" as const,
    name: "Plano Growth",
    priceCents: 13990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: true,
    reportsEnabled: true,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },

  // ── CLÍNICA ──────────────────────────────────────────────────────────────────
  {
    code: "clinica_basico",
    niche: "CLINICA" as const,
    name: "Plano Básico",
    priceCents: 8990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: 100,
    maxProfessionals: 1,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: false,
    reportsEnabled: false,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },
  {
    code: "clinica_pro",
    niche: "CLINICA" as const,
    name: "Plano Pro",
    priceCents: 15990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: 3,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: false,
    reportsEnabled: false,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: true,
    cancellationEnabled: true,
    multiProfessional: true,
  },
  {
    code: "clinica_premium",
    niche: "CLINICA" as const,
    name: "Plano Clínica",
    priceCents: 24990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: false,
    reportsEnabled: true,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: true,
    cancellationEnabled: true,
    multiProfessional: true,
  },

  // ── EMPRESA ──────────────────────────────────────────────────────────────────
  {
    code: "empresa_starter",
    niche: "EMPRESA" as const,
    name: "Plano Starter",
    priceCents: 7990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: 1000,
    maxDocuments: 1,
    menuReaderEnabled: false,
    reportsEnabled: false,
    ragEnabled: false,
    humanHandoffEnabled: false,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },
  {
    code: "empresa_business",
    niche: "EMPRESA" as const,
    name: "Plano Business",
    priceCents: 14990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: 5000,
    maxDocuments: -1,
    menuReaderEnabled: false,
    reportsEnabled: false,
    ragEnabled: true,
    humanHandoffEnabled: true,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },
  {
    code: "empresa_enterprise",
    niche: "EMPRESA" as const,
    name: "Plano Enterprise",
    priceCents: 29990,
    maxMessagesMonth: -1,
    maxProducts: -1,
    maxAppointmentsMonth: -1,
    maxProfessionals: -1,
    maxContactsMonth: -1,
    maxDocuments: -1,
    menuReaderEnabled: false,
    reportsEnabled: true,
    ragEnabled: true,
    humanHandoffEnabled: true,
    remindersEnabled: false,
    cancellationEnabled: false,
    multiProfessional: false,
  },
];

async function main() {
  console.log("Seeding plans...");

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(`  ✓ ${plan.niche} — ${plan.name} (R$ ${(plan.priceCents / 100).toFixed(2)})`);
  }

  console.log(`\nDone. ${plans.length} plans seeded.`);
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

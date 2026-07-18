import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const TARGET_EMAIL = process.argv[2] ?? "teste.parq@academiasaas.dev";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const plan = await prisma.plan.upsert({
    where: { code: "academia_basico" },
    create: {
      code: "academia_basico",
      niche: "ACADEMIA",
      name: "Academia Básico",
      priceCents: 0,
      reportsEnabled: false,
      ragEnabled: false,
      humanHandoffEnabled: false,
    },
    update: { name: "Academia Básico" },
    select: { id: true, code: true },
  });
  console.log("Plano:", plan);

  const user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    select: { id: true, email: true },
  });

  if (!user) {
    console.error(`Usuário '${TARGET_EMAIL}' não encontrado no banco.`);
    console.log("Faça login com esse email primeiro para criar o registro.");
    process.exit(1);
  }
  console.log("Usuário:", user);

  let tenant = await prisma.tenant.findFirst({
    where: { userId: user.id },
    select: { id: true, nome: true },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        nome: "Academia Teste",
        userId: user.id,
        plano: "basico",
        configNicho: { sub_nicho: "academia" },
      },
      select: { id: true, nome: true },
    });
    console.log("Tenant criado:", tenant);
  } else {
    console.log("Tenant existente:", tenant);
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const sub = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    create: {
      tenantId: tenant.id,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    select: { id: true, status: true, currentPeriodEnd: true },
  });

  console.log("Subscription:", sub);
  console.log(`\n✓ Pronto! '${TARGET_EMAIL}' pode logar agora.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });

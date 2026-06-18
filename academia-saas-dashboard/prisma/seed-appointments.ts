/**
 * prisma/seed-appointments.ts — Seed de 15 agendamentos para desenvolvimento
 *
 * Pré-requisito: existir pelo menos um tenant no banco.
 * Use o TENANT_ID do seu tenant de desenvolvimento abaixo ou via env var.
 *
 * Execução:
 *   TENANT_ID=seu-uuid npx tsx prisma/seed-appointments.ts
 *
 * Ou edite FALLBACK_TENANT_ID diretamente para testes locais.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FALLBACK_TENANT_ID = process.env.TENANT_ID ?? "";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFromNow(delta: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const appointments = [
  // ── Hoje ───────────────────────────────────────────────────────────────────
  {
    clientName: "Maria Oliveira",
    clientPhone: "11987654321",
    type: "Consulta",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(0, 9, 0),
    status: "CONFIRMED" as const,
    confirmedByBot: true,
  },
  {
    clientName: "João Ferreira",
    clientPhone: "11976543210",
    type: "Retorno",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(0, 10, 30),
    status: "CONFIRMED" as const,
    confirmedByBot: false,
  },
  {
    clientName: "Ana Costa",
    clientPhone: "11965432109",
    type: "Avaliação",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(0, 14, 0),
    status: "PENDING" as const,
    confirmedByBot: false,
  },

  // ── Amanhã ─────────────────────────────────────────────────────────────────
  {
    clientName: "Carlos Mendes",
    clientPhone: "11954321098",
    type: "Procedimento",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(1, 8, 0),
    status: "CONFIRMED" as const,
    confirmedByBot: true,
    notes: "Paciente com histórico de hipertensão",
  },
  {
    clientName: "Fernanda Lima",
    clientPhone: "11943210987",
    type: "Consulta",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(1, 11, 0),
    status: "PENDING" as const,
    confirmedByBot: false,
  },
  {
    clientName: "Ricardo Souza",
    clientPhone: "11932109876",
    type: "Limpeza",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(1, 15, 30),
    status: "CONFIRMED" as const,
    confirmedByBot: true,
  },

  // ── Próximos dias ──────────────────────────────────────────────────────────
  {
    clientName: "Patrícia Nunes",
    clientPhone: "11921098765",
    type: "Retorno",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(3, 9, 30),
    status: "CONFIRMED" as const,
    confirmedByBot: true,
  },
  {
    clientName: "Bruno Tavares",
    clientPhone: "11910987654",
    type: "Avaliação",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(4, 13, 0),
    status: "PENDING" as const,
    confirmedByBot: false,
  },
  {
    clientName: "Juliana Ramos",
    clientPhone: "11909876543",
    type: "Consulta",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(5, 10, 0),
    status: "CANCELLED" as const,
    confirmedByBot: false,
    notes: "Cancelado via WhatsApp pelo paciente",
  },
  {
    clientName: "Marcos Andrade",
    clientPhone: "11898765432",
    type: "Procedimento",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(6, 16, 0),
    status: "CONFIRMED" as const,
    confirmedByBot: true,
  },

  // ── Dias anteriores ────────────────────────────────────────────────────────
  {
    clientName: "Luciana Barbosa",
    clientPhone: "11887654321",
    type: "Consulta",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(-2, 9, 0),
    status: "COMPLETED" as const,
    confirmedByBot: false,
  },
  {
    clientName: "Eduardo Carvalho",
    clientPhone: "11876543210",
    type: "Retorno",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(-3, 11, 0),
    status: "COMPLETED" as const,
    confirmedByBot: true,
  },
  {
    clientName: "Sabrina Pereira",
    clientPhone: "11865432109",
    type: "Limpeza",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(-4, 14, 30),
    status: "NO_SHOW" as const,
    confirmedByBot: true,
    notes: "Paciente não compareceu sem aviso",
  },
  {
    clientName: "Thiago Martins",
    clientPhone: "11854321098",
    type: "Avaliação",
    professional: "Dra. Carla Santos",
    scheduledAt: daysFromNow(-5, 8, 30),
    status: "COMPLETED" as const,
    confirmedByBot: false,
  },
  {
    clientName: "Camila Rodrigues",
    clientPhone: "11843210987",
    type: "Consulta",
    professional: "Dr. Rafael Alves",
    scheduledAt: daysFromNow(-7, 10, 0),
    status: "CANCELLED" as const,
    confirmedByBot: false,
    notes: "Remarcou para o próximo mês",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!FALLBACK_TENANT_ID) {
    // Try to find the first tenant automatically
    const tenant = await prisma.tenant.findFirst({ orderBy: { dataCriacao: "asc" } });
    if (!tenant) {
      console.error("Nenhum tenant encontrado. Crie um tenant primeiro ou defina TENANT_ID.");
      process.exit(1);
    }
    console.log(`Usando tenant: ${tenant.id} (${tenant.nome})`);
    await seedForTenant(tenant.id);
  } else {
    await seedForTenant(FALLBACK_TENANT_ID);
  }
}

async function seedForTenant(tenantId: string) {
  console.log(`\nSeeding ${appointments.length} appointments para tenant ${tenantId}...\n`);

  for (const apt of appointments) {
    const created = await prisma.appointment.create({
      data: {
        tenantId,
        clientName: apt.clientName,
        clientPhone: apt.clientPhone,
        type: apt.type,
        professional: apt.professional,
        scheduledAt: apt.scheduledAt,
        status: apt.status,
        confirmedByBot: apt.confirmedByBot,
        notes: apt.notes ?? null,
      },
    });

    const icon =
      apt.status === "CONFIRMED" ? "✅"
      : apt.status === "PENDING" ? "🟡"
      : apt.status === "CANCELLED" ? "❌"
      : apt.status === "COMPLETED" ? "✔️"
      : "👻";

    console.log(
      `  ${icon} ${apt.clientName.padEnd(22)} | ${apt.type.padEnd(14)} | ${
        apt.scheduledAt.toLocaleDateString("pt-BR")
      } ${apt.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}${
        apt.confirmedByBot ? " 🤖" : ""
      }`,
    );
  }

  console.log(`\nDone. ${appointments.length} appointments criados.`);
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

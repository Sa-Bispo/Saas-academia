/**
 * prisma/seed.mjs — Seed dos 9 planos comerciais
 *
 * Execução (host, se tiver node):
 *   node --env-file=.env.local prisma/seed.mjs
 *
 * Execução (Docker):
 *   docker exec whatsapp_saas_web node --env-file=.env prisma/seed.mjs
 *
 * Idempotente: usa INSERT ... ON CONFLICT DO UPDATE (upsert por code).
 */

import pg from "pg";

const { Pool } = pg;

const plans = [
  // ── DELIVERY ────────────────────────────────────────────────────────────────
  {
    code: "delivery_basico",
    niche: "DELIVERY",
    name: "Plano Básico",
    price_cents: 4990,
    max_messages_month: 500,
    max_products: 30,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: false,
    reports_enabled: false,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },
  {
    code: "delivery_pro",
    niche: "DELIVERY",
    name: "Plano Pro",
    price_cents: 8990,
    max_messages_month: 2000,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: true,
    reports_enabled: false,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },
  {
    code: "delivery_growth",
    niche: "DELIVERY",
    name: "Plano Growth",
    price_cents: 13990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: true,
    reports_enabled: true,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },

  // ── CLÍNICA ──────────────────────────────────────────────────────────────────
  {
    code: "clinica_basico",
    niche: "CLINICA",
    name: "Plano Básico",
    price_cents: 8990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: 100,
    max_professionals: 1,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: false,
    reports_enabled: false,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },
  {
    code: "clinica_pro",
    niche: "CLINICA",
    name: "Plano Pro",
    price_cents: 15990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: 3,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: false,
    reports_enabled: false,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: true,
    cancellation_enabled: true,
    multi_professional: true,
  },
  {
    code: "clinica_premium",
    niche: "CLINICA",
    name: "Plano Clínica",
    price_cents: 24990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: false,
    reports_enabled: true,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: true,
    cancellation_enabled: true,
    multi_professional: true,
  },

  // ── EMPRESA ──────────────────────────────────────────────────────────────────
  {
    code: "empresa_starter",
    niche: "EMPRESA",
    name: "Plano Starter",
    price_cents: 7990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: 1000,
    max_documents: 1,
    menu_reader_enabled: false,
    reports_enabled: false,
    rag_enabled: false,
    human_handoff_enabled: false,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },
  {
    code: "empresa_business",
    niche: "EMPRESA",
    name: "Plano Business",
    price_cents: 14990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: 5000,
    max_documents: -1,
    menu_reader_enabled: false,
    reports_enabled: false,
    rag_enabled: true,
    human_handoff_enabled: true,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },
  {
    code: "empresa_enterprise",
    niche: "EMPRESA",
    name: "Plano Enterprise",
    price_cents: 29990,
    max_messages_month: -1,
    max_products: -1,
    max_appointments_month: -1,
    max_professionals: -1,
    max_contacts_month: -1,
    max_documents: -1,
    menu_reader_enabled: false,
    reports_enabled: true,
    rag_enabled: true,
    human_handoff_enabled: true,
    reminders_enabled: false,
    cancellation_enabled: false,
    multi_professional: false,
  },
];

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

async function main() {
  console.log("Seeding plans...\n");

  for (const plan of plans) {
    await pool.query(
      `INSERT INTO plans (
        id, code, niche, name, price_cents,
        max_messages_month, max_products, max_appointments_month,
        max_professionals, max_contacts_month, max_documents,
        menu_reader_enabled, reports_enabled, rag_enabled,
        human_handoff_enabled, reminders_enabled, cancellation_enabled,
        multi_professional, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2::\"Niche\", $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, now()
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        price_cents = EXCLUDED.price_cents,
        max_messages_month = EXCLUDED.max_messages_month,
        max_products = EXCLUDED.max_products,
        max_appointments_month = EXCLUDED.max_appointments_month,
        max_professionals = EXCLUDED.max_professionals,
        max_contacts_month = EXCLUDED.max_contacts_month,
        max_documents = EXCLUDED.max_documents,
        menu_reader_enabled = EXCLUDED.menu_reader_enabled,
        reports_enabled = EXCLUDED.reports_enabled,
        rag_enabled = EXCLUDED.rag_enabled,
        human_handoff_enabled = EXCLUDED.human_handoff_enabled,
        reminders_enabled = EXCLUDED.reminders_enabled,
        cancellation_enabled = EXCLUDED.cancellation_enabled,
        multi_professional = EXCLUDED.multi_professional`,
      [
        plan.code, plan.niche, plan.name, plan.price_cents,
        plan.max_messages_month, plan.max_products, plan.max_appointments_month,
        plan.max_professionals, plan.max_contacts_month, plan.max_documents,
        plan.menu_reader_enabled, plan.reports_enabled, plan.rag_enabled,
        plan.human_handoff_enabled, plan.reminders_enabled,
        plan.cancellation_enabled, plan.multi_professional,
      ]
    );
    const price = `R$ ${(plan.price_cents / 100).toFixed(2).replace(".", ",")}`;
    console.log(`  ✓ [${plan.niche}] ${plan.name} — ${price}/mês`);
  }

  console.log(`\n✓ ${plans.length} planos seedados com sucesso.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => pool.end());

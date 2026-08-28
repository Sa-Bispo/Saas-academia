/**
 * Cria um tenant de teste para desenvolvimento local.
 * Uso: node --env-file=.env.local scripts/create-test-tenant.mjs
 */

import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;

const EMAIL = "teste@academia.com";
const SENHA = "Teste@2026";
const NOME = "Academia Teste";
const PLAN_CODE = "academia_basico";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("→ Criando usuário no Supabase Auth...");

  // Tenta criar; se já existir, deleta e recria
  let { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
    user_metadata: { nome: NOME },
  });

  if (authError?.message?.toLowerCase().includes("already")) {
    console.log("  Usuário já existe no Auth — deletando e recriando...");
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === EMAIL);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
      const retry = await supabase.auth.admin.createUser({
        email: EMAIL,
        password: SENHA,
        email_confirm: true,
        user_metadata: { nome: NOME },
      });
      authData = retry.data;
      authError = retry.error;
    }
  }

  if (authError || !authData?.user?.id) {
    throw new Error(`Falha no Auth: ${authError?.message}`);
  }

  const authUserId = authData.user.id;
  console.log(`  Auth UID: ${authUserId}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Limpa registro anterior no DB se existir
    const { rows: existing } = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [EMAIL]
    );
    if (existing.length > 0) {
      const oldUserId = existing[0].id;
      await client.query(`DELETE FROM subscriptions WHERE tenant_id IN (SELECT id FROM tenants WHERE user_id = $1)`, [oldUserId]);
      await client.query(`DELETE FROM tenants WHERE user_id = $1`, [oldUserId]);
      await client.query(`DELETE FROM users WHERE id = $1`, [oldUserId]);
      console.log("  Registro anterior no DB removido.");
    }

    // Busca o plano
    const { rows: plans } = await client.query(
      `SELECT id FROM plans WHERE code = $1`,
      [PLAN_CODE]
    );
    if (!plans.length) throw new Error(`Plano "${PLAN_CODE}" não encontrado.`);
    const planId = plans[0].id;

    // Cria user
    await client.query(
      `INSERT INTO users (id, email, nome) VALUES ($1, $2, $3)`,
      [authUserId, EMAIL, NOME]
    );

    // Cria tenant
    const tenantId = randomUUID();
    await client.query(
      `INSERT INTO tenants (id, nome, plano, user_id, "companyName", config_nicho)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [tenantId, NOME, PLAN_CODE, authUserId, NOME, JSON.stringify({ sub_nicho: "academia", subNicho: "academia" })]
    );

    // Cria subscription (vence em 1 ano)
    const vencimento = new Date();
    vencimento.setFullYear(vencimento.getFullYear() + 1);
    await client.query(
      `INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, updated_at)
       VALUES ($1, $2, $3, 'ACTIVE', NOW(), $4, NOW())`,
      [randomUUID(), tenantId, planId, vencimento]
    );

    await client.query("COMMIT");

    console.log("\n✅ Tenant de teste criado com sucesso!\n");
    console.log(`   E-mail : ${EMAIL}`);
    console.log(`   Senha  : ${SENHA}`);
    console.log(`   URL    : http://localhost:3000/login\n`);
  } catch (err) {
    await client.query("ROLLBACK");
    // Limpa o usuário do Auth se o DB falhou
    await supabase.auth.admin.deleteUser(authUserId);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("✗ Erro:", err.message);
  process.exit(1);
});

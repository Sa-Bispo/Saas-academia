/**
 * scripts/fix-screenshot-data.mjs
 *
 * Arruma os dados visuais do dashboard para o print do LinkedIn:
 *  1. Atualiza o nome da academia (tenant)
 *  2. Atualiza o nome do plano
 *  3. Adiciona frequências da última semana (fix "0x/sem")
 *  4. Atualiza vencimentos das matrículas (fix coluna "—" na tela de Alunos)
 *
 * Execução (no terminal do VS Code, dentro da pasta dashboard):
 *   node --env-file=.env scripts/fix-screenshot-data.mjs
 */

import pg from "pg";
const { Pool } = pg;

const TENANT_EMAIL = process.env.SEED_EMAIL ?? "samuel.bispon01@gmail.com";
const NOVO_NOME = "Academia Pyra";           // Aparece no canto superior esquerdo
const NOVO_NOME_PLANO = "Academia Pro";       // Substitui "Academia Pro Local"

const pool = new Pool({ connectionString: process.env.DIRECT_URL });

function q(sql, params) {
  return pool.query(sql, params);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  // ─── 1. Buscar o tenant ──────────────────────────────────────────────────
  const { rows: userRows } = await q(
    `SELECT u.id, t.id AS tenant_id
     FROM users u
     JOIN tenants t ON t.user_id = u.id
     WHERE u.email = $1
     LIMIT 1`,
    [TENANT_EMAIL],
  );

  if (!userRows.length) {
    console.error(`❌ Usuário não encontrado para o email: ${TENANT_EMAIL}`);
    process.exit(1);
  }

  const { tenant_id } = userRows[0];
  console.log(`✅ Tenant encontrado: ${tenant_id}`);

  // ─── 2. Atualizar nome da academia ───────────────────────────────────────
  await q(
    `UPDATE tenants SET nome = $1, "companyName" = $1 WHERE id = $2`,
    [NOVO_NOME, tenant_id],
  );
  console.log(`✅ Nome da academia atualizado para "${NOVO_NOME}"`);

  // ─── 3. Atualizar nome do plano ──────────────────────────────────────────
  const { rowCount: planosAtualizados } = await q(
    `UPDATE plans SET name = $1
     WHERE name ILIKE '%local%' OR name ILIKE '%teste%' OR name ILIKE '%pro local%'`,
    [NOVO_NOME_PLANO],
  );
  console.log(`✅ ${planosAtualizados} plano(s) renomeado(s) para "${NOVO_NOME_PLANO}"`);

  // ─── 4. Adicionar frequências da última semana ───────────────────────────
  // Pega até 30 alunos ativos para simular presença nos últimos 7 dias
  const { rows: alunos } = await q(
    `SELECT id FROM alunos WHERE tenant_id = $1 AND status = 'ATIVO' LIMIT 30`,
    [tenant_id],
  );

  if (alunos.length > 0) {
    let freqInseridas = 0;
    const horarios = [
      { entrada: "06:15", saida: "07:30" },
      { entrada: "07:00", saida: "08:15" },
      { entrada: "08:30", saida: "09:45" },
      { entrada: "17:00", saida: "18:15" },
      { entrada: "18:00", saida: "19:15" },
      { entrada: "19:00", saida: "20:15" },
    ];

    for (const aluno of alunos) {
      // Cada aluno treina em 3-5 dias dos últimos 7
      const diasTreino = [0, 1, 2, 3, 4, 5, 6]
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 3) + 3);

      for (const diasAtras of diasTreino) {
        const data = daysAgo(diasAtras);
        const horario = horarios[Math.floor(Math.random() * horarios.length)];

        await q(
          `INSERT INTO frequencia_alunos (id, tenant_id, aluno_id, data, hora_entrada, hora_saida, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())
           ON CONFLICT (aluno_id, data) DO NOTHING`,
          [tenant_id, aluno.id, data, horario.entrada, horario.saida],
        );
        freqInseridas++;
      }
    }
    console.log(`✅ ${freqInseridas} registros de frequência adicionados (últimos 7 dias)`);
  }

  // ─── 5. Atualizar vencimentos das matrículas ativas ─────────────────────
  // Distribui os vencimentos nos próximos 30 dias (realista para uma academia)
  const { rows: matriculas } = await q(
    `SELECT id FROM matriculas_alunos WHERE tenant_id = $1 AND status = 'ATIVA'`,
    [tenant_id],
  );

  let matriculasAtualizadas = 0;
  for (let i = 0; i < matriculas.length; i++) {
    // Espalha os vencimentos uniformemente nos próximos 30 dias
    const diasAFrente = (i % 30) + 1;
    await q(
      `UPDATE matriculas_alunos SET data_vencimento = $1 WHERE id = $2`,
      [daysFromNow(diasAFrente), matriculas[i].id],
    );
    matriculasAtualizadas++;
  }
  console.log(`✅ ${matriculasAtualizadas} matrículas com vencimento atualizado`);

  console.log("\n🎉 Pronto! Atualize a página do dashboard para ver as mudanças.");
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});

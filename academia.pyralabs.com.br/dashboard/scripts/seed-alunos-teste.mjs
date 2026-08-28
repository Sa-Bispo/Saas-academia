/**
 * Seed de 4 alunos com status diferentes para testes
 * Uso: node --env-file=.env.local scripts/seed-alunos-teste.mjs
 */

import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const hoje = new Date();
const add = (days) => new Date(hoje.getTime() + days * 86400000);
const fmt  = (d) => d.toISOString().split("T")[0] + "T12:00:00";

async function main() {
  const client = await pool.connect();
  try {
    // Busca o tenant de teste
    const { rows } = await client.query(
      `SELECT t.id FROM tenants t
       JOIN users u ON u.id = t.user_id
       WHERE u.email = 'teste.parq@academiasaas.dev'
       LIMIT 1`
    );

    if (!rows.length) {
      console.error("❌  Tenant 'teste@academia.com' não encontrado.");
      console.error("   Acesse /login com esse e-mail primeiro para criá-lo.");
      process.exit(1);
    }

    const tenantId = rows[0].id;
    console.log(`✓  Tenant encontrado: ${tenantId}`);

    // Busca ou cria um plano no tenant
    let { rows: planos } = await client.query(
      `SELECT id, valor_cents FROM planos_academia WHERE tenant_id = $1 AND ativo = true LIMIT 1`,
      [tenantId]
    );

    let planoId, valorCents;
    if (planos.length) {
      planoId    = planos[0].id;
      valorCents = planos[0].valor_cents;
      console.log(`✓  Plano existente: ${planoId}`);
    } else {
      planoId    = randomUUID();
      valorCents = 10000; // R$ 100,00
      await client.query(
        `INSERT INTO planos_academia (id, tenant_id, nome, valor_cents, periodicidade, ativo)
         VALUES ($1, $2, 'Plano Mensal', $3, 'MENSAL', true)`,
        [planoId, tenantId, valorCents]
      );
      console.log(`✓  Plano criado: ${planoId}`);
    }

    const alunos = [
      {
        nome: "Maria Silva (Ativa)",
        telefone: "11991110001",
        status: "ATIVO",
        matriculaStatus: "ATIVA",
        dataInicio: fmt(add(-20)),
        dataVencimento: fmt(add(10)),   // vence daqui 10 dias
        cobranca: { status: "PAGO", dataPagamento: fmt(add(-5)) },
      },
      {
        nome: "João Souza (Inadimplente)",
        telefone: "11991110002",
        status: "INADIMPLENTE",
        matriculaStatus: "ATIVA",
        dataInicio: fmt(add(-45)),
        dataVencimento: fmt(add(-15)),  // venceu há 15 dias
        cobranca: { status: "VENCIDO", dataPagamento: null },
      },
      {
        nome: "Ana Costa (Vencendo logo)",
        telefone: "11991110003",
        status: "ATIVO",
        matriculaStatus: "ATIVA",
        dataInicio: fmt(add(-28)),
        dataVencimento: fmt(add(3)),    // vence em 3 dias
        cobranca: { status: "PENDENTE", dataPagamento: null },
      },
      {
        nome: "Pedro Lima (Inativo)",
        telefone: "11991110004",
        status: "INATIVO",
        matriculaStatus: "CANCELADA",
        dataInicio: fmt(add(-120)),
        dataVencimento: fmt(add(-60)),  // matrícula cancelada
        cobranca: null,
      },
    ];

    for (const a of alunos) {
      // Verifica se já existe (evita duplicatas em re-runs)
      const { rows: existe } = await client.query(
        `SELECT id FROM alunos WHERE tenant_id = $1 AND telefone = $2`,
        [tenantId, a.telefone.replace(/\D/g, "")]
      );
      if (existe.length) {
        console.log(`  ↩  Já existe: ${a.nome} — pulando`);
        continue;
      }

      const alunoId     = randomUUID();
      const matriculaId = randomUUID();

      await client.query(
        `INSERT INTO alunos (id, tenant_id, nome, telefone, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [alunoId, tenantId, a.nome, a.telefone.replace(/\D/g, ""), a.status]
      );

      await client.query(
        `INSERT INTO matriculas_alunos (id, tenant_id, aluno_id, plano_id, data_inicio, data_vencimento, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [matriculaId, tenantId, alunoId, planoId, a.dataInicio, a.dataVencimento, a.matriculaStatus]
      );

      if (a.cobranca) {
        await client.query(
          `INSERT INTO cobrancas_alunos (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, status, data_pagamento, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [
            randomUUID(), tenantId, alunoId, matriculaId,
            valorCents, a.dataVencimento,
            a.cobranca.status, a.cobranca.dataPagamento,
          ]
        );
      }

      console.log(`✓  Criado: ${a.nome} [${a.status}]`);
    }

    console.log("\n✅  Seed concluído! Acesse /alunos para ver os testes.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ ", err.message);
  process.exit(1);
});

/**
 * prisma/seed-academia.mjs
 * Seed de dados fictícios para o módulo Academia.
 *
 * Execução:
 *   docker exec whatsapp_saas_web node --env-file=.env prisma/seed-academia.mjs
 *
 * Idempotente: usa ON CONFLICT DO NOTHING / verificações antes de inserir.
 *
 * O que faz:
 *  1. Busca o tenant do usuário logado (via env SEED_EMAIL ou padrão do .env)
 *  2. Configura sub_nicho = "academia" no tenant
 *  3. Garante subscription ACTIVE
 *  4. Cria 4 planos de academia
 *  5. Cria 22 alunos com status variados
 *  6. Cria matrículas
 *  7. Cria cobranças (PAGO / PENDENTE / VENCIDO)
 *  8. Cria histórico de check-ins (30 dias)
 */

import pg from "pg";
const { Pool } = pg;

const USER_EMAIL = process.env.SEED_EMAIL ?? "samuel.bispon01@gmail.com";
const pool = new Pool({ connectionString: process.env.DIRECT_URL });

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsFromNow(n) {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padTime(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Alunos fictícios ─────────────────────────────────────────────────────────

const ALUNOS = [
  { nome: "Amanda Silveira",   tel: "11991230001", email: "amanda.silveira@gmail.com",   nasc: "1995-06-14", status: "ATIVO"        },
  { nome: "Thiago Nascimento", tel: "11991230002", email: "thiago.nascimento@gmail.com", nasc: "1990-03-22", status: "ATIVO"        },
  { nome: "Isabela Santos",    tel: "11991230003", email: "isabela.santos@gmail.com",    nasc: "1998-11-05", status: "INADIMPLENTE" },
  { nome: "Gustavo Pereira",   tel: "11991230004", email: "gustavo.pereira@gmail.com",   nasc: "1988-07-30", status: "ATIVO"        },
  { nome: "Larissa Mendes",    tel: "11991230005", email: "larissa.mendes@gmail.com",    nasc: "1993-12-01", status: "SUSPENSO"     },
  { nome: "Vinicius Castro",   tel: "11991230006", email: "vinicius.castro@gmail.com",   nasc: "1997-02-18", status: "INADIMPLENTE" },
  { nome: "Carla Ferreira",    tel: "11991230007", email: "carla.ferreira@gmail.com",    nasc: "1992-09-25", status: "ATIVO"        },
  { nome: "Julio Lima",        tel: "11991230008", email: "julio.lima@gmail.com",        nasc: "1985-04-10", status: "ATIVO"        },
  { nome: "Patrícia Alves",    tel: "11991230009", email: "patricia.alves@gmail.com",    nasc: "1996-08-17", status: "ATIVO"        },
  { nome: "Diego Martins",     tel: "11991230010", email: "diego.martins@gmail.com",     nasc: "1991-01-09", status: "ATIVO"        },
  { nome: "Letícia Rocha",     tel: "11991230011", email: "leticia.rocha@gmail.com",     nasc: "1999-06-22", status: "ATIVO"        },
  { nome: "Paulo Henrique",    tel: "11991230012", email: "paulo.henrique@gmail.com",    nasc: "1987-05-03", status: "ATIVO"        },
  { nome: "Camila Torres",     tel: "11991230013", email: "camila.torres@gmail.com",     nasc: "1994-10-28", status: "ATIVO"        },
  { nome: "Rafael Gomes",      tel: "11991230014", email: "rafael.gomes@gmail.com",      nasc: "2000-03-15", status: "ATIVO"        },
  { nome: "Carlos Mendonça",   tel: "11991230015", email: "carlos.mendonca@gmail.com",   nasc: "1983-07-07", status: "INATIVO"      },
  { nome: "Fernanda Lima",     tel: "11991230016", email: "fernanda.lima@gmail.com",     nasc: "1995-11-20", status: "ATIVO"        },
  { nome: "Ricardo Souza",     tel: "11991230017", email: "ricardo.souza@gmail.com",     nasc: "1989-04-14", status: "INADIMPLENTE" },
  { nome: "Ana Paula Costa",   tel: "11991230018", email: "ana.paula@gmail.com",         nasc: "1993-06-17", status: "ATIVO"        },
  { nome: "Marcos Oliveira",   tel: "11991230019", email: "marcos.oliveira@gmail.com",   nasc: "1986-06-17", status: "ATIVO"        },
  { nome: "Juliana Ferreira",  tel: "11991230020", email: "juliana.ferreira@gmail.com",  nasc: "2001-06-22", status: "ATIVO"        },
  { nome: "Bruno Carvalho",    tel: "11991230021", email: "bruno.carvalho@gmail.com",    nasc: "1990-06-28", status: "ATIVO"        },
  { nome: "Felipe Goncalves",  tel: "11991230022", email: "felipe.goncalves@gmail.com",  nasc: "1997-08-11", status: "ATIVO"        },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏋️  Academia Seed — email: ${USER_EMAIL}\n`);

  // ── 0. Garantir tabela frequencia_alunos existe ────────────────────────────
  await q(`
    CREATE TABLE IF NOT EXISTS frequencia_alunos (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    UUID        NOT NULL,
      aluno_id     UUID        NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      data         DATE        NOT NULL,
      hora_entrada VARCHAR(5),
      hora_saida   VARCHAR(5),
      observacoes  TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (aluno_id, data)
    )
  `);
  console.log("  ✓ Tabela frequencia_alunos OK");

  // ── 1. Buscar ou criar usuário / tenant ───────────────────────────────────
  let userRes = await q(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [USER_EMAIL]);
  let userId;

  if (!userRes.rows.length) {
    console.log("  ⚠  Usuário não encontrado — criando registro...");
    const r = await q(
      `INSERT INTO users (id, email, nome, data_criacao)
       VALUES (gen_random_uuid(), $1, 'Samuel Bispo', now())
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [USER_EMAIL]
    );
    userId = r.rows[0].id;
    console.log(`  ✓ Usuário criado: ${USER_EMAIL}`);
  } else {
    userId = userRes.rows[0].id;
    console.log(`  ✓ Usuário encontrado: ${USER_EMAIL}`);
  }

  let tenantRes = await q(`SELECT id, nome, "companyName" as company_name FROM tenants WHERE user_id = $1 LIMIT 1`, [userId]);
  let tenantId, tenantNome, company_name;

  if (!tenantRes.rows.length) {
    console.log("  ⚠  Tenant não encontrado — criando...");
    const r = await q(
      `INSERT INTO tenants (id, user_id, nome)
       VALUES (gen_random_uuid(), $1, 'Academia FitMax')
       RETURNING id, nome`,
      [userId]
    );
    tenantId    = r.rows[0].id;
    tenantNome  = r.rows[0].nome;
    company_name = tenantNome;
    console.log(`  ✓ Tenant criado: ${tenantNome} (${tenantId})`);
  } else {
    ({ id: tenantId, nome: tenantNome, company_name } = tenantRes.rows[0]);
    console.log(`  ✓ Tenant: ${company_name || tenantNome} (${tenantId})`);
  }

  // ── 2. Configurar sub_nicho = academia ─────────────────────────────────────
  await q(
    `UPDATE tenants
     SET config_nicho = '{"sub_nicho":"academia"}'::jsonb,
         "companyName" = COALESCE(NULLIF("companyName",''), 'Academia FitMax')
     WHERE id = $1`,
    [tenantId]
  );
  console.log("  ✓ sub_nicho → academia");

  // ── 3. Garantir subscription ACTIVE ────────────────────────────────────────
  const subRes = await q(`SELECT id, status FROM subscriptions WHERE tenant_id = $1`, [tenantId]);

  if (!subRes.rows.length) {
    const planRes = await q(`SELECT id FROM plans WHERE niche = 'DELIVERY' LIMIT 1`);
    if (!planRes.rows.length) {
      console.warn("  ⚠  Nenhum plano encontrado — execute primeiro: node --env-file=.env prisma/seed.mjs");
    } else {
      await q(
        `INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, 'ACTIVE', $3, $4, now(), now())`,
        [tenantId, planRes.rows[0].id, daysAgo(30), monthsFromNow(11)]
      );
      console.log("  ✓ Subscription criada (ACTIVE)");
    }
  } else if (subRes.rows[0].status !== "ACTIVE") {
    await q(`UPDATE subscriptions SET status = 'ACTIVE', updated_at = now() WHERE tenant_id = $1`, [tenantId]);
    console.log("  ✓ Subscription → ACTIVE");
  } else {
    console.log("  ✓ Subscription já ACTIVE");
  }

  // ── 4. Planos de academia ──────────────────────────────────────────────────
  console.log("\n📋  Planos de academia...");

  const planosDefinicoes = [
    { nome: "Plano Mensal",     desc: "Acesso livre por 1 mês",                       valor: 12000, per: "MENSAL"      },
    { nome: "Plano Trimestral", desc: "3 meses — 10% de desconto",                   valor: 32000, per: "TRIMESTRAL"  },
    { nome: "Plano Semestral",  desc: "6 meses — 15% de desconto",                   valor: 55000, per: "SEMESTRAL"   },
    { nome: "Plano Anual",      desc: "12 meses — 25% de desconto, melhor custo-benefício", valor: 99000, per: "ANUAL"},
  ];

  const planos = [];
  for (const p of planosDefinicoes) {
    const exist = await q(
      `SELECT id, valor_cents FROM planos_academia WHERE tenant_id = $1 AND nome = $2`,
      [tenantId, p.nome]
    );
    if (exist.rows.length) {
      planos.push({ id: exist.rows[0].id, nome: p.nome, valor: exist.rows[0].valor_cents, per: p.per });
      console.log(`  ↩  ${p.nome} (já existe)`);
    } else {
      const r = await q(
        `INSERT INTO planos_academia (id, tenant_id, nome, descricao, valor_cents, periodicidade, ativo, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::"Periodicidade", true, now(), now())
         RETURNING id`,
        [tenantId, p.nome, p.desc, p.valor, p.per]
      );
      planos.push({ id: r.rows[0].id, nome: p.nome, valor: p.valor, per: p.per });
      console.log(`  ✓ ${p.nome} — R$ ${(p.valor / 100).toFixed(2)}`);
    }
  }

  // ── 5. Alunos + matrículas + cobranças ────────────────────────────────────
  console.log("\n👥  Alunos, matrículas e cobranças...");

  const alunosCriados = [];

  for (let i = 0; i < ALUNOS.length; i++) {
    const a = ALUNOS[i];
    const plano = planos[i % planos.length];

    // Aluno
    let alunoId;
    const existAluno = await q(
      `SELECT id FROM alunos WHERE tenant_id = $1 AND telefone = $2`,
      [tenantId, a.tel]
    );

    if (existAluno.rows.length) {
      alunoId = existAluno.rows[0].id;
      console.log(`  ↩  ${a.nome} (já existe)`);
    } else {
      const r = await q(
        `INSERT INTO alunos (id, tenant_id, nome, telefone, email, data_nascimento, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::"AlunoStatus", now(), now())
         RETURNING id`,
        [tenantId, a.nome, a.tel, a.email, a.nasc, a.status]
      );
      alunoId = r.rows[0].id;
      console.log(`  ✓ ${a.nome} [${a.status}]`);
    }

    alunosCriados.push({ id: alunoId, nome: a.nome, status: a.status });

    // Matrícula
    const existMat = await q(
      `SELECT id FROM matriculas_alunos WHERE tenant_id = $1 AND aluno_id = $2 LIMIT 1`,
      [tenantId, alunoId]
    );

    let matriculaId = null;
    if (!existMat.rows.length) {
      let dataInicio, dataVenc, matStatus;

      if (a.status === "ATIVO") {
        dataInicio = daysAgo(rand(30, 180));
        dataVenc   = daysFromNow(rand(5, 45));
        matStatus  = "ATIVA";
      } else if (a.status === "INADIMPLENTE") {
        dataInicio = daysAgo(rand(60, 120));
        dataVenc   = daysAgo(rand(5, 20));
        matStatus  = "VENCIDA";
      } else if (a.status === "SUSPENSO") {
        dataInicio = daysAgo(90);
        dataVenc   = daysAgo(15);
        matStatus  = "ATIVA";
      } else {
        dataInicio = daysAgo(200);
        dataVenc   = daysAgo(60);
        matStatus  = "VENCIDA";
      }

      const r = await q(
        `INSERT INTO matriculas_alunos (id, aluno_id, plano_id, tenant_id, data_inicio, data_vencimento, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::"MatriculaStatus", now(), now())
         RETURNING id`,
        [alunoId, plano.id, tenantId, dataInicio, dataVenc, matStatus]
      );
      matriculaId = r.rows[0].id;
    } else {
      matriculaId = existMat.rows[0].id;
    }

    // Cobranças
    const existCob = await q(
      `SELECT COUNT(*) FROM cobrancas_alunos WHERE tenant_id = $1 AND aluno_id = $2`,
      [tenantId, alunoId]
    );

    if (existCob.rows[0].count === "0" && matriculaId) {
      if (a.status === "ATIVO") {
        // 2-3 cobranças pagas no histórico
        const numPagas = rand(2, 3);
        for (let m = numPagas; m >= 1; m--) {
          const venc = daysAgo(m * 30);
          const pago = new Date(venc.getTime() + rand(0, 5) * 86400000);
          await q(
            `INSERT INTO cobrancas_alunos
               (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, data_pagamento, status, descricao, enviada_whatsapp, created_at, updated_at)
             VALUES
               (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'PAGO'::"CobrancaStatus", $7, true, now(), now())`,
            [tenantId, alunoId, matriculaId, plano.valor, venc, pago, `Mensalidade ${plano.nome} — ref. ${m}x atrás`]
          );
        }
        // Cobrança atual (pendente, vence em 7-14 dias)
        await q(
          `INSERT INTO cobrancas_alunos
             (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, status, descricao, enviada_whatsapp, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDENTE'::"CobrancaStatus", $6, false, now(), now())`,
          [tenantId, alunoId, matriculaId, plano.valor, daysFromNow(rand(7, 14)), `Mensalidade ${plano.nome} — jun/2026`]
        );
      } else if (a.status === "INADIMPLENTE") {
        // 1 paga antiga + 1 vencida
        await q(
          `INSERT INTO cobrancas_alunos
             (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, data_pagamento, status, descricao, enviada_whatsapp, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'PAGO'::"CobrancaStatus", $7, true, now(), now())`,
          [tenantId, alunoId, matriculaId, plano.valor, daysAgo(60), daysAgo(58), `Mensalidade ${plano.nome} — abr/2026`]
        );
        await q(
          `INSERT INTO cobrancas_alunos
             (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, status, descricao, enviada_whatsapp, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, 'VENCIDO'::"CobrancaStatus", $6, true, now(), now())`,
          [tenantId, alunoId, matriculaId, plano.valor, daysAgo(rand(5, 15)), `Mensalidade ${plano.nome} — mai/2026`]
        );
      } else if (a.status === "SUSPENSO") {
        await q(
          `INSERT INTO cobrancas_alunos
             (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, status, descricao, enviada_whatsapp, created_at, updated_at)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDENTE'::"CobrancaStatus", $6, false, now(), now())`,
          [tenantId, alunoId, matriculaId, plano.valor, daysAgo(15), `Mensalidade ${plano.nome} — mai/2026`]
        );
      }
    }
  }

  // ── 6. Check-ins de frequência (últimos 30 dias) ──────────────────────────
  console.log("\n📅  Histórico de check-ins (últimos 30 dias)...");

  const alunosAtivos = alunosCriados.filter((a) => a.status === "ATIVO");

  // Cada aluno tem 2-3 dias preferidos de treino (1=Seg, 2=Ter, ..., 6=Sab)
  const treinos = new Map();
  for (const aluno of alunosAtivos) {
    const todos = [1, 2, 3, 4, 5, 6];
    // Embaralha e pega 3
    for (let k = todos.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [todos[k], todos[j]] = [todos[j], todos[k]];
    }
    treinos.set(aluno.id, todos.slice(0, 3));
  }

  let checkinsOk = 0;
  let checkinsSkip = 0;

  for (let dBack = 29; dBack >= 0; dBack--) {
    const dataObj = daysAgo(dBack);
    const diaSemana = dataObj.getDay();
    const dataStr = dataObj.toISOString().split("T")[0];

    for (const aluno of alunosAtivos) {
      const diasPref = treinos.get(aluno.id) ?? [];
      if (!diasPref.includes(diaSemana)) continue;
      if (Math.random() > 0.82) continue; // 18% chance de faltar no dia preferido

      const horaH = rand(6, 9);
      const horaM = Math.random() > 0.5 ? 0 : 30;
      const saidaH = horaH + rand(1, 2);
      const saidaM = Math.random() > 0.5 ? 0 : 30;

      try {
        await q(
          `INSERT INTO frequencia_alunos (id, tenant_id, aluno_id, data, hora_entrada, hora_saida, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())
           ON CONFLICT (aluno_id, data) DO NOTHING`,
          [tenantId, aluno.id, dataStr, padTime(horaH, horaM), padTime(saidaH, saidaM)]
        );
        checkinsOk++;
      } catch (e) {
        checkinsSkip++;
      }
    }
  }

  console.log(`  ✓ ${checkinsOk} check-ins inseridos, ${checkinsSkip} ignorados`);

  // ── Resumo final ──────────────────────────────────────────────────────────
  const [ra, rc, rf] = await Promise.all([
    q(`SELECT COUNT(*) FROM alunos WHERE tenant_id = $1`, [tenantId]),
    q(`SELECT COUNT(*) FROM cobrancas_alunos WHERE tenant_id = $1`, [tenantId]),
    q(`SELECT COUNT(*) FROM frequencia_alunos WHERE tenant_id = $1`, [tenantId]),
  ]);

  console.log("\n✅  Seed concluído!");
  console.log(`   Alunos:    ${ra.rows[0].count}`);
  console.log(`   Cobranças: ${rc.rows[0].count}`);
  console.log(`   Check-ins: ${rf.rows[0].count}`);
  console.log(`   Planos:    ${planos.length}`);
  console.log("\n   👉 Acesse: http://localhost:3000/dashboard/academia\n");
}

main()
  .catch((e) => { console.error("\n❌  Erro:", e.message); process.exit(1); })
  .finally(() => pool.end());

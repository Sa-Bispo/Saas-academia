/**
 * Seed de demonstração — 5 planos + 456 alunos com distribuição realista
 * Uso: node --env-file=.env.local scripts/seed-demo.mjs
 */

import pg from "pg";
import { randomUUID } from "node:crypto";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Nomes fictícios brasileiros ───────────────────────────────────────────────

const PRIMEIROS = [
  "Ana","Bruno","Carlos","Diana","Eduardo","Fernanda","Gabriel","Helena","Igor","Juliana",
  "Kevin","Larissa","Marcos","Natalia","Otávio","Patrícia","Rafael","Sabrina","Thiago","Vanessa",
  "Alexsandro","Bianca","Caio","Débora","Emerson","Flávia","Gustavo","Isabela","João","Karen",
  "Leonardo","Mariana","Nicolas","Olivia","Paulo","Renata","Sávio","Tatiane","Ulisses","Viviane",
  "Wagner","Yasmin","Adriano","Beatriz","Cláudio","Daniela","Elias","Fabio","Giovana","Henrique",
  "Ivan","Jéssica","Kaio","Letícia","Miguel","Nathalia","Oswaldo","Priscila","Rodrigo","Simone",
  "Tiago","Ursula","Vitor","Wanda","Alexandre","Bruna","Cristiano","Denise","Evandro","Francisca",
  "Geraldo","Heloisa","Italo","Joana","Klaus","Luciana","Matheus","Nadia","Orlando","Paloma",
  "Quezia","Renato","Samuel","Talita","Umberto","Veridiana","Welton","Xiomara","Yuri","Zélia",
];

const SOBRENOMES = [
  "Silva","Santos","Oliveira","Souza","Lima","Pereira","Costa","Rodrigues","Almeida","Nascimento",
  "Ferreira","Carvalho","Gomes","Martins","Araújo","Melo","Barbosa","Ribeiro","Rocha","Cardoso",
  "Correia","Teixeira","Nunes","Mendes","Monteiro","Lopes","Moreira","Freitas","Azevedo","Castro",
  "Ramos","Cunha","Pinto","Andrade","Moraes","Farias","Coelho","Leite","Vieira","Dias",
  "Pires","Xavier","Borges","Campos","Cavalcanti","Batista","Duarte","Medeiros","Carmo","Torres",
];

function nomeAleatorio(i) {
  const p = PRIMEIROS[i % PRIMEIROS.length];
  const s = SOBRENOMES[Math.floor(i / PRIMEIROS.length) % SOBRENOMES.length];
  const s2 = SOBRENOMES[(i * 7 + 13) % SOBRENOMES.length];
  return `${p} ${s} ${s2}`;
}

function telefone(i) {
  const ddd = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];
  const d = ddd[i % ddd.length];
  const n = String(900000000 + (i * 9871) % 99999999).slice(0, 9);
  return `(${d}) 9${n.slice(0,4)}-${n.slice(4,8)}`;
}

function cpfFake(i) {
  const n = String(i + 1).padStart(9, "0");
  return `${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-00`;
}

function email(nome, i) {
  const [primeiro] = nome.toLowerCase().split(" ");
  return `${primeiro}${i}@email.com`.replace(/\s/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function diasAFrente(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dataNascimento(i) {
  const ano = 1975 + (i * 3 % 30);
  const mes = (i % 12) + 1;
  const dia = (i % 28) + 1;
  return new Date(`${ano}-${String(mes).padStart(2,"0")}-${String(dia).padStart(2,"0")}`);
}

// ── Planos ────────────────────────────────────────────────────────────────────

const PLANOS_DEMO = [
  { nome: "Musculação Básico",   descricao: "Acesso à sala de musculação de segunda a sábado.",          valor_cents: 8990,  valor_pix: 8090,  valor_dinheiro: 9500,  peso: 35 },
  { nome: "Musculação + Cardio", descricao: "Musculação + área de cardio e esteiras liberadas.",          valor_cents: 12990, valor_pix: 11690, valor_dinheiro: 13500, peso: 25 },
  { nome: "Plano Completo",      descricao: "Musculação, cardio, aulas coletivas e avaliação física.",   valor_cents: 17990, valor_pix: 16190, valor_dinheiro: 18500, peso: 20 },
  { nome: "Aulas Coletivas",     descricao: "Acesso ilimitado a todas as aulas coletivas.",              valor_cents: 10990, valor_pix: 9890,  valor_dinheiro: 11500, peso: 15 },
  { nome: "VIP Anual",           descricao: "Plano anual com todos os benefícios + personal 2x/semana.", valor_cents: 14990, valor_pix: 13490, valor_dinheiro: 15500, peso: 5  },
];

// Distribuição ponderada — retorna índice do plano baseado no peso
function planoParaAluno(i, planoIds) {
  const pesos = PLANOS_DEMO.map(p => p.peso);
  const total = pesos.reduce((a, b) => a + b, 0);
  // Usa uma sequência determinística baseada em i para distribuir uniformemente
  const slot = (i * 7 + i % 13) % total;
  let acc = 0;
  for (let p = 0; p < pesos.length; p++) {
    acc += pesos[p];
    if (slot < acc) return planoIds[p];
  }
  return planoIds[0];
}

// ── Distribuição de status ────────────────────────────────────────────────────
// 87% ATIVO, 6% INADIMPLENTE, 4% INATIVO, 2% SUSPENSO, 1% SEM_MATRICULA

function statusAluno(i, total) {
  const pct = i / total;
  if (pct < 0.87)  return "ATIVO";
  if (pct < 0.93)  return "INADIMPLENTE";
  if (pct < 0.97)  return "INATIVO";
  if (pct < 0.99)  return "SUSPENSO";
  return "SEM_MATRICULA";
}

function statusMatricula(alunoStatus) {
  if (alunoStatus === "ATIVO") return "ATIVA";
  if (alunoStatus === "INADIMPLENTE") return "VENCIDA";
  if (alunoStatus === "INATIVO") return "CANCELADA";
  return "VENCIDA";
}

function gerarCobrancas(alunoStatus, alunoId, tenantId, matriculaId, planoValor) {
  const cobrancas = [];
  const agora = new Date();

  if (alunoStatus === "ATIVO") {
    // 3 meses anteriores PAGO + mês atual PAGO
    for (let m = 3; m >= 0; m--) {
      const venc = new Date(agora);
      venc.setMonth(venc.getMonth() - m);
      venc.setDate(10);
      const pago = new Date(venc);
      pago.setDate(pago.getDate() - (m === 0 ? 2 : 0)); // atual: pagou há 2 dias
      cobrancas.push({
        id: randomUUID(), tenant_id: tenantId, aluno_id: alunoId, matricula_id: matriculaId,
        valor_cents: planoValor, data_vencimento: venc,
        data_pagamento: m === 0 ? pago : new Date(venc.getTime() - 5 * 86400000),
        status: "PAGO", descricao: `Mensalidade ${venc.toLocaleString("pt-BR",{month:"long",year:"numeric"})}`,
        forma_pagamento: Math.random() > 0.5 ? "PIX" : "DINHEIRO",
      });
    }
  } else if (alunoStatus === "INADIMPLENTE") {
    // mês atual VENCIDO + 2 anteriores PAGO
    for (let m = 2; m >= 0; m--) {
      const venc = new Date(agora);
      venc.setMonth(venc.getMonth() - m);
      venc.setDate(10);
      const isPago = m > 0;
      cobrancas.push({
        id: randomUUID(), tenant_id: tenantId, aluno_id: alunoId, matricula_id: matriculaId,
        valor_cents: planoValor, data_vencimento: venc,
        data_pagamento: isPago ? new Date(venc.getTime() - 3 * 86400000) : null,
        status: isPago ? "PAGO" : "VENCIDO",
        descricao: `Mensalidade ${venc.toLocaleString("pt-BR",{month:"long",year:"numeric"})}`,
        forma_pagamento: isPago ? "PIX" : null,
      });
    }
  } else if (alunoStatus === "INATIVO") {
    // 2 cobranças canceladas
    for (let m = 1; m >= 0; m--) {
      const venc = new Date(agora);
      venc.setMonth(venc.getMonth() - m - 1);
      venc.setDate(10);
      cobrancas.push({
        id: randomUUID(), tenant_id: tenantId, aluno_id: alunoId, matricula_id: matriculaId,
        valor_cents: planoValor, data_vencimento: venc, data_pagamento: null,
        status: "CANCELADA", descricao: `Mensalidade ${venc.toLocaleString("pt-BR",{month:"long",year:"numeric"})}`,
        forma_pagamento: null,
      });
    }
  } else if (alunoStatus === "SUSPENSO") {
    const venc = new Date(agora);
    venc.setDate(10);
    venc.setMonth(venc.getMonth() - 1);
    cobrancas.push({
      id: randomUUID(), tenant_id: tenantId, aluno_id: alunoId, matricula_id: matriculaId,
      valor_cents: planoValor, data_vencimento: venc, data_pagamento: null,
      status: "VENCIDO", descricao: `Mensalidade em atraso`,
      forma_pagamento: null,
    });
  }

  return cobrancas;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();

  try {
    // Busca tenant de teste
    const { rows: tenants } = await client.query(
      `SELECT t.id FROM tenants t JOIN users u ON u.id = t.user_id WHERE u.email = 'teste@academia.com'`
    );
    if (!tenants.length) throw new Error("Tenant 'teste@academia.com' não encontrado. Rode create-test-tenant.mjs primeiro.");
    const tenantId = tenants[0].id;
    console.log(`✓ Tenant: ${tenantId}`);

    // Limpa dados anteriores (seed idempotente)
    console.log("→ Limpando dados anteriores...");
    await client.query(`DELETE FROM cobrancas_alunos WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM matriculas_alunos WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM alunos WHERE tenant_id = $1`, [tenantId]);
    await client.query(`DELETE FROM planos_academia WHERE tenant_id = $1`, [tenantId]);

    // Cria 5 planos
    console.log("→ Criando 5 planos...");
    const planoIds = [];
    for (const p of PLANOS_DEMO) {
      const id = randomUUID();
      await client.query(
        `INSERT INTO planos_academia (id, tenant_id, nome, descricao, valor_cents, periodicidade, ativo, valor_cents_pix, valor_cents_dinheiro, updated_at)
         VALUES ($1,$2,$3,$4,$5,'MENSAL',true,$6,$7,NOW())`,
        [id, tenantId, p.nome, p.descricao, p.valor_cents, p.valor_pix, p.valor_dinheiro]
      );
      planoIds.push({ id, valor: p.valor_cents });
      console.log(`  ✓ ${p.nome} — R$ ${(p.valor_cents/100).toFixed(2)}`);
    }

    // Cria 456 alunos em lotes
    const TOTAL = 456;
    console.log(`\n→ Criando ${TOTAL} alunos com matriculas e cobranças...`);

    let totalCobrancas = 0;
    const LOTE = 50;

    for (let i = 0; i < TOTAL; i++) {
      const nome = nomeAleatorio(i);
      const alunoStatus = statusAluno(i, TOTAL);
      const plano = planoParaAluno(i, planoIds);
      const alunoId = randomUUID();
      const matriculaId = randomUUID();

      const dataInicio = diasAtras(90 + (i % 180));
      const dataVenc = alunoStatus === "ATIVO"
        ? diasAFrente(20 - (i % 20))
        : diasAtras(10 + (i % 30));

      await client.query(
        `INSERT INTO alunos (id, tenant_id, nome, telefone, email, cpf, data_nascimento, status, optout_cobranca, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::\"AlunoStatus\",false,NOW())`,
        [alunoId, tenantId, nome, telefone(i), email(nome, i), cpfFake(i), dataNascimento(i), alunoStatus]
      );

      if (alunoStatus !== "SEM_MATRICULA") {
        await client.query(
          `INSERT INTO matriculas_alunos (id, aluno_id, plano_id, tenant_id, data_inicio, data_vencimento, status, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7::\"MatriculaStatus\",NOW())`,
          [matriculaId, alunoId, plano.id, tenantId, dataInicio, dataVenc, statusMatricula(alunoStatus)]
        );

        const cobrancas = gerarCobrancas(alunoStatus, alunoId, tenantId, matriculaId, plano.valor);
        for (const c of cobrancas) {
          await client.query(
            `INSERT INTO cobrancas_alunos (id, tenant_id, aluno_id, matricula_id, valor_cents, data_vencimento, data_pagamento, status, descricao, forma_pagamento, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8::\"CobrancaStatus\",$9,$10::\"FormaPagamento\",NOW())`,
            [c.id, c.tenant_id, c.aluno_id, c.matricula_id, c.valor_cents, c.data_vencimento,
             c.data_pagamento, c.status, c.descricao, c.forma_pagamento]
          );
          totalCobrancas++;
        }
      }

      if ((i + 1) % LOTE === 0 || i === TOTAL - 1) {
        process.stdout.write(`\r  ${i + 1}/${TOTAL} alunos inseridos...`);
      }
    }

    console.log("\n");

    // Resumo
    const { rows: stats } = await client.query(
      `SELECT status, COUNT(*) FROM alunos WHERE tenant_id = $1 GROUP BY status ORDER BY status`, [tenantId]
    );
    const { rows: cobStats } = await client.query(
      `SELECT status, COUNT(*) FROM cobrancas_alunos WHERE tenant_id = $1 GROUP BY status ORDER BY status`, [tenantId]
    );

    console.log("✅ Seed concluído!\n");
    console.log("── Alunos por status ──────────────────");
    for (const r of stats) console.log(`   ${r.status.padEnd(15)} ${r.count}`);
    console.log("\n── Cobranças por status ───────────────");
    for (const r of cobStats) console.log(`   ${r.status.padEnd(22)} ${r.count}`);
    console.log(`\n   Total alunos   : ${TOTAL}`);
    console.log(`   Total cobranças: ${totalCobrancas}`);
    console.log("\n   Acesse: http://localhost:3000/login");
    console.log("   E-mail: teste@academia.com | Senha: Teste@2026\n");

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("\n✗ Erro:", err.message);
  process.exit(1);
});

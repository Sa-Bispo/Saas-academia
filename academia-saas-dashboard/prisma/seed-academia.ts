/**
 * prisma/seed-academia.ts
 * Seed de dados fictícios para o módulo Academia.
 *
 * Execução:
 *   docker exec whatsapp_saas_web npx tsx prisma/seed-academia.ts
 *
 * O que faz:
 *  1. Busca o tenant do usuário pelo e-mail
 *  2. Configura o tenant para sub_nicho = "academia"
 *  3. Garante que existe uma subscription ACTIVE
 *  4. Cria 4 planos de academia
 *  5. Cria 22 alunos com status variados
 *  6. Cria matrículas para cada aluno
 *  7. Cria cobranças com status PAGO / PENDENTE / VENCIDO
 *  8. Cria histórico de frequência dos últimos 30 dias
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const USER_EMAIL = process.env.SEED_EMAIL ?? "samuel.bispon01@gmail.com";

const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthsFromNow(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Dados fictícios ──────────────────────────────────────────────────────────

const ALUNOS_DATA = [
  { nome: "Amanda Silveira",    telefone: "11991230001", email: "amanda.silveira@gmail.com",    dataNascimento: new Date("1995-06-14"), status: "ATIVO"        as const },
  { nome: "Thiago Nascimento",  telefone: "11991230002", email: "thiago.nascimento@gmail.com",  dataNascimento: new Date("1990-03-22"), status: "ATIVO"        as const },
  { nome: "Isabela Santos",     telefone: "11991230003", email: "isabela.santos@gmail.com",     dataNascimento: new Date("1998-11-05"), status: "INADIMPLENTE" as const },
  { nome: "Gustavo Pereira",    telefone: "11991230004", email: "gustavo.pereira@gmail.com",    dataNascimento: new Date("1988-07-30"), status: "ATIVO"        as const },
  { nome: "Larissa Mendes",     telefone: "11991230005", email: "larissa.mendes@gmail.com",     dataNascimento: new Date("1993-12-01"), status: "SUSPENSO"     as const },
  { nome: "Vinicius Castro",    telefone: "11991230006", email: "vinicius.castro@gmail.com",    dataNascimento: new Date("1997-02-18"), status: "INADIMPLENTE" as const },
  { nome: "Carla Ferreira",     telefone: "11991230007", email: "carla.ferreira@gmail.com",     dataNascimento: new Date("1992-09-25"), status: "ATIVO"        as const },
  { nome: "Julio Lima",         telefone: "11991230008", email: "julio.lima@gmail.com",         dataNascimento: new Date("1985-04-10"), status: "ATIVO"        as const },
  { nome: "Patrícia Alves",     telefone: "11991230009", email: "patricia.alves@gmail.com",     dataNascimento: new Date("1996-08-17"), status: "ATIVO"        as const },
  { nome: "Diego Martins",      telefone: "11991230010", email: "diego.martins@gmail.com",      dataNascimento: new Date("1991-01-09"), status: "ATIVO"        as const },
  { nome: "Letícia Rocha",      telefone: "11991230011", email: "leticia.rocha@gmail.com",      dataNascimento: new Date("1999-06-22"), status: "ATIVO"        as const },
  { nome: "Paulo Henrique",     telefone: "11991230012", email: "paulo.henrique@gmail.com",     dataNascimento: new Date("1987-05-03"), status: "ATIVO"        as const },
  { nome: "Camila Torres",      telefone: "11991230013", email: "camila.torres@gmail.com",      dataNascimento: new Date("1994-10-28"), status: "ATIVO"        as const },
  { nome: "Rafael Gomes",       telefone: "11991230014", email: "rafael.gomes@gmail.com",       dataNascimento: new Date("2000-03-15"), status: "ATIVO"        as const },
  { nome: "Carlos Mendonça",    telefone: "11991230015", email: "carlos.mendonca@gmail.com",    dataNascimento: new Date("1983-07-07"), status: "INATIVO"      as const },
  { nome: "Fernanda Lima",      telefone: "11991230016", email: "fernanda.lima@gmail.com",      dataNascimento: new Date("1995-11-20"), status: "ATIVO"        as const },
  { nome: "Ricardo Souza",      telefone: "11991230017", email: "ricardo.souza@gmail.com",      dataNascimento: new Date("1989-04-14"), status: "INADIMPLENTE" as const },
  { nome: "Ana Paula Costa",    telefone: "11991230018", email: "ana.paula.costa@gmail.com",    dataNascimento: new Date("1993-06-17"), status: "ATIVO"        as const },
  { nome: "Marcos Oliveira",    telefone: "11991230019", email: "marcos.oliveira@gmail.com",    dataNascimento: new Date("1986-06-17"), status: "ATIVO"        as const },
  { nome: "Juliana Ferreira",   telefone: "11991230020", email: "juliana.ferreira@gmail.com",   dataNascimento: new Date("2001-06-22"), status: "ATIVO"        as const },
  { nome: "Bruno Carvalho",     telefone: "11991230021", email: "bruno.carvalho@gmail.com",     dataNascimento: new Date("1990-06-28"), status: "ATIVO"        as const },
  { nome: "Felipe Goncalves",   telefone: "11991230022", email: "felipe.goncalves@gmail.com",   dataNascimento: new Date("1997-08-11"), status: "ATIVO"        as const },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏋️  Academia Seed — usuário: ${USER_EMAIL}\n`);

  // ── 1. Buscar usuário / tenant ────────────────────────────────────────────
  const user = await prisma.user.findFirst({
    where: { email: USER_EMAIL },
    include: { tenants: { take: 1 } },
  });

  if (!user) {
    console.error("❌  Usuário não encontrado. Faça login no sistema primeiro.");
    process.exit(1);
  }

  const tenant = user.tenants[0];
  if (!tenant) {
    console.error("❌  Tenant não encontrado para esse usuário.");
    process.exit(1);
  }

  const tenantId = tenant.id;
  console.log(`  ✓ Tenant: ${tenant.nome} (${tenantId})`);

  // ── 2. Configurar sub_nicho = academia ──────────────────────────────────
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      configNicho: { sub_nicho: "academia" },
      companyName: tenant.companyName ?? "Academia FitMax",
    },
  });
  console.log("  ✓ configNicho → academia");

  // ── 3. Garantir subscription ACTIVE ──────────────────────────────────────
  const existingSub = await prisma.subscription.findUnique({ where: { tenantId } });

  if (!existingSub) {
    // Usa qualquer plano DELIVERY disponível
    const plan = await prisma.plan.findFirst({ where: { niche: "DELIVERY" } });
    if (!plan) {
      console.warn("  ⚠  Nenhum plano encontrado — rode `npx prisma db seed` primeiro.");
    } else {
      await prisma.subscription.create({
        data: {
          tenantId,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: daysAgo(30),
          currentPeriodEnd: monthsFromNow(11),
        },
      });
      console.log("  ✓ Subscription criada (ACTIVE)");
    }
  } else if (existingSub.status !== "ACTIVE") {
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: "ACTIVE" },
    });
    console.log("  ✓ Subscription atualizada → ACTIVE");
  } else {
    console.log("  ✓ Subscription já ACTIVE");
  }

  // ── 4. Planos de academia ─────────────────────────────────────────────────
  console.log("\n📋  Criando planos de academia...");

  const planosData = [
    { nome: "Plano Mensal",      descricao: "Acesso livre à academia por 1 mês",                valorCents: 12000, periodicidade: "MENSAL"      as const },
    { nome: "Plano Trimestral",  descricao: "3 meses com desconto de 10%. Acesso livre.",        valorCents: 32000, periodicidade: "TRIMESTRAL"  as const },
    { nome: "Plano Semestral",   descricao: "6 meses com desconto de 15%. Acesso livre.",        valorCents: 55000, periodicidade: "SEMESTRAL"   as const },
    { nome: "Plano Anual",       descricao: "12 meses com desconto de 25%. Melhor custo-benefício.", valorCents: 99000, periodicidade: "ANUAL"  as const },
  ];

  const planos: Array<{ id: string; nome: string; valorCents: number; periodicidade: string }> = [];

  for (const p of planosData) {
    // Verifica se já existe plano com mesmo nome nesse tenant
    const existing = await prisma.planoAcademia.findFirst({
      where: { tenantId, nome: p.nome },
    });

    if (existing) {
      planos.push(existing);
      console.log(`  ↩  ${p.nome} (já existe)`);
    } else {
      const created = await prisma.planoAcademia.create({
        data: { ...p, tenantId, ativo: true },
      });
      planos.push(created);
      console.log(`  ✓ ${p.nome} — R$ ${(p.valorCents / 100).toFixed(2)}`);
    }
  }

  // ── 5. Alunos + matrículas + cobranças ───────────────────────────────────
  console.log("\n👥  Criando alunos, matrículas e cobranças...");

  const alunosCriados: Array<{ id: string; nome: string; status: string }> = [];

  for (let i = 0; i < ALUNOS_DATA.length; i++) {
    const alunoData = ALUNOS_DATA[i];

    // Verificar se aluno já existe
    const existingAluno = await prisma.aluno.findFirst({
      where: { tenantId, telefone: alunoData.telefone },
    });

    let alunoId: string;

    if (existingAluno) {
      alunoId = existingAluno.id;
      console.log(`  ↩  ${alunoData.nome} (já existe)`);
    } else {
      const aluno = await prisma.aluno.create({
        data: {
          tenantId,
          nome: alunoData.nome,
          telefone: alunoData.telefone,
          email: alunoData.email,
          dataNascimento: alunoData.dataNascimento,
          status: alunoData.status,
        },
      });
      alunoId = aluno.id;
      console.log(`  ✓ ${alunoData.nome} [${alunoData.status}]`);
    }

    alunosCriados.push({ id: alunoId, nome: alunoData.nome, status: alunoData.status });

    // Escolher plano baseado no índice (distribui entre os 4 planos)
    const plano = planos[i % planos.length];

    // Verificar se já tem matrícula ativa
    const existingMatricula = await prisma.matriculaAluno.findFirst({
      where: { tenantId, alunoId },
    });

    let matriculaId: string | null = null;

    if (!existingMatricula) {
      // Define datas baseadas no status do aluno
      let dataInicio: Date;
      let dataVencimento: Date;
      let matriculaStatus: "ATIVA" | "VENCIDA" | "CANCELADA";

      if (alunoData.status === "ATIVO") {
        dataInicio = daysAgo(randomBetween(30, 180));
        dataVencimento = daysFromNow(randomBetween(5, 45));
        matriculaStatus = "ATIVA";
      } else if (alunoData.status === "INADIMPLENTE") {
        dataInicio = daysAgo(randomBetween(60, 120));
        dataVencimento = daysAgo(randomBetween(5, 20));
        matriculaStatus = "VENCIDA";
      } else if (alunoData.status === "SUSPENSO") {
        dataInicio = daysAgo(90);
        dataVencimento = daysAgo(15);
        matriculaStatus = "ATIVA";
      } else {
        // INATIVO
        dataInicio = daysAgo(200);
        dataVencimento = daysAgo(60);
        matriculaStatus = "VENCIDA";
      }

      const matricula = await prisma.matriculaAluno.create({
        data: {
          tenantId,
          alunoId,
          planoId: plano.id,
          dataInicio,
          dataVencimento,
          status: matriculaStatus,
        },
      });
      matriculaId = matricula.id;
    } else {
      matriculaId = existingMatricula.id;
    }

    // ── Cobranças ──────────────────────────────────────────────────────────
    const existingCobrancas = await prisma.cobrancaAluno.count({
      where: { tenantId, alunoId },
    });

    if (existingCobrancas === 0 && matriculaId) {
      if (alunoData.status === "ATIVO") {
        // Histórico: 2-4 cobranças pagas + 1 pendente
        const numPagas = randomBetween(2, 4);
        for (let m = numPagas; m >= 1; m--) {
          await prisma.cobrancaAluno.create({
            data: {
              tenantId,
              alunoId,
              matriculaId,
              valorCents: plano.valorCents,
              dataVencimento: daysAgo(m * 30),
              dataPagamento: daysAgo(m * 30 - randomBetween(0, 5)),
              status: "PAGO",
              descricao: `Mensalidade ${plano.nome} — referência ${m} mês(es) atrás`,
              enviadaWhatsapp: true,
            },
          });
        }
        // Cobrança atual pendente (vencimento em 7-14 dias)
        await prisma.cobrancaAluno.create({
          data: {
            tenantId,
            alunoId,
            matriculaId,
            valorCents: plano.valorCents,
            dataVencimento: daysFromNow(randomBetween(7, 14)),
            status: "PENDENTE",
            descricao: `Mensalidade ${plano.nome} — junho/2026`,
            enviadaWhatsapp: false,
          },
        });
      } else if (alunoData.status === "INADIMPLENTE") {
        // 1-2 cobranças pagas antigas + 1 vencida recente
        await prisma.cobrancaAluno.create({
          data: {
            tenantId,
            alunoId,
            matriculaId,
            valorCents: plano.valorCents,
            dataVencimento: daysAgo(60),
            dataPagamento: daysAgo(58),
            status: "PAGO",
            descricao: `Mensalidade ${plano.nome} — abril/2026`,
            enviadaWhatsapp: true,
          },
        });
        await prisma.cobrancaAluno.create({
          data: {
            tenantId,
            alunoId,
            matriculaId,
            valorCents: plano.valorCents,
            dataVencimento: daysAgo(randomBetween(5, 15)),
            status: "VENCIDO",
            descricao: `Mensalidade ${plano.nome} — maio/2026`,
            enviadaWhatsapp: true,
          },
        });
      } else if (alunoData.status === "SUSPENSO") {
        await prisma.cobrancaAluno.create({
          data: {
            tenantId,
            alunoId,
            matriculaId,
            valorCents: plano.valorCents,
            dataVencimento: daysAgo(15),
            status: "PENDENTE",
            descricao: `Mensalidade ${plano.nome} — maio/2026`,
            enviadaWhatsapp: false,
          },
        });
      }
      // INATIVO: sem cobranças pendentes (era esperado)
    }
  }

  // ── 6. Frequência dos últimos 30 dias ─────────────────────────────────────
  console.log("\n📅  Criando histórico de frequência (últimos 30 dias)...");

  const alunosAtivos = alunosCriados.filter((a) => a.status === "ATIVO");

  // Dias da semana com presença esperada (Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sab=6, Dom=0)
  // Cada aluno treina em média 3x por semana (dias variados)
  const treinos: Record<string, number[]> = {};

  for (const aluno of alunosAtivos) {
    // Cada aluno tem seus dias preferidos de treino
    const diasPreferidos = [1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5).slice(0, 3);
    treinos[aluno.id] = diasPreferidos;
  }

  let checkinsTotal = 0;

  for (let daysBack = 29; daysBack >= 0; daysBack--) {
    const data = daysAgo(daysBack);
    const diaSemana = data.getDay(); // 0=Dom, 1=Seg, ...

    for (const aluno of alunosAtivos) {
      const diasAluno = treinos[aluno.id] ?? [];
      const treina = diasAluno.includes(diaSemana);

      if (!treina) continue;
      // 80% de chance de comparecer no dia preferido
      if (Math.random() > 0.8) continue;

      try {
        await prisma.frequenciaAluno.create({
          data: {
            tenantId,
            alunoId: aluno.id,
            data,
            horaEntrada: `${String(randomBetween(6, 9)).padStart(2, "0")}:${randomBetween(0, 1) === 0 ? "00" : "30"}`,
            horaSaida: `${String(randomBetween(7, 11)).padStart(2, "0")}:${randomBetween(0, 1) === 0 ? "00" : "30"}`,
          },
        });
        checkinsTotal++;
      } catch {
        // Ignora duplicatas (unique constraint)
      }
    }
  }

  console.log(`  ✓ ${checkinsTotal} check-ins registrados`);

  // ── Resumo ─────────────────────────────────────────────────────────────────
  const [totalAlunos, totalCobrancas, totalFreq] = await Promise.all([
    prisma.aluno.count({ where: { tenantId } }),
    prisma.cobrancaAluno.count({ where: { tenantId } }),
    prisma.frequenciaAluno.count({ where: { tenantId } }),
  ]);

  console.log("\n✅  Seed concluído!");
  console.log(`   Alunos:     ${totalAlunos}`);
  console.log(`   Cobranças:  ${totalCobrancas}`);
  console.log(`   Check-ins:  ${totalFreq}`);
  console.log(`   Planos:     ${planos.length}`);
  console.log("\n   👉 Acesse: http://localhost:3000/dashboard/academia\n");
}

main()
  .catch((e) => {
    console.error("\n❌  Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

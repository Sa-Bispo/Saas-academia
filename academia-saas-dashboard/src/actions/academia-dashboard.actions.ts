"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getTenantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tenant } = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });
  return tenant.id;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AcademiaDashboardData = {
  totalAtivos: number;
  totalInadimplentes: number;
  novosEsseMes: number;
  crescimentoAtivos: number;
  receitaVariacaoPct: number;
  receitaMesCents: number;
  renovacoesProximas: number;
  renovacoesValorCents: number;
  cobrancasPendentes: { count: number; totalCents: number };
  aguardandoValidacao: number;
  taxaChurnPct: number;
  ltvMedioCents: number;
  frequenciaMediaSemanal: number;
  receitaMensal: { mes: string; receita: number; meta: number }[];
  distribuicaoPlanos: { plano: string; alunos: number; cor: string }[];
  frequenciaSemanal: { dia: string; presencas: number }[];
  rankingAlunos: {
    id: string; nome: string; plano: string;
    ltv: number; frequencia: number; meta: boolean;
  }[];
  cobrancasVencendo: {
    id: string; aluno: string; valor: number; vencimento: string; plano: string;
  }[];
  ultimosAlunos: {
    id: string; nome: string; plano: string; status: string;
    vencimento: string; cobrancaPendente: number | null;
  }[];
  aniversariantes: { id: string; nome: string; dia: number; plano: string }[];
  alunosEmRisco: {
    id: string; nome: string; plano: string; frequencia: number; diasSemVir: number;
  }[];
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const DIAS_PT  = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PLANO_CORES = ["#818CF8", "#34d399", "#f59e0b", "#f87171", "#60a5fa"];

function createLocalAcademiaDashboardData(): AcademiaDashboardData {
  return {
    totalAtivos: 0,
    totalInadimplentes: 0,
    novosEsseMes: 0,
    crescimentoAtivos: 0,
    receitaVariacaoPct: 0,
    receitaMesCents: 0,
    renovacoesProximas: 0,
    renovacoesValorCents: 0,
    cobrancasPendentes: { count: 0, totalCents: 0 },
    aguardandoValidacao: 0,
    taxaChurnPct: 0,
    ltvMedioCents: 0,
    frequenciaMediaSemanal: 0,
    receitaMensal: Array.from({ length: 6 }, (_, index) => {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return { mes: MESES_PT[date.getMonth()], receita: 0, meta: 0 };
    }),
    distribuicaoPlanos: [],
    frequenciaSemanal: DIAS_PT.map((dia) => ({ dia, presencas: 0 })),
    rankingAlunos: [],
    cobrancasVencendo: [],
    ultimosAlunos: [],
    aniversariantes: [],
    alunosEmRisco: [],
  };
}

// ─── Main action ──────────────────────────────────────────────────────────────

export async function getAcademiaDashboardData(): Promise<AcademiaDashboardData> {
  const tenantId = await getTenantId();

  try {

  const now       = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const fimMes    = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const em7Dias   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const inicioMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const fimMesAnterior    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  // ── Queries paralelas simples ────────────────────────────────────────────────
  const [
    totalAtivos,
    totalInadimplentes,
    receitaMesAgg,
    receitaMesAnteriorAgg,
    cobrancasPendentesAgg,
    renovacoesMats,
    totalGeral,
    novosEsseMes,
    aguardandoValidacao,
  ] = await Promise.all([
    prisma.aluno.count({ where: { tenantId, status: "ATIVO" } }),
    prisma.aluno.count({ where: { tenantId, status: "INADIMPLENTE" } }),
    prisma.cobrancaAluno.aggregate({
      where: { tenantId, status: "PAGO", dataPagamento: { gte: inicioMes, lte: fimMes } },
      _sum: { valorCents: true },
    }),
    prisma.cobrancaAluno.aggregate({
      where: { tenantId, status: "PAGO", dataPagamento: { gte: inicioMesAnterior, lte: fimMesAnterior } },
      _sum: { valorCents: true },
    }),
    prisma.cobrancaAluno.aggregate({
      where: { tenantId, status: "PENDENTE" },
      _count: { id: true },
      _sum: { valorCents: true },
    }),
    prisma.matriculaAluno.findMany({
      where: { tenantId, status: "ATIVA", dataVencimento: { gte: now, lte: em7Dias } },
      include: { plano: { select: { valorCents: true } } },
    }),
    prisma.aluno.count({ where: { tenantId } }),
    prisma.aluno.count({ where: { tenantId, status: "ATIVO", createdAt: { gte: inicioMes } } }),
    prisma.cobrancaAluno.count({ where: { tenantId, status: "AGUARDANDO_VALIDACAO" } }),
  ]);

  // ── Queries com raw SQL ──────────────────────────────────────────────────────

  // LTV médio
  type LtvRow = { avg_ltv: bigint };
  const ltvResult = await prisma.$queryRaw<LtvRow[]>`
    SELECT COALESCE(AVG(total), 0)::bigint as avg_ltv
    FROM (
      SELECT aluno_id, SUM(valor_cents) as total
      FROM cobrancas_alunos
      WHERE tenant_id = ${tenantId}::uuid AND status = 'PAGO'
      GROUP BY aluno_id
    ) sub
  `;

  // Frequência média semanal (últimos 30 dias)
  type FreqAvgRow = { freq: number };
  const freqAvgResult = await prisma.$queryRaw<FreqAvgRow[]>`
    SELECT COALESCE(
      COUNT(*)::float / NULLIF(COUNT(DISTINCT aluno_id), 0) / 4.3, 0
    ) as freq
    FROM frequencia_alunos
    WHERE tenant_id = ${tenantId}::uuid
      AND data >= NOW() - interval '30 days'
  `;

  // Receita mensal (últimos 6 meses)
  type ReceitaRow = { mes: Date; receita: bigint };
  const receitaMensalRaw = await prisma.$queryRaw<ReceitaRow[]>`
    SELECT
      date_trunc('month', data_pagamento) as mes,
      SUM(valor_cents)::bigint as receita
    FROM cobrancas_alunos
    WHERE tenant_id = ${tenantId}::uuid
      AND status = 'PAGO'
      AND data_pagamento >= date_trunc('month', NOW()) - interval '5 months'
    GROUP BY 1
    ORDER BY 1
  `;

  // Distribuição por plano
  type DistRow = { nome: string; total: bigint };
  const distRaw = await prisma.$queryRaw<DistRow[]>`
    SELECT p.nome, COUNT(m.id)::bigint as total
    FROM matriculas_alunos m
    JOIN planos_academia p ON p.id = m.plano_id
    WHERE m.tenant_id = ${tenantId}::uuid AND m.status = 'ATIVA'
    GROUP BY p.id, p.nome
    ORDER BY total DESC
  `;

  // Frequência semanal (últimos 30 dias)
  type FreqDiaRow = { dia_semana: number; presencas: bigint };
  const freqSemanalRaw = await prisma.$queryRaw<FreqDiaRow[]>`
    SELECT
      EXTRACT(DOW FROM data)::int as dia_semana,
      COUNT(*)::bigint as presencas
    FROM frequencia_alunos
    WHERE tenant_id = ${tenantId}::uuid
      AND data >= NOW() - interval '30 days'
    GROUP BY 1
    ORDER BY 1
  `;

  // Ranking por LTV + frequência 30 dias
  type RankingRow = { id: string; nome: string; plano: string | null; ltv_cents: bigint; checkins_30d: bigint };
  const rankingRaw = await prisma.$queryRaw<RankingRow[]>`
    SELECT
      a.id,
      a.nome,
      (SELECT p.nome FROM matriculas_alunos m
       JOIN planos_academia p ON p.id = m.plano_id
       WHERE m.aluno_id = a.id AND m.status = 'ATIVA'
       ORDER BY m.data_vencimento DESC LIMIT 1) as plano,
      COALESCE(SUM(c.valor_cents), 0)::bigint as ltv_cents,
      COUNT(DISTINCT f.data)::bigint as checkins_30d
    FROM alunos a
    LEFT JOIN cobrancas_alunos c ON c.aluno_id = a.id AND c.status = 'PAGO'
    LEFT JOIN frequencia_alunos f ON f.aluno_id = a.id AND f.data >= NOW() - interval '30 days'
    WHERE a.tenant_id = ${tenantId}::uuid AND a.status = 'ATIVO'
    GROUP BY a.id, a.nome
    ORDER BY ltv_cents DESC
    LIMIT 5
  `;

  // Cobranças vencendo em 7 dias
  type CobVencRow = { id: string; aluno_nome: string; valor_cents: bigint; data_vencimento: Date; plano_nome: string | null };
  const cobVencendoRaw = await prisma.$queryRaw<CobVencRow[]>`
    SELECT
      cb.id,
      a.nome as aluno_nome,
      cb.valor_cents::bigint,
      cb.data_vencimento,
      (SELECT p.nome FROM matriculas_alunos m
       JOIN planos_academia p ON p.id = m.plano_id
       WHERE m.aluno_id = a.id AND m.status = 'ATIVA'
       LIMIT 1) as plano_nome
    FROM cobrancas_alunos cb
    JOIN alunos a ON a.id = cb.aluno_id
    WHERE cb.tenant_id = ${tenantId}::uuid
      AND cb.status = 'PENDENTE'
      AND cb.data_vencimento >= ${now}
      AND cb.data_vencimento <= ${em7Dias}
    ORDER BY cb.data_vencimento ASC
    LIMIT 5
  `;

  // Últimos alunos cadastrados
  type UltimoAlunoRow = {
    id: string; nome: string; status: string; data_vencimento: Date | null;
    plano_nome: string | null; cob_valor: bigint | null;
  };
  const ultimosAlunosRaw = await prisma.$queryRaw<UltimoAlunoRow[]>`
    SELECT
      a.id,
      a.nome,
      a.status,
      (SELECT m.data_vencimento FROM matriculas_alunos m WHERE m.aluno_id = a.id AND m.status = 'ATIVA' ORDER BY m.data_vencimento DESC LIMIT 1) as data_vencimento,
      (SELECT p.nome FROM matriculas_alunos m JOIN planos_academia p ON p.id = m.plano_id WHERE m.aluno_id = a.id AND m.status = 'ATIVA' ORDER BY m.data_vencimento DESC LIMIT 1) as plano_nome,
      (SELECT cb.valor_cents FROM cobrancas_alunos cb WHERE cb.aluno_id = a.id AND cb.status IN ('PENDENTE','VENCIDO') ORDER BY cb.data_vencimento ASC LIMIT 1) as cob_valor
    FROM alunos a
    WHERE a.tenant_id = ${tenantId}::uuid
    ORDER BY a.created_at DESC
    LIMIT 6
  `;

  // Aniversariantes do mês
  type AnivRow = { id: string; nome: string; dia: number; plano: string | null };
  const anivRaw = await prisma.$queryRaw<AnivRow[]>`
    SELECT
      a.id,
      a.nome,
      EXTRACT(DAY FROM a.data_nascimento)::int as dia,
      (SELECT p.nome FROM matriculas_alunos m
       JOIN planos_academia p ON p.id = m.plano_id
       WHERE m.aluno_id = a.id AND m.status = 'ATIVA' LIMIT 1) as plano
    FROM alunos a
    WHERE a.tenant_id = ${tenantId}::uuid
      AND a.status = 'ATIVO'
      AND a.data_nascimento IS NOT NULL
      AND EXTRACT(MONTH FROM a.data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
    ORDER BY dia
    LIMIT 5
  `;

  // Alunos em risco (poucos check-ins nos últimos 14 dias)
  type RiscoRow = { id: string; nome: string; plano: string | null; checkins_14d: bigint; ultimo_checkin: Date | null };
  const emRiscoRaw = await prisma.$queryRaw<RiscoRow[]>`
    SELECT
      a.id,
      a.nome,
      (SELECT p.nome FROM matriculas_alunos m
       JOIN planos_academia p ON p.id = m.plano_id
       WHERE m.aluno_id = a.id AND m.status = 'ATIVA' LIMIT 1) as plano,
      COUNT(DISTINCT f.data)::bigint as checkins_14d,
      MAX(f.data) as ultimo_checkin
    FROM alunos a
    LEFT JOIN frequencia_alunos f ON f.aluno_id = a.id AND f.data >= NOW() - interval '14 days'
    WHERE a.tenant_id = ${tenantId}::uuid AND a.status = 'ATIVO'
    GROUP BY a.id, a.nome
    HAVING COUNT(DISTINCT f.data) <= 2
    ORDER BY checkins_14d ASC, ultimo_checkin ASC NULLS FIRST
    LIMIT 4
  `;

  // ── Processamento ────────────────────────────────────────────────────────────

  const receitaMesCents         = receitaMesAgg._sum.valorCents ?? 0;
  const receitaMesAnteriorCents = receitaMesAnteriorAgg._sum.valorCents ?? 0;
  const receitaVariacaoPct = receitaMesAnteriorCents > 0
    ? Math.round(((Number(receitaMesCents) - Number(receitaMesAnteriorCents)) / Number(receitaMesAnteriorCents)) * 1000) / 10
    : 0;
  const crescimentoAtivos = totalAtivos - (totalGeral - totalAtivos - totalInadimplentes);
  const ltvMedioCents = Number(ltvResult[0]?.avg_ltv ?? 0);
  const frequenciaMediaSemanal = Math.round((Number(freqAvgResult[0]?.freq ?? 0)) * 10) / 10;
  const renovacoesProximas = renovacoesMats.length;
  const renovacoesValorCents = renovacoesMats.reduce((s, m) => s + m.plano.valorCents, 0);
  const taxaChurnPct = totalGeral > 0
    ? Math.round((totalInadimplentes / totalGeral) * 1000) / 10
    : 0;

  // Receita mensal — preenche meses sem dados com 0
  const receitaMap = new Map<string, number>();
  for (const r of receitaMensalRaw) {
    const d = new Date(r.mes);
    receitaMap.set(`${d.getFullYear()}-${d.getMonth()}`, Number(r.receita) / 100);
  }
  const meta = receitaMesAnteriorCents > 0
    ? Math.round((receitaMesAnteriorCents / 100) * 1.1)
    : 18000;
  const receitaMensal = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    return {
      mes: MESES_PT[d.getMonth()],
      receita: receitaMap.get(key) ?? 0,
      meta,
    };
  });

  // Distribuição por plano
  const distribuicaoPlanos = distRaw.map((r, i) => ({
    plano: r.nome,
    alunos: Number(r.total),
    cor: PLANO_CORES[i % PLANO_CORES.length],
  }));

  // Frequência semanal — garante todos os 7 dias
  const freqMap = new Map<number, number>();
  for (const r of freqSemanalRaw) {
    freqMap.set(Number(r.dia_semana), Number(r.presencas));
  }
  const frequenciaSemanal = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dia: DIAS_PT[d],
    presencas: freqMap.get(d) ?? 0,
  }));

  // Ranking
  const rankingAlunos = rankingRaw.map((r) => {
    const freq = Number(r.checkins_30d) / 4.3;
    return {
      id: r.id,
      nome: r.nome,
      plano: r.plano ?? "—",
      ltv: Number(r.ltv_cents),
      frequencia: Math.round(freq * 10) / 10,
      meta: freq >= 3,
    };
  });

  // Cobranças vencendo
  const cobrancasVencendo = cobVencendoRaw.map((r) => ({
    id: r.id,
    aluno: r.aluno_nome,
    valor: Number(r.valor_cents),
    vencimento: new Date(r.data_vencimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    plano: r.plano_nome ?? "—",
  }));

  // Últimos alunos
  const ultimosAlunos = ultimosAlunosRaw.map((r) => ({
    id: r.id,
    nome: r.nome,
    plano: r.plano_nome ?? "—",
    status: r.status,
    vencimento: r.data_vencimento
      ? new Date(r.data_vencimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      : "—",
    cobrancaPendente: r.cob_valor !== null ? Number(r.cob_valor) : null,
  }));

  // Aniversariantes
  const aniversariantes = anivRaw.map((r) => ({
    id: r.id,
    nome: r.nome,
    dia: Number(r.dia),
    plano: r.plano ?? "—",
  }));

  // Alunos em risco
  const alunosEmRisco = emRiscoRaw.map((r) => {
    const ultimoCheckin = r.ultimo_checkin ? new Date(r.ultimo_checkin) : null;
    const diasSemVir = ultimoCheckin
      ? Math.floor((now.getTime() - ultimoCheckin.getTime()) / (1000 * 60 * 60 * 24))
      : 14;
    return {
      id: r.id,
      nome: r.nome,
      plano: r.plano ?? "—",
      frequencia: Math.round((Number(r.checkins_14d) / 2) * 10) / 10,
      diasSemVir,
    };
  });

  return {
    totalAtivos,
    totalInadimplentes,
    novosEsseMes,
    crescimentoAtivos,
    receitaVariacaoPct,
    receitaMesCents,
    renovacoesProximas,
    renovacoesValorCents,
    cobrancasPendentes: {
      count: cobrancasPendentesAgg._count.id ?? 0,
      totalCents: cobrancasPendentesAgg._sum.valorCents ?? 0,
    },
    aguardandoValidacao,
    taxaChurnPct,
    ltvMedioCents,
    frequenciaMediaSemanal,
    receitaMensal,
    distribuicaoPlanos,
    frequenciaSemanal,
    rankingAlunos,
    cobrancasVencendo,
    ultimosAlunos,
    aniversariantes,
    alunosEmRisco,
  };

  } catch {
    return createLocalAcademiaDashboardData();
  }
}

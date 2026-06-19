"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedTenantId(): Promise<string> {
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

// ─── Alunos ───────────────────────────────────────────────────────────────────

export async function listarAlunos(filtroStatus?: string) {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.aluno.findMany({
    where: {
      tenantId,
      ...(filtroStatus && filtroStatus !== "todos"
        ? { status: filtroStatus as "ATIVO" | "INADIMPLENTE" | "INATIVO" | "SUSPENSO" }
        : {}),
    },
    orderBy: { nome: "asc" },
    include: {
      matriculas: {
        where: { status: "ATIVA" },
        orderBy: { dataVencimento: "desc" },
        take: 1,
        include: { plano: true },
      },
      cobrancas: {
        where: { status: { in: ["PENDENTE", "VENCIDO"] } },
        orderBy: { dataVencimento: "asc" },
        take: 1,
      },
    },
  });
}

export async function buscarAluno(alunoId: string) {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.aluno.findFirst({
    where: { id: alunoId, tenantId },
    include: {
      matriculas: {
        orderBy: { dataInicio: "desc" },
        include: { plano: true },
      },
      cobrancas: {
        orderBy: { dataVencimento: "desc" },
      },
      frequencias: {
        orderBy: { data: "desc" },
        take: 10,
      },
    },
  });
}

export async function criarAluno(data: {
  nome: string;
  telefone: string;
  email?: string;
  cpf?: string;
  dataNascimento?: string;
  observacoes?: string;
}) {
  const tenantId = await getAuthenticatedTenantId();

  const aluno = await prisma.aluno.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      telefone: data.telefone.replace(/\D/g, ""),
      email: data.email?.trim() || null,
      cpf: data.cpf?.replace(/\D/g, "") || null,
      dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      observacoes: data.observacoes?.trim() || null,
    },
  });

  revalidatePath("/alunos");
  return aluno;
}

export async function atualizarAluno(
  alunoId: string,
  data: {
    nome?: string;
    telefone?: string;
    email?: string;
    cpf?: string;
    dataNascimento?: string;
    observacoes?: string;
    status?: "ATIVO" | "INADIMPLENTE" | "INATIVO" | "SUSPENSO";
  }
) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.aluno.updateMany({
    where: { id: alunoId, tenantId },
    data: {
      ...(data.nome && { nome: data.nome.trim() }),
      ...(data.telefone && { telefone: data.telefone.replace(/\D/g, "") }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.cpf !== undefined && { cpf: data.cpf?.replace(/\D/g, "") || null }),
      ...(data.dataNascimento !== undefined && {
        dataNascimento: data.dataNascimento ? new Date(data.dataNascimento) : null,
      }),
      ...(data.observacoes !== undefined && { observacoes: data.observacoes?.trim() || null }),
      ...(data.status && { status: data.status }),
    },
  });

  revalidatePath("/alunos");
  revalidatePath("/dashboard/academia");
}

export async function excluirAluno(alunoId: string) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.aluno.deleteMany({
    where: { id: alunoId, tenantId },
  });

  revalidatePath("/alunos");
}

// ─── Métricas para o dashboard ────────────────────────────────────────────────

export async function getMetricasAcademia() {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const [
    totalAtivos,
    totalInadimplentes,
    receitaMes,
    renovacoesProximas,
    ultimosAlunos,
  ] = await Promise.all([
    prisma.aluno.count({ where: { tenantId, status: "ATIVO" } }),
    prisma.aluno.count({ where: { tenantId, status: "INADIMPLENTE" } }),
    prisma.cobrancaAluno.aggregate({
      where: {
        tenantId,
        status: "PAGO",
        dataPagamento: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valorCents: true },
    }),
    prisma.matriculaAluno.count({
      where: {
        tenantId,
        status: "ATIVA",
        dataVencimento: {
          gte: hoje,
          lte: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.aluno.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        matriculas: {
          where: { status: "ATIVA" },
          take: 1,
          include: { plano: true },
        },
        cobrancas: {
          where: { status: { in: ["PENDENTE", "VENCIDO"] } },
          take: 1,
          orderBy: { dataVencimento: "asc" },
        },
      },
    }),
  ]);

  return {
    totalAtivos,
    totalInadimplentes,
    receitaMesCents: receitaMes._sum.valorCents ?? 0,
    renovacoesProximas,
    ultimosAlunos,
  };
}

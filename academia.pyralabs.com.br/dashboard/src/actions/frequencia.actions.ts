"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";
import { assertModuloAtivo } from "@/services/modulos.service";

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
  await assertModuloAtivo(tenant.id, "frequencia");
  return tenant.id;
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

export async function registrarCheckIn(alunoId: string) {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const horaEntrada = `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`;

  // upsert: se já tem registro hoje, ignora
  await prisma.frequenciaAluno.upsert({
    where: { alunoId_data: { alunoId, data: dataHoje } },
    create: {
      tenantId,
      alunoId,
      data: dataHoje,
      horaEntrada,
    },
    update: {}, // já entrou hoje, não atualiza
  });

  revalidatePath("/frequencia");
}

// ─── Check-out ────────────────────────────────────────────────────────────────

export async function registrarCheckOut(alunoId: string) {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const horaSaida = `${String(hoje.getHours()).padStart(2, "0")}:${String(hoje.getMinutes()).padStart(2, "0")}`;

  await prisma.frequenciaAluno.updateMany({
    where: { tenantId, alunoId, data: dataHoje, horaSaida: null },
    data: { horaSaida },
  });

  revalidatePath("/frequencia");
}

// ─── Listagem do dia ──────────────────────────────────────────────────────────

export async function listarFrequenciaHoje() {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  return prisma.frequenciaAluno.findMany({
    where: { tenantId, data: dataHoje },
    orderBy: { horaEntrada: "asc" },
    include: {
      aluno: {
        select: { id: true, nome: true, telefone: true, status: true },
      },
    },
  });
}

// ─── Alunos ativos para check-in ─────────────────────────────────────────────

export async function listarAlunosParaCheckin() {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.aluno.findMany({
    where: { tenantId, status: "ATIVO" },
    orderBy: { nome: "asc" },
  });
}

// ─── Histórico de um aluno ────────────────────────────────────────────────────

export async function listarHistoricoAluno(alunoId: string, limit = 30) {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.frequenciaAluno.findMany({
    where: { tenantId, alunoId },
    orderBy: { data: "desc" },
    take: limit,
  });
}

// ─── Métricas de frequência para o dashboard ──────────────────────────────────

export async function getMetricasFrequencia() {
  const tenantId = await getAuthenticatedTenantId();

  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  // Últimos 7 dias
  const diasAtras7 = new Date(dataHoje);
  diasAtras7.setDate(diasAtras7.getDate() - 6);

  const [presencasHoje, frequenciaSemana] = await Promise.all([
    prisma.frequenciaAluno.count({ where: { tenantId, data: dataHoje } }),
    prisma.frequenciaAluno.groupBy({
      by: ["data"],
      where: { tenantId, data: { gte: diasAtras7, lte: dataHoje } },
      _count: true,
      orderBy: { data: "asc" },
    }),
  ]);

  return { presencasHoje, frequenciaSemana };
}

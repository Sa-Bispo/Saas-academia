"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";

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

export async function listarPlanosAcademia() {
  const tenantId = await getAuthenticatedTenantId();
  return prisma.planoAcademia.findMany({
    where: { tenantId },
    orderBy: [{ ativo: "desc" }, { valorCents: "asc" }],
  });
}

export async function criarPlanoAcademia(data: {
  nome: string;
  descricao?: string;
  valorCents: number;
  valorCentsDinheiro?: number | null;
  valorCentsPix?: number | null;
  periodicidade: "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
}) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.planoAcademia.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      descricao: data.descricao?.trim() || null,
      valorCents: data.valorCents,
      valorCentsDinheiro: data.valorCentsDinheiro ?? null,
      valorCentsPix: data.valorCentsPix ?? null,
      periodicidade: data.periodicidade,
    },
  });

  revalidatePath("/alunos");
  revalidatePath("/planos-academia");
}

export async function atualizarPlanoAcademia(
  planoId: string,
  data: {
    nome?: string;
    descricao?: string;
    valorCents?: number;
    valorCentsDinheiro?: number | null;
    valorCentsPix?: number | null;
    periodicidade?: "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
    ativo?: boolean;
  }
) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.planoAcademia.updateMany({
    where: { id: planoId, tenantId },
    data: {
      ...(data.nome && { nome: data.nome.trim() }),
      ...(data.descricao !== undefined && { descricao: data.descricao?.trim() || null }),
      ...(data.valorCents !== undefined && { valorCents: data.valorCents }),
      ...(data.valorCentsDinheiro !== undefined && { valorCentsDinheiro: data.valorCentsDinheiro }),
      ...(data.valorCentsPix !== undefined && { valorCentsPix: data.valorCentsPix }),
      ...(data.periodicidade && { periodicidade: data.periodicidade }),
      ...(data.ativo !== undefined && { ativo: data.ativo }),
    },
  });

  revalidatePath("/alunos");
  revalidatePath("/planos-academia");
}

// ─── Excluir plano ────────────────────────────────────────────────────────────

export async function excluirPlanoAcademia(planoId: string) {
  const tenantId = await getAuthenticatedTenantId();

  // Só deleta se não tiver matrículas associadas
  const count = await prisma.matriculaAluno.count({
    where: { planoId, tenantId },
  });

  if (count > 0) {
    throw new Error("Não é possível excluir um plano com matrículas ativas.");
  }

  await prisma.planoAcademia.deleteMany({ where: { id: planoId, tenantId } });

  revalidatePath("/planos-academia");
  revalidatePath("/alunos");
}

// ─── Matrícula ────────────────────────────────────────────────────────────────

export async function matricularAluno(data: {
  alunoId: string;
  planoId: string;
  dataInicio: string;
  dataVencimento: string;
  observacoes?: string;
}) {
  const tenantId = await getAuthenticatedTenantId();

  // Cancela matrículas ativas anteriores
  await prisma.matriculaAluno.updateMany({
    where: { alunoId: data.alunoId, tenantId, status: "ATIVA" },
    data: { status: "CANCELADA" },
  });

  const matricula = await prisma.matriculaAluno.create({
    data: {
      tenantId,
      alunoId: data.alunoId,
      planoId: data.planoId,
      dataInicio: new Date(data.dataInicio),
      dataVencimento: new Date(data.dataVencimento),
      observacoes: data.observacoes?.trim() || null,
    },
    include: { plano: true },
  });

  // Atualiza status do aluno para ativo
  await prisma.aluno.updateMany({
    where: { id: data.alunoId, tenantId },
    data: { status: "ATIVO" },
  });

  revalidatePath("/alunos");
  revalidatePath("/dashboard/academia");

  return matricula;
}

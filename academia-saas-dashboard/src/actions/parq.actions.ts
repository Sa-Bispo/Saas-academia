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

// ─── Fichas ───────────────────────────────────────────────────────────────────

export async function listarFichasParq() {
  const tenantId = await getAuthenticatedTenantId();

  return prisma.fichaParq.findMany({
    where: { tenantId },
    orderBy: { assinadoEm: "desc" },
    include: {
      aluno: {
        select: {
          id: true,
          nome: true,
          telefone: true,
          cpf: true,
          status: true,
          matriculas: {
            where: { status: "ATIVA" },
            take: 1,
            include: { plano: { select: { nome: true, periodicidade: true } } },
          },
        },
      },
    },
  });
}

// ─── Perguntas ────────────────────────────────────────────────────────────────

export async function ensurePerguntasTenant(tenantId: string): Promise<void> {
  const count = await prisma.parqPergunta.count({ where: { tenantId } });
  if (count > 0) return;

  const globais = await prisma.parqPergunta.findMany({
    where: { tenantId: null },
    orderBy: { ordem: "asc" },
  });

  if (globais.length === 0) return;

  await prisma.parqPergunta.createMany({
    data: globais.map((p) => ({
      tenantId,
      ordem: p.ordem,
      texto: p.texto,
      tipo: p.tipo,
      ativo: p.ativo,
    })),
  });
}

export async function listarPerguntasParq() {
  const tenantId = await getAuthenticatedTenantId();
  await ensurePerguntasTenant(tenantId);

  return prisma.parqPergunta.findMany({
    where: { tenantId },
    orderBy: { ordem: "asc" },
  });
}

export async function salvarPerguntaParq(data: {
  id?: number;
  texto: string;
  ordem: number;
  tipo?: "PERGUNTA" | "INFORMATIVO";
}) {
  const tenantId = await getAuthenticatedTenantId();
  const texto = data.texto.trim();
  if (!texto) throw new Error("O texto da pergunta não pode estar vazio.");

  if (data.id) {
    const existing = await prisma.parqPergunta.findFirst({
      where: { id: data.id, tenantId },
    });
    if (!existing) throw new Error("Pergunta não encontrada.");

    await prisma.parqPergunta.update({
      where: { id: data.id },
      data: { texto, ordem: data.ordem, ...(data.tipo ? { tipo: data.tipo } : {}) },
    });
  } else {
    await prisma.parqPergunta.create({
      data: { tenantId, texto, ordem: data.ordem, tipo: data.tipo ?? "PERGUNTA", ativo: true },
    });
  }

  revalidatePath("/parq-config");
}

export async function excluirPerguntaParq(id: number) {
  const tenantId = await getAuthenticatedTenantId();

  const existing = await prisma.parqPergunta.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new Error("Pergunta não encontrada ou sem permissão.");

  await prisma.parqPergunta.delete({ where: { id } });
  revalidatePath("/parq-config");
}

export async function reordenarPerguntasParq(ids: number[]) {
  const tenantId = await getAuthenticatedTenantId();

  const perguntas = await prisma.parqPergunta.findMany({
    where: { id: { in: ids }, tenantId },
    select: { id: true },
  });
  if (perguntas.length !== ids.length) {
    throw new Error("Algumas perguntas não pertencem a este tenant.");
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.parqPergunta.update({
        where: { id },
        data: { ordem: index + 1 },
      })
    )
  );

  revalidatePath("/parq-config");
}

export async function matricularLeadParq(data: {
  alunoId: string;
  planoId: string;
  dataInicio: string;
  dataVencimento: string;
}) {
  const tenantId = await getAuthenticatedTenantId();

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
    },
    include: { plano: true },
  });

  await prisma.aluno.updateMany({
    where: { id: data.alunoId, tenantId },
    data: { status: "ATIVO" },
  });

  revalidatePath("/parq-config");
  revalidatePath("/alunos");
  revalidatePath("/dashboard/academia");

  return matricula;
}

export async function togglePerguntaAtiva(id: number) {
  const tenantId = await getAuthenticatedTenantId();

  const existing = await prisma.parqPergunta.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new Error("Pergunta não encontrada.");

  await prisma.parqPergunta.update({
    where: { id },
    data: { ativo: !existing.ativo },
  });

  revalidatePath("/parq-config");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";
import { normalizeTelefone } from "@/lib/importar-utils";

export type ImportRow = {
  _linha: number;
  nome: string;
  telefone: string;
  cpf?: string;
  email?: string;
  dataNascimento?: string; // ISO string
  observacoes?: string;
  planoNome?: string;
  dataVencimento?: string; // ISO string
  dataInicio?: string; // ISO string
};

export type ImportResult = {
  criados: number;
  atualizados: number;
  semMatricula: Array<{ linha: number; nome: string; telefone: string }>;
  erros: Array<{ linha: number; motivo: string }>;
};

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

export async function importarAlunos(
  rows: ImportRow[],
  globalPlanoId?: string
): Promise<ImportResult> {
  const tenantId = await getAuthenticatedTenantId();

  const result: ImportResult = {
    criados: 0,
    atualizados: 0,
    semMatricula: [],
    erros: [],
  };

  for (const row of rows) {
    try {
      await processarLinha(row, tenantId, globalPlanoId, result);
    } catch (err) {
      result.erros.push({
        linha: row._linha,
        motivo: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
  }

  revalidatePath("/alunos");
  return result;
}

async function processarLinha(
  row: ImportRow,
  tenantId: string,
  globalPlanoId: string | undefined,
  result: ImportResult
) {
  const nomeLimpo = row.nome?.trim();
  const telefoneLimpo = normalizeTelefone(row.telefone);
  const cpfLimpo = row.cpf?.replace(/\D/g, "") || null;

  if (!nomeLimpo) {
    result.erros.push({ linha: row._linha, motivo: "Nome obrigatório" });
    return;
  }
  if (!telefoneLimpo || telefoneLimpo.length < 12) {
    result.erros.push({ linha: row._linha, motivo: "Telefone inválido ou ausente" });
    return;
  }

  // Resolve plano: linha tem nome → busca; senão usa o global
  let planoId = globalPlanoId || undefined;
  if (!planoId && row.planoNome?.trim()) {
    const plano = await prisma.planoAcademia.findFirst({
      where: {
        tenantId,
        nome: { contains: row.planoNome.trim(), mode: "insensitive" },
        ativo: true,
      },
      select: { id: true },
    });
    planoId = plano?.id;
  }

  const temMatricula = Boolean(planoId && row.dataVencimento);

  await prisma.$transaction(async (tx) => {
    // Dedup: CPF primeiro, depois telefone
    let alunoExistente = cpfLimpo
      ? await tx.aluno.findFirst({ where: { tenantId, cpf: cpfLimpo } })
      : null;

    if (!alunoExistente) {
      alunoExistente = await tx.aluno.findFirst({
        where: { tenantId, telefone: telefoneLimpo },
      });
    }

    let alunoId: string;

    if (alunoExistente) {
      await tx.aluno.update({
        where: { id: alunoExistente.id },
        data: {
          nome: nomeLimpo,
          ...(row.email?.trim() && { email: row.email.trim() }),
          ...(cpfLimpo && { cpf: cpfLimpo }),
          ...(row.dataNascimento && { dataNascimento: new Date(row.dataNascimento) }),
          ...(row.observacoes?.trim() && { observacoes: row.observacoes.trim() }),
          ...(temMatricula && { status: "ATIVO" }),
        },
      });
      alunoId = alunoExistente.id;
      result.atualizados++;
    } else {
      const novo = await tx.aluno.create({
        data: {
          tenantId,
          nome: nomeLimpo,
          telefone: telefoneLimpo,
          email: row.email?.trim() || null,
          cpf: cpfLimpo,
          dataNascimento: row.dataNascimento ? new Date(row.dataNascimento) : null,
          observacoes: row.observacoes?.trim() || null,
          status: temMatricula ? "ATIVO" : "SEM_MATRICULA",
        },
      });
      alunoId = novo.id;
      result.criados++;
    }

    if (temMatricula && planoId && row.dataVencimento) {
      const dataVencimento = new Date(row.dataVencimento);
      const dataInicio = row.dataInicio ? new Date(row.dataInicio) : new Date();

      // Cancela matrículas ativas anteriores (mesmo comportamento do matricularAluno())
      await tx.matriculaAluno.updateMany({
        where: { alunoId, tenantId, status: "ATIVA" },
        data: { status: "CANCELADA" },
      });

      await tx.matriculaAluno.create({
        data: { tenantId, alunoId, planoId, dataInicio, dataVencimento },
      });

      await tx.aluno.update({
        where: { id: alunoId },
        data: { status: "ATIVO" },
      });
    } else {
      result.semMatricula.push({
        linha: row._linha,
        nome: nomeLimpo,
        telefone: telefoneLimpo,
      });
    }
  });
}

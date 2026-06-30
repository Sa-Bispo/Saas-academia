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

export async function listarFuncionarios() {
  const tenantId = await getAuthenticatedTenantId();
  return prisma.funcionario.findMany({
    where: { tenantId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
  });
}

export async function criarFuncionario(data: { nome: string; telefone: string }) {
  const tenantId = await getAuthenticatedTenantId();

  const telefoneLimpo = data.telefone.replace(/\D/g, "");
  if (!data.nome.trim() || !telefoneLimpo) {
    throw new Error("Nome e telefone são obrigatórios.");
  }

  await prisma.funcionario.create({
    data: {
      tenantId,
      nome: data.nome.trim(),
      telefone: telefoneLimpo,
    },
  });

  revalidatePath("/funcionarios");
}

export async function atualizarFuncionario(
  funcionarioId: string,
  data: { nome?: string; telefone?: string; ativo?: boolean }
) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.funcionario.updateMany({
    where: { id: funcionarioId, tenantId },
    data: {
      ...(data.nome && { nome: data.nome.trim() }),
      ...(data.telefone && { telefone: data.telefone.replace(/\D/g, "") }),
      ...(data.ativo !== undefined && { ativo: data.ativo }),
    },
  });

  revalidatePath("/funcionarios");
}

export async function excluirFuncionario(funcionarioId: string) {
  const tenantId = await getAuthenticatedTenantId();

  await prisma.funcionario.deleteMany({
    where: { id: funcionarioId, tenantId },
  });

  revalidatePath("/funcionarios");
}

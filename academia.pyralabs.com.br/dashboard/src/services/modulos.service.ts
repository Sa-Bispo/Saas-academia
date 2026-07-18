"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { MODULO_BASE, type ModuloChave } from "@/lib/modulos";

export async function getModulosAtivos(tenantId: string): Promise<ModuloChave[]> {
  const registros = await prisma.tenantModulo.findMany({
    where: { tenantId, ativo: true },
    include: { modulo: { select: { chave: true } } },
  });

  const ativos = new Set<ModuloChave>([MODULO_BASE]);
  for (const r of registros) {
    ativos.add(r.modulo.chave as ModuloChave);
  }
  return [...ativos];
}

export async function assertModuloAtivo(tenantId: string, chave: ModuloChave): Promise<void> {
  const ativos = await getModulosAtivos(tenantId);
  if (!ativos.includes(chave)) {
    redirect("/sem-acesso");
  }
}

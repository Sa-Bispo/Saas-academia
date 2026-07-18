"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";

function isMissingSupportTableError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2021";
}

async function getAuthenticatedTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  return ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });
}

function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== getAdminEmail()) {
    throw new Error("Nao autorizado");
  }

  return user;
}

export async function abrirChamado(data: {
  tenant_id: string;
  tipo: string;
  titulo: string;
  mensagem_inicial: string;
  imagem_url?: string;
}) {
  const tenantData = await getAuthenticatedTenant();

  if (tenantData.tenant.id !== data.tenant_id) {
    throw new Error("Tenant invalido para este usuario.");
  }

  const chamado = await prisma.chamado.create({
    data: {
      tenant_id: data.tenant_id,
      tipo: data.tipo,
      titulo: data.titulo,
      mensagens: {
        create: {
          autor: "lojista",
          texto: data.mensagem_inicial,
          imagem_url: data.imagem_url,
        },
      },
    },
    include: {
      mensagens: {
        orderBy: { created_at: "asc" },
      },
    },
  });

  revalidatePath("/suporte");
  revalidatePath("/dashboard");
  revalidatePath("/admin/suporte");

  return chamado;
}

export async function enviarMensagem(data: {
  chamado_id: string;
  autor: "lojista" | "admin";
  texto?: string;
  imagem_url?: string;
}) {
  if (!data.texto?.trim() && !data.imagem_url) {
    throw new Error("Informe texto ou imagem para enviar.");
  }

  if (data.autor === "admin") {
    await assertAdmin();
  } else {
    const tenantData = await getAuthenticatedTenant();
    const chamado = await prisma.chamado.findUnique({
      where: { id: data.chamado_id },
      select: { tenant_id: true },
    });

    if (!chamado || chamado.tenant_id !== tenantData.tenant.id) {
      throw new Error("Chamado invalido para este usuario.");
    }
  }

  const msg = await prisma.mensagemChamado.create({
    data: {
      chamado_id: data.chamado_id,
      autor: data.autor,
      texto: data.texto?.trim() || null,
      imagem_url: data.imagem_url,
    },
  });

  if (data.autor === "admin") {
    await prisma.chamado.update({
      where: { id: data.chamado_id },
      data: { status: "ANDAMENTO", updated_at: new Date() },
    });
  } else {
    await prisma.chamado.update({
      where: { id: data.chamado_id },
      data: { updated_at: new Date() },
    });
  }

  revalidatePath("/suporte");
  revalidatePath("/dashboard");
  revalidatePath("/admin/suporte");

  return msg;
}

export async function marcarLidas(chamado_id: string, autor: "lojista" | "admin") {
  if (autor === "admin") {
    await assertAdmin();
  } else {
    const tenantData = await getAuthenticatedTenant();
    const chamado = await prisma.chamado.findUnique({
      where: { id: chamado_id },
      select: { tenant_id: true },
    });

    if (!chamado || chamado.tenant_id !== tenantData.tenant.id) {
      throw new Error("Chamado invalido para este usuario.");
    }
  }

  const outroAutor = autor === "lojista" ? "admin" : "lojista";

  await prisma.mensagemChamado.updateMany({
    where: { chamado_id, autor: outroAutor, lida: false },
    data: { lida: true },
  });

  revalidatePath("/suporte");
  revalidatePath("/dashboard");
  revalidatePath("/admin/suporte");
}

export async function atualizarStatus(
  chamado_id: string,
  status: "ABERTO" | "ANDAMENTO" | "RESOLVIDO",
) {
  await assertAdmin();

  await prisma.chamado.update({
    where: { id: chamado_id },
    data: { status, updated_at: new Date() },
  });

  revalidatePath("/suporte");
  revalidatePath("/dashboard");
  revalidatePath("/admin/suporte");
}

export async function getChamadosTenant(tenant_id: string) {
  const tenantData = await getAuthenticatedTenant();

  if (tenantData.tenant.id !== tenant_id) {
    throw new Error("Tenant invalido para este usuario.");
  }

  try {
    return await prisma.chamado.findMany({
      where: { tenant_id },
      include: {
        mensagens: {
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { updated_at: "desc" },
    });
  } catch (error) {
    if (isMissingSupportTableError(error)) return [];
    throw error;
  }
}

export async function getTodosChamados(filtro?: string) {
  await assertAdmin();

  try {
    return await prisma.chamado.findMany({
      where: filtro && filtro !== "todos" ? { status: filtro.toUpperCase() } : {},
      include: {
        mensagens: {
          orderBy: { created_at: "asc" },
        },
        tenant: {
          select: {
            nome: true,
            plano: true,
            configNicho: true,
          },
        },
      },
      orderBy: { updated_at: "desc" },
    });
  } catch (error) {
    if (isMissingSupportTableError(error)) return [];
    throw error;
  }
}

export async function getNaoLidas(tenant_id: string) {
  const tenantData = await getAuthenticatedTenant();

  if (tenantData.tenant.id !== tenant_id) {
    throw new Error("Tenant invalido para este usuario.");
  }

  let chamados: Array<{ id: string }> = [];

  try {
    chamados = await prisma.chamado.findMany({
      where: { tenant_id },
      select: { id: true },
    });
  } catch (error) {
    if (isMissingSupportTableError(error)) return 0;
    throw error;
  }

  if (chamados.length === 0) return 0;

  try {
    return await prisma.mensagemChamado.count({
      where: {
        chamado_id: { in: chamados.map((c) => c.id) },
        autor: "admin",
        lida: false,
      },
    });
  } catch (error) {
    if (isMissingSupportTableError(error)) return 0;
    throw error;
  }
}

export async function getTotalChamadosAbertos() {
  await assertAdmin();

  try {
    return await prisma.chamado.count({
      where: {
        status: { in: ["ABERTO", "ANDAMENTO"] },
      },
    });
  } catch (error) {
    if (isMissingSupportTableError(error)) return 0;
    throw error;
  }
}

export async function uploadImagemSuporteBase64(
  base64: string,
  filename: string,
): Promise<string> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");

  const match = base64.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error("Formato de imagem invalido.");
  }

  const dir = join(process.cwd(), "public", "uploads", "suporte");
  await mkdir(dir, { recursive: true });

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "-");
  const name = `${Date.now()}-${safeFilename}`;
  const buffer = Buffer.from(match[2], "base64");

  await writeFile(join(dir, name), buffer);

  return `/uploads/suporte/${name}`;
}

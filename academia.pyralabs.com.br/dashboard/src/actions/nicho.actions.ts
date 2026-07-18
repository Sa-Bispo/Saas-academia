"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { type ConfigNicho, getTenantSubNicho } from "@/lib/nicho";

function getEditableCategories(config: ConfigNicho): string[] {
  const custom = Array.isArray(config.categorias_customizadas)
    ? config.categorias_customizadas.filter((value): value is string => typeof value === "string")
    : [];

  if (custom.length > 0) return custom;

  return Array.isArray(config.categorias_padrao)
    ? config.categorias_padrao.filter((value): value is string => typeof value === "string")
    : [];
}

function uniqueCategories(values: string[]): string[] {
  const normalized = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!normalized.has(key)) normalized.set(key, trimmed);
  }
  return Array.from(normalized.values());
}

function getFallbackCategory(deletingName?: string): string {
  const preferred = "Outros";
  if (!deletingName || deletingName.trim().toLowerCase() !== preferred.toLowerCase()) {
    return preferred;
  }
  return "Sem categoria";
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthenticatedTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado");

  return ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });
}

const createCustomCategorySchema = z.object({
  nome: z.string().trim().min(2, "Nome da categoria muito curto").max(80),
});

// ─── getTenantSubNichoAction ──────────────────────────────────────────────────

export async function getTenantSubNichoAction() {
  const tenantData = await getAuthenticatedTenant();
  return getTenantSubNicho(tenantData.tenant.id);
}

// ─── getConfigNichoAction ─────────────────────────────────────────────────────

export async function getConfigNichoAction(): Promise<ConfigNicho> {
  const tenantData = await getAuthenticatedTenant();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantData.tenant.id },
    select: { configNicho: true },
  });

  return (tenant?.configNicho as ConfigNicho) ?? {};
}

// ─── Gerenciamento de categorias customizadas ─────────────────────────────────

export async function createCustomCategory(nome: string): Promise<{ categories: string[] }> {
  const { nome: validatedName } = createCustomCategorySchema.parse({ nome });
  const tenantData = await getAuthenticatedTenant();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantData.tenant.id },
    select: { configNicho: true },
  });

  const config = (tenant?.configNicho as ConfigNicho | null) ?? {};
  const editableCategories = getEditableCategories(config);

  const normalized = validatedName.replace(/\s+/g, " ").trim();
  const exists = editableCategories.some(
    (cat) => cat.trim().toLowerCase() === normalized.toLowerCase(),
  );

  const nextCustom = exists ? editableCategories : [...editableCategories, normalized];

  await prisma.tenant.update({
    where: { id: tenantData.tenant.id },
    data: {
      configNicho: {
        ...(config as Record<string, unknown>),
        categorias_customizadas: nextCustom,
      },
    },
  });

  revalidatePath("/estoque");
  revalidatePath("/dashboard");

  return { categories: nextCustom };
}

export async function renameCustomCategory(
  oldName: string,
  newName: string,
): Promise<{ categories: string[] }> {
  const validatedOld = z.string().min(1).parse(oldName);
  const { nome: validatedNew } = createCustomCategorySchema.parse({ nome: newName });

  const tenantData = await getAuthenticatedTenant();
  const tenantId = tenantData.tenant.id;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { configNicho: true },
  });

  const config = (tenant?.configNicho as ConfigNicho | null) ?? {};
  const editableCategories = getEditableCategories(config);

  const normalizedNew = validatedNew.replace(/\s+/g, " ").trim();
  const conflict = editableCategories.some(
    (cat) => cat.trim().toLowerCase() === normalizedNew.toLowerCase() && cat !== validatedOld,
  );
  if (conflict) throw new Error(`Já existe uma categoria com o nome "${normalizedNew}".`);

  const nextCustom = editableCategories.map((cat) => (cat === validatedOld ? normalizedNew : cat));

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        configNicho: {
          ...(config as Record<string, unknown>),
          categorias_customizadas: nextCustom,
        },
      },
    }),
    prisma.stockItem.updateMany({
      where: { tenantId, variacao: validatedOld },
      data: { variacao: normalizedNew },
    }),
  ]);

  revalidatePath("/estoque");
  revalidatePath("/dashboard");

  return { categories: nextCustom };
}

export async function reorderCustomCategories(ordered: string[]): Promise<void> {
  const tenantData = await getAuthenticatedTenant();
  const tenantId = tenantData.tenant.id;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { configNicho: true },
  });

  const config = (tenant?.configNicho as ConfigNicho | null) ?? {};

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      configNicho: {
        ...(config as Record<string, unknown>),
        categorias_customizadas: ordered,
      },
    },
  });
}

export async function deleteCustomCategory(name: string): Promise<{ categories: string[] }> {
  const validatedName = z.string().min(1).parse(name);
  const tenantData = await getAuthenticatedTenant();
  const tenantId = tenantData.tenant.id;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { configNicho: true },
  });

  const config = (tenant?.configNicho as ConfigNicho | null) ?? {};
  const editableCategories = getEditableCategories(config);

  const fallbackCategory = getFallbackCategory(validatedName);
  const linkedItems = await prisma.stockItem.count({
    where: { tenantId, variacao: validatedName },
  });

  const nextCustom = uniqueCategories(
    editableCategories
      .filter((cat) => cat !== validatedName)
      .concat(linkedItems > 0 ? [fallbackCategory] : []),
  );

  await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        configNicho: {
          ...(config as Record<string, unknown>),
          categorias_customizadas: nextCustom,
        },
      },
    }),
    prisma.stockItem.updateMany({
      where: { tenantId, variacao: validatedName },
      data: { variacao: fallbackCategory },
    }),
  ]);

  revalidatePath("/estoque");
  revalidatePath("/dashboard");

  return { categories: nextCustom };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { type ConfigNicho, getDefaultsForSubNicho, type SubNicho } from "@/lib/nicho";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";

const saveDeliveryIdentitySchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  botName: z.string().trim().min(2).max(80),
  toneOfVoice: z.enum(["DESCONTRAIDO", "VENDEDOR", "FORMAL"]),
});

const loadExampleProductsSchema = z.object({
  tenantId: z.string().uuid(),
  subNicho: z.enum(["adega", "lanchonete", "pizzaria", "academia"]),
});

async function getAuthenticatedTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuario nao autenticado");

  return ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });
}

export async function saveDeliveryIdentity(input: {
  businessName: string;
  botName: string;
  toneOfVoice: "DESCONTRAIDO" | "VENDEDOR" | "FORMAL";
}) {
  const data = saveDeliveryIdentitySchema.parse(input);
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
      nome: data.businessName,
      companyName: data.businessName,
      botName: data.botName,
      toneOfVoice: data.toneOfVoice,
      configNicho: {
        ...(config as Record<string, unknown>),
        nome_negocio: data.businessName,
        nome_atendente: data.botName,
        tom_voz: data.toneOfVoice,
      },
    },
  });

  revalidatePath("/setup");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function loadExampleProducts(tenantId: string, subNicho: SubNicho) {
  const validated = loadExampleProductsSchema.parse({ tenantId, subNicho });
  const tenantData = await getAuthenticatedTenant();

  if (tenantData.tenant.id !== validated.tenantId) {
    throw new Error("Tenant invalido para usuario autenticado");
  }

  const existingCount = await prisma.stockItem.count({
    where: { tenantId: validated.tenantId },
  });

  if (existingCount > 0) {
    return { success: true, inserted: 0 };
  }

  const defaults = getDefaultsForSubNicho(validated.subNicho);
  if (defaults.produtos_exemplo.length === 0) {
    return { success: true, inserted: 0 };
  }

  const rows = defaults.produtos_exemplo.map((produto) => ({
    nome: produto.nome,
    variacao: produto.categoria,
    preco: produto.preco,
    quantidade: produto.quantidade > 0 ? produto.quantidade : 20,
    tenantId: validated.tenantId,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.stockItem.createMany({ data: rows });

    if (validated.subNicho !== "adega" && Array.isArray(defaults.categorias_padrao) && defaults.categorias_padrao.length > 0) {
      const existingCategorias = await tx.categoriaCardapio.count({
        where: { tenant_id: validated.tenantId },
      });

      if (existingCategorias === 0) {
        await tx.categoriaCardapio.createMany({
          data: defaults.categorias_padrao.map((nome, ordem) => ({
            tenant_id: validated.tenantId,
            nome,
            ordem,
          })),
        });
      }
    }
  });

  revalidatePath("/estoque");
  revalidatePath("/dashboard");

  return { success: true, inserted: rows.length };
}
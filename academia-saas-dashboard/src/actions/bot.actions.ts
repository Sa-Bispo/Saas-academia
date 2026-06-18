"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { invalidateBotConfigCache, invalidateBotStockCache } from "@/lib/bot-cache";

type DiaSemana = "DOM" | "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB";

const DIAS: DiaSemana[] = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

const horarioTurnoSchema = z.object({
  dia_semana: z.enum(DIAS),
  abertura: z.string().regex(/^\d{2}:\d{2}$/),
  fechamento: z.string().regex(/^\d{2}:\d{2}$/),
  segundo_turno: z
    .object({
      abertura: z.string().regex(/^\d{2}:\d{2}$/),
      fechamento: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .nullable()
    .optional(),
});

const botConfigSchema = z.object({
  nome_atendente: z.string().trim().max(80),
  nome_negocio: z.string().trim().max(120),
  tom_voz: z.enum(["descontraido", "formal", "vendedor"]),
  horarios: z.array(horarioTurnoSchema),
  area_entrega: z.string().trim().max(240),
  pedido_minimo: z.number().min(0),
  faz_delivery: z.boolean(),
  faz_retirada: z.boolean(),
  regras: z.array(z.string().trim().min(1).max(280)).max(20),
  whatsapp_responsavel: z.string().trim().max(30),
  notif_novos_pedidos: z.boolean(),
  notif_estoque_baixo: z.boolean(),
  notif_bot_desconectado: z.boolean(),
  bot_configurado: z.boolean(),
});

export type HorarioTurno = z.infer<typeof horarioTurnoSchema>;
export type BotConfigData = z.infer<typeof botConfigSchema>;

function mapToneToTenantTone(value: BotConfigData["tom_voz"]): "DESCONTRAIDO" | "FORMAL" | "VENDEDOR" {
  if (value === "formal") return "FORMAL";
  if (value === "vendedor") return "VENDEDOR";
  return "DESCONTRAIDO";
}

function mapTenantToneToBotTone(value?: string | null): BotConfigData["tom_voz"] {
  if ((value || "").toUpperCase() === "FORMAL") return "formal";
  if ((value || "").toUpperCase() === "VENDEDOR") return "vendedor";
  return "descontraido";
}

function formatOperationContext(data: BotConfigData): string {
  const horarios = data.horarios
    .map((h) => `${h.dia_semana}: ${h.abertura}-${h.fechamento}${h.segundo_turno ? ` / ${h.segundo_turno.abertura}-${h.segundo_turno.fechamento}` : ""}`)
    .join("; ");

  const formas = [data.faz_delivery ? "Delivery" : null, data.faz_retirada ? "Retirada" : null]
    .filter(Boolean)
    .join(", ");

  return [
    `Horários: ${horarios || "não informado"}`,
    `Área de entrega: ${data.area_entrega || "não informada"}`,
    `Pedido mínimo: R$ ${Number.isFinite(data.pedido_minimo) ? data.pedido_minimo.toFixed(2) : "0.00"}`,
    `Modalidades: ${formas || "não informadas"}`,
  ].join("\n");
}

function normalizeRules(strictRules?: string | null): string[] {
  return (strictRules || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
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

async function assertTenantOwnership(tenantId: string) {
  const tenantData = await getAuthenticatedTenant();
  if (tenantData.tenant.id !== tenantId) {
    throw new Error("Tenant inválido para este usuário.");
  }
  return tenantData;
}

export async function getBotConfig(tenantId: string): Promise<BotConfigData | null> {
  const tenantData = await assertTenantOwnership(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantData.tenant.id },
    select: {
      nome: true,
      botName: true,
      companyName: true,
      toneOfVoice: true,
      strictRules: true,
      whatsappAdmin: true,
      configNicho: true,
    },
  });

  if (!tenant) return null;

  const configNicho = (tenant.configNicho as Record<string, unknown> | null) ?? {};
  const botConfigRaw = (configNicho.bot_config as Partial<BotConfigData> | undefined) ?? {};

  const fallbackRules = normalizeRules(tenant.strictRules);
  const horarios = Array.isArray(botConfigRaw.horarios) ? botConfigRaw.horarios : [];

  const merged: BotConfigData = {
    nome_atendente: String(botConfigRaw.nome_atendente || tenant.botName || ""),
    nome_negocio: String(botConfigRaw.nome_negocio || tenant.companyName || tenant.nome || ""),
    tom_voz: (botConfigRaw.tom_voz as BotConfigData["tom_voz"]) || mapTenantToneToBotTone(tenant.toneOfVoice),
    horarios: horarios as HorarioTurno[],
    area_entrega: String(botConfigRaw.area_entrega || ""),
    pedido_minimo: Number(botConfigRaw.pedido_minimo ?? 0),
    faz_delivery: Boolean(botConfigRaw.faz_delivery ?? true),
    faz_retirada: Boolean(botConfigRaw.faz_retirada ?? true),
    regras: Array.isArray(botConfigRaw.regras) && botConfigRaw.regras.length > 0
      ? (botConfigRaw.regras as string[])
      : fallbackRules,
    whatsapp_responsavel: String(botConfigRaw.whatsapp_responsavel || tenant.whatsappAdmin || ""),
    notif_novos_pedidos: Boolean(botConfigRaw.notif_novos_pedidos ?? true),
    notif_estoque_baixo: Boolean(botConfigRaw.notif_estoque_baixo ?? true),
    notif_bot_desconectado: Boolean(botConfigRaw.notif_bot_desconectado ?? true),
    bot_configurado: Boolean(configNicho.bot_configurado ?? botConfigRaw.bot_configurado ?? false),
  };

  return botConfigSchema.parse(merged);
}

export async function saveBotConfig(tenantId: string, data: BotConfigData) {
  const tenantData = await assertTenantOwnership(tenantId);
  const payload = botConfigSchema.parse(data);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantData.tenant.id },
    select: { configNicho: true },
  });

  const currentConfig = (tenant?.configNicho as Record<string, unknown> | null) ?? {};

  const nextConfig = {
    ...currentConfig,
    bot_configurado: payload.bot_configurado,
    bot_config: payload,
    nome_atendente: payload.nome_atendente,
    nome_negocio: payload.nome_negocio,
  } as Prisma.InputJsonValue;

  await prisma.tenant.update({
    where: { id: tenantData.tenant.id },
    data: {
      botName: payload.nome_atendente || null,
      companyName: payload.nome_negocio || null,
      toneOfVoice: mapToneToTenantTone(payload.tom_voz),
      strictRules: payload.regras.join("\n") || null,
      whatsappAdmin: payload.whatsapp_responsavel || null,
      operationContext: formatOperationContext(payload),
      botObjective: "FECHAR_PEDIDO",
      configNicho: nextConfig,
    },
  });

  revalidatePath("/bot");
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");

  void invalidateBotStockCache(tenantData.tenant.id);
  void invalidateBotConfigCache(tenantData.tenant.id);

  return {
    success: true,
    message: "Configuração do bot salva com sucesso.",
  };
}

export async function setBotConfigurado(tenantId: string, value: boolean) {
  const tenantData = await assertTenantOwnership(tenantId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantData.tenant.id },
    select: { configNicho: true },
  });

  const currentConfig = (tenant?.configNicho as Record<string, unknown> | null) ?? {};

  await prisma.tenant.update({
    where: { id: tenantData.tenant.id },
    data: {
      configNicho: {
        ...currentConfig,
        bot_configurado: value,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/bot");
  revalidatePath("/dashboard");

  void invalidateBotConfigCache(tenantData.tenant.id);

  return { success: true };
}

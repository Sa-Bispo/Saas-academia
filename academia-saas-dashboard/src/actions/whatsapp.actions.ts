"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { evolutionService } from "@/services/evolution.service";

export type WhatsAppStatus = {
  connected: boolean;
  tenantName: string;
  phoneNumber: string | null;
  connectedAt: string | null;
  pedidosHoje: number;
  mensagensHoje: number;
};

/**
 * Fluxo automático completo:
 * 1. Gera o nome da instância pelo tenant.id (se ainda não existir)
 * 2. Cria a instância na Evolution API (com webhook configurado)
 * 3. Retorna o QR Code para exibição imediata
 */
export async function autoConnectWhatsApp(): Promise<
  WhatsAppConnectionResponse & { instanceName?: string }
> {
  try {
    const tenant = await getAuthenticatedTenant();

    // Gera nome de instância único e estável baseado no tenant
    let instanceName = tenant.evolutionInstanceName;
    if (!instanceName) {
      instanceName = `tenant-${tenant.id.slice(0, 12)}`;
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          evolutionInstanceName: instanceName,
          whatsappStatus: "DISCONNECTED",
        },
      });
    }

    // Cria instância na Evolution (ignora se já existir)
    try {
      await evolutionService.createInstance(instanceName, tenant.evolutionApiKey);
    } catch {
      // Instância já existe — segue para o QR
    }

    // Busca QR Code
    let qrCodeBase64: string;
    try {
      qrCodeBase64 = await evolutionService.getQrCode(
        instanceName,
        tenant.evolutionApiKey,
      );
    } catch (error) {
      const instanceState = getInstanceStateFromError(error);
      if (instanceState === "open") {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappStatus: "CONNECTED" },
        });

        revalidatePath("/whatsapp");
        return { success: true, status: "CONNECTED", instanceName };
      }

      throw error;
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappStatus: "CONNECTING" },
    });

    revalidatePath("/whatsapp");
    return { success: true, qrCode: qrCodeBase64, instanceName };
  } catch (error) {
    return {
      success: false,
      error: `Falha ao iniciar conexão: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

export type WhatsAppConnectionResponse = {
  success: boolean;
  qrCode?: string;
  status?: "CONNECTED" | "DISCONNECTED" | "CONNECTING";
  error?: string;
};

export type WhatsAppStatusResponse = {
  instanceName: string;
  status: "CONNECTED" | "DISCONNECTED" | "CONNECTING";
  error?: string;
};

export type WhatsAppQrCodeResponse = {
  success: boolean;
  qrCode?: string;
  status?: "CONNECTED" | "DISCONNECTED" | "CONNECTING";
  error?: string;
};

export type LinkInstanceInput = {
  instanceName: string;
  evolutionApiKey?: string;
};

export async function linkWhatsAppInstance(
  input: LinkInstanceInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenant = await getAuthenticatedTenant();
    const normalizedName = input.instanceName.trim();

    if (!normalizedName) {
      return { success: false, error: "Informe o nome da instância" };
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        evolutionInstanceName: normalizedName,
        evolutionApiKey: input.evolutionApiKey?.trim() || null,
        whatsappStatus: "DISCONNECTED",
      },
    });

    revalidatePath("/dashboard/whatsapp");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Falha ao vincular instância: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

async function getAuthenticatedTenant() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  const tenantResult = await ensureTenantForUser({
    id: user.id,
    email: user.email,
    nome: (user.user_metadata?.nome as string | undefined) ?? undefined,
  });

  // Buscar tenant completo com dados de Evolution
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantResult.tenant.id },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado");
  }

  return tenant;
}

async function assertTenantOwnership(tenantId: string) {
  const tenant = await getAuthenticatedTenant();
  if (tenant.id !== tenantId) {
    throw new Error("Tenant inválido para este usuário.");
  }
  return tenant;
}

function currentDayStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function normalizeDate(input: unknown): string | null {
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "string") {
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function getInstanceStateFromError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const details = (error as { details?: unknown }).details;
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const instance = (details as { instance?: { state?: unknown } }).instance;
  return typeof instance?.state === "string" ? instance.state : null;
}

async function resolveConnectionStatus(tenant: { id: string; evolutionInstanceName: string | null; evolutionApiKey: string | null; whatsappStatus: string; configNicho: Prisma.JsonValue; }) {
  let resolvedStatus = tenant.whatsappStatus;
  if (tenant.evolutionInstanceName) {
    try {
      resolvedStatus = await evolutionService.getConnectionState(
        tenant.evolutionInstanceName,
        tenant.evolutionApiKey,
      );
    } catch {
      resolvedStatus = "DISCONNECTED";
    }
  } else {
    resolvedStatus = "DISCONNECTED";
  }

  if (resolvedStatus !== tenant.whatsappStatus) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappStatus: resolvedStatus },
    });
  }

  const config = asRecord(tenant.configNicho);
  const existingConnectedAt = normalizeDate(config.whatsapp_connected_at);
  if (resolvedStatus === "CONNECTED" && !existingConnectedAt) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        configNicho: {
          ...config,
          whatsapp_connected_at: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
  }

  if (resolvedStatus !== "CONNECTED" && existingConnectedAt) {
    const next = { ...config };
    delete next.whatsapp_connected_at;
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { configNicho: next as Prisma.InputJsonValue },
    });
  }

  return resolvedStatus;
}

export async function getWhatsAppStatus(tenantId: string): Promise<WhatsAppStatus> {
  const tenant = await assertTenantOwnership(tenantId);

  const tenantData = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      id: true,
      nome: true,
      whatsappAdmin: true,
      whatsappStatus: true,
      evolutionInstanceName: true,
      evolutionApiKey: true,
      configNicho: true,
    },
  });

  if (!tenantData) {
    throw new Error("Tenant não encontrado.");
  }

  const resolvedStatus = await resolveConnectionStatus(tenantData);
  const config = asRecord(tenantData.configNicho);

  const pedidosHoje = await prisma.order.count({
    where: {
      tenantId: tenant.id,
      data_criacao: { gte: currentDayStart() },
    },
  });

  return {
    connected: resolvedStatus === "CONNECTED",
    tenantName: tenantData.nome,
    phoneNumber: tenantData.whatsappAdmin || null,
    connectedAt: normalizeDate(config.whatsapp_connected_at),
    pedidosHoje,
    mensagensHoje: 0,
  };
}

/**
 * Leitura rápida (somente banco local, sem chamar a Evolution API) usada
 * para manter indicadores de UI (ex: sidebar) atualizados em tempo real
 * sem sobrecarregar a API externa em toda página do dashboard.
 */
export async function getWhatsAppConnectionFlag(tenantId: string): Promise<boolean> {
  const tenant = await assertTenantOwnership(tenantId);
  return tenant.whatsappStatus === "CONNECTED";
}

export async function getWhatsAppQRCode(tenantId: string): Promise<WhatsAppQrCodeResponse> {
  const tenant = await assertTenantOwnership(tenantId);
  const response = await autoConnectWhatsApp();

  if (response.success && response.status === "CONNECTED") {
    revalidatePath("/whatsapp");
    return {
      success: true,
      status: "CONNECTED",
    };
  }

  if (response.success && response.qrCode) {
    revalidatePath("/whatsapp");
    return {
      success: true,
      qrCode: response.qrCode,
      status: "CONNECTING",
    };
  }

  if (tenant.evolutionInstanceName) {
    const status = await evolutionService.getConnectionState(
      tenant.evolutionInstanceName,
      tenant.evolutionApiKey,
    );

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { whatsappStatus: status },
    });

    if (status === "CONNECTED") {
      revalidatePath("/whatsapp");
      return {
        success: true,
        status,
      };
    }
  }

  return {
    success: false,
    error: response.error || "Não foi possível gerar o QR Code.",
    status: "DISCONNECTED",
  };
}

export async function reconnectWhatsApp(tenantId: string): Promise<WhatsAppQrCodeResponse> {
  await assertTenantOwnership(tenantId);
  await disconnectWhatsApp(tenantId);
  return getWhatsAppQRCode(tenantId);
}

/**
 * Inicia o fluxo de conexão WhatsApp
 * Usa uma instância já vinculada ao tenant
 * Retorna o QR Code para escanear
 */
export async function connectWhatsApp(): Promise<WhatsAppConnectionResponse> {
  try {
    const tenant = await getAuthenticatedTenant();

    if (!tenant.evolutionInstanceName) {
      return {
        success: false,
        error: "Vincule uma instância antes de gerar o QR Code",
      };
    }

    // Garante que a instância existe na Evolution API (cria se necessário)
    try {
      await evolutionService.createInstance(
        tenant.evolutionInstanceName,
        tenant.evolutionApiKey,
      );
    } catch {
      // Instância pode já existir — apenas continua para o QR Code
    }

    // Busca o QR Code
    try {
      const qrCodeBase64 = await evolutionService.getQrCode(
        tenant.evolutionInstanceName,
        tenant.evolutionApiKey,
      );

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappStatus: "CONNECTING" },
      });

      return {
        success: true,
        qrCode: qrCodeBase64,
      };
    } catch (error) {
      const instanceState = getInstanceStateFromError(error);
      if (instanceState === "open") {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { whatsappStatus: "CONNECTED" },
        });

        return {
          success: true,
          status: "CONNECTED",
        };
      }

      console.error("Erro ao obter QR Code:", error);
      return {
        success: false,
        error: `Falha ao gerar QR Code: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      };
    }
  } catch (error) {
    console.error("Erro em connectWhatsApp:", error);
    return {
      success: false,
      error: `Erro na autenticação: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

/**
 * Verifica e atualiza o status da conexão WhatsApp
 */
export async function checkWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
  try {
    const tenant = await getAuthenticatedTenant();

    if (!tenant.evolutionInstanceName) {
      return {
        instanceName: "",
        status: "DISCONNECTED",
        error: "Nenhuma instância iniciada",
      };
    }

    try {
      // Verifica o status na Evolution API
      const status = await evolutionService.getConnectionState(
        tenant.evolutionInstanceName,
        tenant.evolutionApiKey,
      );

      // Atualiza no banco de dados
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappStatus: status },
      });

      revalidatePath("/dashboard/configuracoes");

      return {
        instanceName: tenant.evolutionInstanceName,
        status,
      };
    } catch (error) {
      console.error("Erro ao verificar status Evolution:", error);
      return {
        instanceName: tenant.evolutionInstanceName,
        status: "DISCONNECTED",
        error: `Falha ao verificar status: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      };
    }
  } catch (error) {
    console.error("Erro em checkWhatsAppStatus:", error);
    return {
      instanceName: "",
      status: "DISCONNECTED",
      error: `Erro na autenticação: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

/**
 * Desconecta e remove a instância WhatsApp
 */
export async function disconnectWhatsApp(tenantId?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tenant = tenantId
      ? await assertTenantOwnership(tenantId)
      : await getAuthenticatedTenant();

    if (!tenant.evolutionInstanceName) {
      return { success: false, error: "Nenhuma instância ativa" };
    }

    try {
      // Remove a instância na Evolution API para encerrar a sessão do WhatsApp
      // de fato. Sem isso, o nome da instância (derivado do tenant.id) é
      // determinístico e a Evolution recria a mesma sessão já conectada ao
      // gerar um novo QR Code, impedindo reconectar ou trocar de número.
      try {
        await evolutionService.deleteInstance(tenant.evolutionInstanceName);
      } catch {
        // Instância pode já ter sido removida/desconectada — segue para
        // limpar o vínculo local de qualquer forma.
      }

      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          evolutionInstanceName: null,
          evolutionApiKey: null,
          whatsappStatus: "DISCONNECTED",
          configNicho: {
            ...asRecord(tenant.configNicho),
            whatsapp_connected_at: null,
          } as Prisma.InputJsonValue,
        },
      });

      revalidatePath("/dashboard/configuracoes");
      revalidatePath("/whatsapp");

      return { success: true };
    } catch (error) {
      console.error("Erro ao desconectar Evolution:", error);
      return {
        success: false,
        error: `Falha ao desvincular: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      };
    }
  } catch (error) {
    console.error("Erro em disconnectWhatsApp:", error);
    return {
      success: false,
      error: `Erro na autenticação: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    };
  }
}

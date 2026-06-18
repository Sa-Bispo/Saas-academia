"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_IMPERSONATION_COOKIE = "admin_impersonation_tenant_id";
const EXPIRING_IN_DAYS = 7;

const createTenantSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  sub_nicho: z.enum(["adega", "lanchonete", "pizzaria"]),
  plano: z.string().trim().min(1),
  senha: z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(72).optional(),
  ),
  vencimento: z.union([z.string(), z.date()]),
});

type AdminSubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED"
  | "EXPIRED"
  | null;

export type AdminPlanSummary = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  niche: string;
};

export type AdminTenantSummary = {
  id: string;
  nome: string;
  email: string;
  ownerName: string;
  subNicho: string;
  whatsappStatus: string;
  createdAt: Date;
  planName: string;
  planCode: string | null;
  planPriceCents: number;
  subscriptionStatus: AdminSubscriptionStatus;
  dueDate: Date | null;
  daysUntilDue: number | null;
  statusLabel: string;
  pedidosHoje: number;
  faturamentoHoje: number;
};

export type AdminStats = {
  totalAtivos: number;
  botsConectados: number;
  totalPedidosHoje: number;
  mrrCents: number;
  tenants: AdminTenantSummary[];
};

function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
}

function getLoginUrl() {
  return "https://pyralabs.com.br/login";
}

function generateSecurePassword(length = 12) {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const random = crypto.randomBytes(length);
  let password = "";

  for (let index = 0; index < length; index += 1) {
    password += charset[random[index] % charset.length];
  }

  return password;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getDaysUntil(date: Date | null | undefined) {
  if (!date) return null;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function resolveSubscriptionStatusLabel(
  status: AdminSubscriptionStatus,
  daysUntilDue: number | null,
) {
  if (!status || status !== "ACTIVE") {
    return "Inativo";
  }

  if (daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= EXPIRING_IN_DAYS) {
    return `Vence em ${daysUntilDue}d`;
  }

  return "Ativo";
}

async function assertAdmin() {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL nao configurado.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== adminEmail) {
    throw new Error("Nao autorizado");
  }

  return user;
}

export async function getAdminStats(): Promise<AdminStats> {
  await assertAdmin();

  const today = startOfToday();

  type TenantQueryRow = {
    id: string;
    nome: string;
    whatsappStatus: string;
    configNicho: unknown;
    dataCriacao: Date;
    user: {
      email: string;
      nome: string | null;
    };
    subscription: {
      status: AdminSubscriptionStatus;
      currentPeriodEnd: Date;
      plan: {
        code: string;
        name: string;
        priceCents: number;
      };
    } | null;
    orders: Array<{
      id: string;
      total: unknown;
    }>;
  };

  const tenants = (await prisma.tenant.findMany({
    orderBy: { dataCriacao: "desc" },
    select: {
      id: true,
      nome: true,
      whatsappStatus: true,
      configNicho: true,
      dataCriacao: true,
      user: {
        select: {
          email: true,
          nome: true,
        },
      },
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          plan: {
            select: {
              code: true,
              name: true,
              priceCents: true,
            },
          },
        },
      },
      orders: {
        where: { data_criacao: { gte: today } },
        select: {
          id: true,
          total: true,
        },
      },
    },
  })) as TenantQueryRow[];

  const hydratedTenants: AdminTenantSummary[] = tenants.map((tenant): AdminTenantSummary => {
    const config = tenant.configNicho as { sub_nicho?: string; subNicho?: string };
    const subNicho = config?.sub_nicho ?? config?.subNicho ?? "-";

    const pedidosHoje = tenant.orders.length;
    const faturamentoHoje = tenant.orders.reduce((acc: number, order: TenantQueryRow["orders"][number]): number => {
      const total = Number(order.total);
      return acc + (Number.isFinite(total) ? total : 0);
    }, 0);

    const planPriceCents = tenant.subscription?.plan.priceCents ?? 0;
    const daysUntilDue = getDaysUntil(tenant.subscription?.currentPeriodEnd);

    return {
      id: tenant.id,
      nome: tenant.nome,
      email: tenant.user.email,
      ownerName: tenant.user.nome ?? tenant.nome,
      subNicho,
      whatsappStatus: tenant.whatsappStatus,
      createdAt: tenant.dataCriacao,
      planName: tenant.subscription?.plan.name ?? "Sem plano",
      planCode: tenant.subscription?.plan.code ?? null,
      planPriceCents,
      subscriptionStatus: tenant.subscription?.status ?? null,
      dueDate: tenant.subscription?.currentPeriodEnd ?? null,
      daysUntilDue,
      statusLabel: resolveSubscriptionStatusLabel(tenant.subscription?.status ?? null, daysUntilDue),
      pedidosHoje,
      faturamentoHoje,
    };
  });

  const totalAtivos = hydratedTenants.filter((tenant) => tenant.subscriptionStatus === "ACTIVE").length;
  const botsConectados = hydratedTenants.filter((tenant) => tenant.whatsappStatus === "CONNECTED").length;
  const totalPedidosHoje = hydratedTenants.reduce((acc: number, tenant) => acc + tenant.pedidosHoje, 0);
  const mrrCents = hydratedTenants
    .filter((tenant) => tenant.subscriptionStatus === "ACTIVE")
    .reduce((acc: number, tenant) => acc + tenant.planPriceCents, 0);

  return {
    totalAtivos,
    botsConectados,
    totalPedidosHoje,
    mrrCents,
    tenants: hydratedTenants,
  };
}

export async function createTenant(input: {
  nome: string;
  email: string;
  sub_nicho: "adega" | "lanchonete" | "pizzaria";
  plano: string;
  senha?: string;
  vencimento: Date | string;
}) {
  await assertAdmin();

  const parsedResult = createTenantSchema.safeParse(input);
  if (!parsedResult.success) {
    const message = parsedResult.error.issues[0]?.message ?? "Dados inválidos para criar cliente.";
    throw new Error(message);
  }

  const parsed = parsedResult.data;
  const dueDate = parsed.vencimento instanceof Date ? parsed.vencimento : new Date(parsed.vencimento);

  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Data de vencimento inválida.");
  }

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [{ code: parsed.plano }, { name: parsed.plano }],
    },
    select: {
      id: true,
    },
  });

  if (!plan) {
    throw new Error("Plano inválido.");
  }

  const now = new Date();
  const senhaTemp = parsed.senha ?? generateSecurePassword(12);
  const supabaseAdmin = createAdminClient();
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.email,
    password: senhaTemp,
    email_confirm: true,
    user_metadata: {
      nome: parsed.nome,
    },
  });

  if (authError || !authData.user?.id) {
    const message = authError?.message?.toLowerCase().includes("already")
      ? "Já existe um usuário com este e-mail."
      : authError?.message;
    throw new Error(message || "Não foi possível criar o usuário no Auth.");
  }

  const authUserId = authData.user.id;

  let tenantId = "";
  try {
    const tenant = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: parsed.email },
        select: { id: true },
      });

      if (existingUser) {
        throw new Error("Já existe um usuário com este e-mail no sistema.");
      }

      const user = await tx.user.create({
        data: {
          id: authUserId,
          email: parsed.email,
          nome: parsed.nome,
        },
        select: { id: true },
      });

      const createdTenant = await tx.tenant.create({
        data: {
          nome: parsed.nome,
          plano: parsed.plano,
          userId: user.id,
          companyName: parsed.nome,
          configNicho: {
            sub_nicho: parsed.sub_nicho,
            subNicho: parsed.sub_nicho,
          },
        },
        select: { id: true },
      });

      await tx.subscription.create({
        data: {
          tenantId: createdTenant.id,
          planId: plan.id,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: dueDate,
        },
      });

      return createdTenant;
    });

    tenantId = tenant.id;
  } catch (error) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    throw new Error(error instanceof Error ? error.message : "Erro ao salvar dados do cliente.");
  }

  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY ?? process.env.EVOLUTION_GLOBAL_KEY;
  if (evolutionApiUrl && evolutionApiKey) {
    try {
      await fetch(`${evolutionApiUrl.replace(/\/$/, "")}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: evolutionApiKey,
        },
        body: JSON.stringify({
          instanceName: `tenant-${tenantId.slice(0, 8)}`,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
    } catch (error) {
      console.error("[ADMIN] Falha ao criar instancia WA:", error);
    }
  }

  revalidatePath("/admin");
  return {
    email: parsed.email,
    senhaTemp,
    url: getLoginUrl(),
  };
}

export async function toggleTenantAtivo(tenantId: string, ativo: boolean) {
  await assertAdmin();

  const current = await prisma.subscription.findUnique({
    where: { tenantId },
    select: {
      id: true,
      planId: true,
      currentPeriodEnd: true,
    },
  });

  if (!current) {
    throw new Error("Assinatura nao encontrada para este tenant.");
  }

  if (ativo) {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "ACTIVE",
        currentPeriodEnd: current.currentPeriodEnd < new Date() ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : current.currentPeriodEnd,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: "EXPIRED",
      },
    });
  }

  revalidatePath("/admin");
}

export async function updateTenantPlan(input: { tenantId: string; plano: string }) {
  await assertAdmin();

  const parsed = z
    .object({
      tenantId: z.string().trim().uuid(),
      plano: z.string().trim().min(1),
    })
    .parse(input);

  const [tenant, plan, subscription] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: parsed.tenantId },
      select: { id: true },
    }),
    prisma.plan.findFirst({
      where: {
        OR: [{ code: parsed.plano }, { name: parsed.plano }],
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    prisma.subscription.findUnique({
      where: { tenantId: parsed.tenantId },
      select: {
        id: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    }),
  ]);

  if (!tenant) {
    throw new Error("Tenant nao encontrado.");
  }

  if (!plan) {
    throw new Error("Plano invalido.");
  }

  await prisma.tenant.update({
    where: { id: parsed.tenantId },
    data: { plano: plan.code },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { tenantId: parsed.tenantId },
      data: {
        planId: plan.id,
      },
    });
  } else {
    const now = new Date();
    const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.create({
      data: {
        tenantId: parsed.tenantId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd,
      },
    });
  }

  revalidatePath("/admin");

  return {
    tenantId: parsed.tenantId,
    planCode: plan.code,
    planName: plan.name,
  };
}

export async function updateTenantFull(input: {
  tenantId: string;
  nome: string;
  sub_nicho: "adega" | "lanchonete" | "pizzaria";
  plano: string;
  vencimento: string | Date;
}) {
  await assertAdmin();

  const parsed = z
    .object({
      tenantId: z.string().trim().uuid(),
      nome: z.string().trim().min(2).max(120),
      sub_nicho: z.enum(["adega", "lanchonete", "pizzaria"]),
      plano: z.string().trim().min(1),
      vencimento: z.union([z.string(), z.date()]),
    })
    .parse(input);

  const dueDate =
    parsed.vencimento instanceof Date ? parsed.vencimento : new Date(parsed.vencimento);

  if (Number.isNaN(dueDate.getTime())) {
    throw new Error("Data de vencimento inválida.");
  }

  const plan = await prisma.plan.findFirst({
    where: { OR: [{ code: parsed.plano }, { name: parsed.plano }] },
    select: { id: true, code: true, name: true },
  });

  if (!plan) throw new Error("Plano inválido.");

  await prisma.tenant.update({
    where: { id: parsed.tenantId },
    data: {
      nome: parsed.nome,
      companyName: parsed.nome,
      plano: plan.code,
      configNicho: {
        sub_nicho: parsed.sub_nicho,
        subNicho: parsed.sub_nicho,
      },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: parsed.tenantId },
    select: { id: true },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { tenantId: parsed.tenantId },
      data: { planId: plan.id, currentPeriodEnd: dueDate },
    });
  } else {
    await prisma.subscription.create({
      data: {
        tenantId: parsed.tenantId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: dueDate,
      },
    });
  }

  revalidatePath("/admin");
  return { planName: plan.name };
}

export async function deleteTenant(tenantId: string) {
  await assertAdmin();

  const removed = await prisma.tenant.delete({ where: { id: tenantId } });
  revalidatePath("/admin");
  return removed;
}

export async function impersonateTenant(tenantId: string) {
  await assertAdmin();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      nome: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant nao encontrado.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_IMPERSONATION_COOKIE, tenant.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });

  return {
    tenant,
    redirectTo: "/dashboard",
  };
}

export async function clearImpersonation() {
  await assertAdmin();

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_IMPERSONATION_COOKIE);
  revalidatePath("/admin");
}

export async function listPlansForAdmin(): Promise<AdminPlanSummary[]> {
  await assertAdmin();

  return prisma.plan.findMany({
    orderBy: [{ niche: "asc" }, { priceCents: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      priceCents: true,
      niche: true,
    },
  });
}

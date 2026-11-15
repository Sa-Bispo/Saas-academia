"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { checklistImplantacao, getPlanoAcademia } from "@/lib/planos-academia";

const ADMIN_IMPERSONATION_COOKIE = "admin_impersonation_tenant_id";
const EXPIRING_IN_DAYS = 7;

const createTenantSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  sub_nicho: z.enum(["adega", "lanchonete", "pizzaria", "academia"]),
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
  // conta de teste/demo: fica fora do MRR e dos alertas
  teste: z.boolean().optional(),
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
  // nome da academia (companyName); "nome" é o nome interno do tenant
  displayName: string;
  contaTeste: boolean;
  // tem WhatsApp no plano/módulos ou instância criada — só aí o status do bot importa
  usaWhatsapp: boolean;
  alunosAtivos: number;
  recebidoMesCents: number;
  cobrancasAtrasadas: number;
};

export type AdminStats = {
  totalAtivos: number;
  botsConectados: number;
  totalPedidosHoje: number;
  mrrCents: number;
  clientesPagantes: number;
  contasTeste: number;
  alunosAtivosTotal: number;
  vencendo7d: number;
  tenants: AdminTenantSummary[];
};

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
  const ok = await getAdminSession();
  if (!ok) throw new Error("Não autorizado");
}

export async function getAdminStats(): Promise<AdminStats> {
  await assertAdmin();

  const today = startOfToday();

  type TenantQueryRow = {
    id: string;
    nome: string;
    companyName: string | null;
    evolutionInstanceName: string | null;
    tenantModulos: Array<{ modulo: { chave: string } }>;
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
      companyName: true,
      evolutionInstanceName: true,
      tenantModulos: { where: { ativo: true }, select: { modulo: { select: { chave: true } } } },
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

  // Números de academia por cliente (3 consultas agrupadas, sem N+1)
  const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1);
  const [alunosAtivosRows, recebidoRows, atrasadasRows] = await Promise.all([
    prisma.aluno.groupBy({ by: ["tenantId"], where: { status: "ATIVO" }, _count: { _all: true } }),
    prisma.cobrancaAluno.groupBy({
      by: ["tenantId"],
      where: { status: "PAGO", dataPagamento: { gte: inicioMes } },
      _sum: { valorCents: true },
    }),
    prisma.cobrancaAluno.groupBy({
      by: ["tenantId"],
      where: { status: { in: ["PENDENTE", "VENCIDO"] }, dataVencimento: { lt: today } },
      _count: { _all: true },
    }),
  ]);
  const alunosAtivosMap = new Map(alunosAtivosRows.map((r) => [r.tenantId, r._count._all]));
  const recebidoMap = new Map(recebidoRows.map((r) => [r.tenantId, r._sum.valorCents ?? 0]));
  const atrasadasMap = new Map(atrasadasRows.map((r) => [r.tenantId, r._count._all]));

  const hydratedTenants: AdminTenantSummary[] = tenants.map((tenant): AdminTenantSummary => {
    const config = tenant.configNicho as { sub_nicho?: string; subNicho?: string; conta_teste?: boolean };
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
      displayName: tenant.companyName?.trim() || tenant.nome,
      contaTeste: config?.conta_teste === true,
      usaWhatsapp:
        Boolean(tenant.evolutionInstanceName) ||
        tenant.tenantModulos.some((tm) => tm.modulo.chave === "comunicacao") ||
        subNicho !== "academia",
      alunosAtivos: alunosAtivosMap.get(tenant.id) ?? 0,
      recebidoMesCents: recebidoMap.get(tenant.id) ?? 0,
      cobrancasAtrasadas: atrasadasMap.get(tenant.id) ?? 0,
    };
  });

  const totalAtivos = hydratedTenants.filter((tenant) => tenant.subscriptionStatus === "ACTIVE").length;
  const botsConectados = hydratedTenants.filter((tenant) => tenant.whatsappStatus === "CONNECTED").length;
  const totalPedidosHoje = hydratedTenants.reduce((acc: number, tenant) => acc + tenant.pedidosHoje, 0);
  // MRR e pagantes ignoram contas de teste
  const pagantes = hydratedTenants.filter(
    (tenant) => tenant.subscriptionStatus === "ACTIVE" && !tenant.contaTeste && tenant.planPriceCents > 0,
  );
  const mrrCents = pagantes.reduce((acc: number, tenant) => acc + tenant.planPriceCents, 0);
  const reais = hydratedTenants.filter((tenant) => !tenant.contaTeste);

  return {
    totalAtivos,
    botsConectados,
    totalPedidosHoje,
    mrrCents,
    clientesPagantes: pagantes.length,
    contasTeste: hydratedTenants.length - reais.length,
    alunosAtivosTotal: reais.reduce((acc, tenant) => acc + tenant.alunosAtivos, 0),
    vencendo7d: reais.filter((t) => t.daysUntilDue !== null && t.daysUntilDue >= 0 && t.daysUntilDue <= EXPIRING_IN_DAYS).length,
    tenants: hydratedTenants,
  };
}

export async function createTenant(input: {
  nome: string;
  email: string;
  sub_nicho: "adega" | "lanchonete" | "pizzaria" | "academia";
  plano: string;
  senha?: string;
  vencimento: Date | string;
  teste?: boolean;
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

  // Plano de academia da landing (Gestão/Cobrança/Completo): define módulos e o que é automático
  const planoAcademia = parsed.sub_nicho === "academia" ? getPlanoAcademia(parsed.plano) : null;

  const now = new Date();
  const senhaTemp = parsed.senha ?? generateSecurePassword(12);
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabaseAdmin = createAdminClient();
  let { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.email,
    password: senhaTemp,
    email_confirm: true,
    user_metadata: { nome: parsed.nome },
  });

  // Usuário existe no Auth mas pode ser órfão (DB apagado manualmente)
  if (authError?.message?.toLowerCase().includes("already")) {
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const orphan = listData?.users?.find((u) => u.email === parsed.email);
    if (orphan) {
      const dbUser = await prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true } });
      if (!dbUser) {
        // Apaga o órfão do Auth e tenta criar novamente
        await supabaseAdmin.auth.admin.deleteUser(orphan.id);
        const retry = await supabaseAdmin.auth.admin.createUser({
          email: parsed.email,
          password: senhaTemp,
          email_confirm: true,
          user_metadata: { nome: parsed.nome },
        });
        authData = retry.data;
        authError = retry.error;
      }
    }
  }

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
            ...(parsed.teste ? { conta_teste: true } : {}),
            ...(planoAcademia
              ? {
                  cobranca_automatica: planoAcademia.cobrancaAutomatica,
                  bot_24h: planoAcademia.bot24h,
                }
              : {}),
          },
        },
        select: { id: true },
      });

      // Liga os módulos do plano (só em cliente novo)
      if (planoAcademia) {
        const catalogo = await tx.modulo.findMany({
          where: { chave: { in: planoAcademia.modulos } },
          select: { id: true },
        });
        if (catalogo.length > 0) {
          await tx.tenantModulo.createMany({
            data: catalogo.map((m) => ({ tenantId: createdTenant.id, moduloId: m.id, ativo: true })),
            skipDuplicates: true,
          });
        }
      }

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
  // Plano sem WhatsApp (Gestão): não cria instância, então nada de bot nem cobrança automática
  const precisaWhatsapp = planoAcademia ? planoAcademia.whatsapp : true;
  if (precisaWhatsapp && evolutionApiUrl && evolutionApiKey) {
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
    nome: parsed.nome,
    planoNome: planoAcademia?.nome ?? null,
    checklist: parsed.sub_nicho === "academia" ? checklistImplantacao(planoAcademia) : [],
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
  sub_nicho: "adega" | "lanchonete" | "pizzaria" | "academia";
  plano: string;
  vencimento: string | Date;
  teste?: boolean;
}) {
  await assertAdmin();

  const parsed = z
    .object({
      tenantId: z.string().trim().uuid(),
      nome: z.string().trim().min(2).max(120),
      sub_nicho: z.enum(["adega", "lanchonete", "pizzaria", "academia"]),
      plano: z.string().trim().min(1),
      vencimento: z.union([z.string(), z.date()]),
      teste: z.boolean().optional(),
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

  // Preserva o configNicho do cliente (chave Pix, prazos, etc.) e só troca o nicho/flag de
  // teste. Antes ele era sobrescrito inteiro e a configuração da academia se perdia.
  // Trocar o plano NÃO mexe nos módulos do cliente.
  const atual = await prisma.tenant.findUnique({
    where: { id: parsed.tenantId },
    select: { configNicho: true },
  });
  if (!atual) throw new Error("Cliente não encontrado.");
  const configAtual =
    atual.configNicho && typeof atual.configNicho === "object" && !Array.isArray(atual.configNicho)
      ? (atual.configNicho as Record<string, unknown>)
      : {};
  const configNovo: Record<string, unknown> = {
    ...configAtual,
    sub_nicho: parsed.sub_nicho,
    subNicho: parsed.sub_nicho,
  };
  if (parsed.teste !== undefined) {
    if (parsed.teste) configNovo.conta_teste = true;
    else delete configNovo.conta_teste;
  }

  await prisma.tenant.update({
    where: { id: parsed.tenantId },
    data: {
      companyName: parsed.nome,
      plano: plan.code,
      configNicho: configNovo as Prisma.InputJsonValue,
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

// ─── Módulos ──────────────────────────────────────────────────────────────────

export type AdminModuloState = {
  chave: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
};

export async function getModulosTenant(tenantId: string): Promise<AdminModuloState[]> {
  await assertAdmin();

  const [modulos, tenantModulos] = await Promise.all([
    prisma.modulo.findMany({ orderBy: { ordem: "asc" } }),
    prisma.tenantModulo.findMany({ where: { tenantId } }),
  ]);

  const ativosMap = new Map(tenantModulos.map((tm) => [tm.moduloId, tm.ativo]));

  return modulos.map((m) => ({
    chave: m.chave,
    nome: m.nome,
    descricao: m.descricao,
    ordem: m.ordem,
    ativo: ativosMap.get(m.id) ?? false,
  }));
}

export async function setModulosTenant(
  tenantId: string,
  modulos: { chave: string; ativo: boolean }[],
): Promise<void> {
  await assertAdmin();

  const catalogModulos = await prisma.modulo.findMany({
    where: { chave: { in: modulos.map((m) => m.chave) } },
    select: { id: true, chave: true },
  });

  const chaveToId = new Map(catalogModulos.map((m) => [m.chave, m.id]));

  await prisma.$transaction(
    modulos
      .filter((m) => m.chave !== "alunos") // alunos é sempre ativo — não pode ser alterado
      .map((m) => {
        const moduloId = chaveToId.get(m.chave);
        if (!moduloId) return null;
        return prisma.tenantModulo.upsert({
          where: { tenantId_moduloId: { tenantId, moduloId } },
          create: { tenantId, moduloId, ativo: m.ativo },
          update: { ativo: m.ativo },
        });
      })
      .filter(Boolean) as Parameters<typeof prisma.$transaction>[0],
  );

  revalidatePath("/admin");
}

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

const ADMIN_IMPERSONATION_COOKIE = "admin_impersonation_tenant_id";

function getAdminEmail() {
  return process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_ADMIN_EMAIL;
}

function isPlatformAdmin(email?: string) {
  const adminEmail = getAdminEmail();
  return Boolean(adminEmail && email && email === adminEmail);
}

type AuthenticatedUser = {
  id: string;
  email?: string;
  nome?: string;
};

type TenantBootstrapResult = {
  tenant: {
    id: string;
    nome: string;
    botName: string | null;
    companyName: string | null;
  };
  user: {
    id: string;
    nome: string;
    email: string;
  };
  metrics: {
    stockItems: number;
    ordersReceived: number;
    activeFlows: number;
  };
  localFallback?: boolean;
};

async function ensureLocalAcademiaBootstrap(tenantId: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const plan = await prisma.plan.upsert({
    where: { code: "academia_pro_local" },
    create: {
      code: "academia_pro_local",
      niche: "DELIVERY",
      name: "Academia Pro Local",
      priceCents: 0,
      reportsEnabled: true,
      ragEnabled: true,
      humanHandoffEnabled: true,
    },
    update: {
      name: "Academia Pro Local",
    },
    select: { id: true },
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plano: "pro",
      configNicho: {
        sub_nicho: "academia",
      },
    },
  });

  await prisma.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planId: plan.id,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

function inferName(input: AuthenticatedUser) {
  if (input.nome && input.nome.trim().length > 0) {
    return input.nome.trim();
  }

  if (input.email) {
    const [prefix] = input.email.split("@");
    if (prefix && prefix.trim().length > 1) {
      return prefix.trim();
    }
  }

  return "Cliente";
}

function createLocalFallbackBootstrap(authUser: AuthenticatedUser): TenantBootstrapResult {
  const email = authUser.email ?? `${authUser.id}@no-email.local`;
  const nome = inferName(authUser);

  return {
    user: {
      id: authUser.id,
      email,
      nome,
    },
    tenant: {
      id: authUser.id,
      nome: "Minha Loja",
      botName: null,
      companyName: null,
    },
    metrics: {
      stockItems: 0,
      ordersReceived: 0,
      activeFlows: 0,
    },
    localFallback: true,
  };
}

/**
 * Garante que o usuário autenticado possua registro local em `users`
 * e pelo menos um tenant associado. Todas as consultas são filtradas
 * pelo userId para evitar vazamento entre lojas.
 */
export async function ensureTenantForUser(
  authUser: AuthenticatedUser,
): Promise<TenantBootstrapResult> {
  const email = authUser.email ?? `${authUser.id}@no-email.local`;
  const nome = inferName(authUser);

  try {
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const user = existingByEmail
      ? await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { nome },
          select: {
            id: true,
            email: true,
            nome: true,
          },
        })
      : await prisma.user.upsert({
          where: { id: authUser.id },
          create: {
            id: authUser.id,
            email,
            nome,
          },
          update: {
            email,
            nome,
          },
          select: {
            id: true,
            email: true,
            nome: true,
          },
        });

    const cookieStore = await cookies();
    const impersonatedTenantId = cookieStore.get(ADMIN_IMPERSONATION_COOKIE)?.value;

    if (isPlatformAdmin(authUser.email) && impersonatedTenantId) {
      const impersonatedTenant = await prisma.tenant.findUnique({
        where: { id: impersonatedTenantId },
        select: {
          id: true,
          nome: true,
          botName: true,
          companyName: true,
        },
      });

      if (impersonatedTenant) {
        const stockItems = await prisma.stockItem.count({
          where: { tenantId: impersonatedTenant.id },
        });

        return {
          user,
          tenant: impersonatedTenant,
          metrics: {
            stockItems,
            ordersReceived: 0,
            activeFlows: 0,
          },
        };
      }
    }

    let tenant = await prisma.tenant.findFirst({
      where: { userId: user.id },
      orderBy: { dataCriacao: "desc" },
      select: {
        id: true,
        nome: true,
        botName: true,
        companyName: true,
      },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          nome: "Minha Loja",
          userId: user.id,
        },
        select: {
          id: true,
          nome: true,
          botName: true,
          companyName: true,
        },
      });
    }

    await ensureLocalAcademiaBootstrap(tenant.id);

    const stockItems = await prisma.stockItem.count({
      where: {
        tenant: {
          userId: user.id,
        },
      },
    });

    return {
      user,
      tenant,
      metrics: {
        stockItems,
        // Placeholders para dashboard inicial.
        ordersReceived: 0,
        activeFlows: 0,
      },
    };
  } catch {
    return createLocalFallbackBootstrap(authUser);
  }
}

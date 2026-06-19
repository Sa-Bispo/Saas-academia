"use server";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { DEFAULTS_ACADEMIA } from "@/lib/nicho";

// ─── signupWithNicho ──────────────────────────────────────────────────────────

const signupSchema = z.object({
  businessName: z.string().trim().min(2, "Nome do negócio inválido").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  planCode: z.string().min(1),
});

export type SignupWithNichoInput = z.infer<typeof signupSchema>;
export type SignupWithNichoResult =
  | { success: true; tenantId: string }
  | { success: false; error: string };

export async function signupWithNicho(
  input: SignupWithNichoInput,
): Promise<SignupWithNichoResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? "Dados inválidos." };
  }

  const { businessName, email, password, planCode } = parsed.data;

  try {
    const plan = await prisma.plan.findUnique({
      where: { code: planCode },
      select: { id: true },
    });

    if (!plan) {
      return { success: false, error: "Plano inválido. Volte e selecione um plano novamente." };
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: businessName,
          onboardingPending: true,
          onboardingSource: "subscription-modal",
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error:
          authError.message === "User already registered"
            ? "Já existe uma conta com esse e-mail. Tente fazer login."
            : authError.message,
      };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return { success: false, error: "Não foi possível finalizar o cadastro agora." };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const tenant = await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: authUserId },
        create: { id: authUserId, email, nome: businessName },
        update: { email, nome: businessName },
      });

      const t = await tx.tenant.create({
        data: {
          nome: businessName,
          userId: authUserId,
          companyName: businessName,
          configNicho: {
            ...DEFAULTS_ACADEMIA,
            categorias_customizadas: [...DEFAULTS_ACADEMIA.categorias_padrao],
          } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      await tx.subscription.create({
        data: {
          tenantId: t.id,
          planId: plan.id,
          status: "PENDING",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      if (DEFAULTS_ACADEMIA.produtos_exemplo.length > 0) {
        await tx.stockItem.createMany({
          data: DEFAULTS_ACADEMIA.produtos_exemplo.map((p) => ({
            nome: p.nome,
            variacao: p.categoria,
            preco: p.preco,
            quantidade: 0,
            tenantId: t.id,
          })),
        });
      }

      if (DEFAULTS_ACADEMIA.categorias_padrao.length > 0) {
        await tx.categoriaCardapio.createMany({
          data: DEFAULTS_ACADEMIA.categorias_padrao.map((nome, ordem) => ({
            tenant_id: t.id,
            nome,
            ordem,
          })),
        });
      }

      return t;
    });

    return { success: true, tenantId: tenant.id };
  } catch (err) {
    console.error("[signupWithNicho]", err);
    return { success: false, error: "Erro ao criar a conta. Tente novamente." };
  }
}

// ─── activateSubscriptionFake ─────────────────────────────────────────────────

const activateSchema = z.object({
  tenantId: z.string().uuid(),
});

export type ActivateSubscriptionResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

export async function activateSubscriptionFake(
  tenantId: string,
): Promise<ActivateSubscriptionResult> {
  const parsed = activateSchema.safeParse({ tenantId });
  if (!parsed.success) {
    return { success: false, error: "ID de tenant inválido." };
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscription: { select: { id: true, status: true } },
      },
    });

    if (!tenant) {
      return { success: false, error: "Tenant não encontrado." };
    }

    if (!tenant.subscription) {
      return { success: false, error: "Assinatura não encontrada." };
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    await prisma.subscription.update({
      where: { id: tenant.subscription.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return { success: true, redirectTo: "/setup" };
  } catch (err) {
    console.error("[activateSubscriptionFake]", err);
    return { success: false, error: "Erro ao ativar a assinatura. Tente novamente." };
  }
}

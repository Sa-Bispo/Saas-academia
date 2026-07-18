"use server";

import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { normalizeOnboardingNiche } from "@/lib/plan-context";
import { prisma } from "@/lib/prisma";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TONE_LABELS: Record<string, string> = {
  DESCONTRAIDO:
    "amigável, descontraído e próximo do cliente, usando linguagem informal e emojis com moderação",
  FORMAL: "profissional e formal, usando linguagem culta e sem abreviações",
  VENDEDOR:
    "persuasivo e focado em vendas, sempre buscando oportunidades para fechar o pedido",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  TIRAR_DUVIDAS:
    "tirar dúvidas do cliente sobre produtos, serviços e formas de pagamento",
  FECHAR_PEDIDO:
    "conduzir o cliente até o fechamento do pedido, coletando os dados necessários para entrega",
  AGENDAR: "captar o interesse do cliente e agendar um horário ou visita",
};

const NICHE_MENU: Record<"adega" | "lanchonete" | "pizzaria", string> = {
  adega:
    "CARDÁPIO:\n" +
    "• Cervejas: Heineken 600ml R$12 | Brahma 600ml R$11 | Corona R$11\n" +
    "• Destilados: Smirnoff 998ml R$49,90 | Jack Daniel's 1L R$139,90\n" +
    "• Energéticos: Red Bull 250ml R$9,90\n" +
    "• Narguilé: Essência Duas Maçãs R$18 | Carvão 1kg R$12\n" +
    "• Petiscos: Amendoim R$6\n" +
    "• COMBO Fim de Semana: Smirnoff + 2x Red Bull + Gelo = R$72",
  lanchonete:
    "CARDÁPIO:\n" +
    "• Lanches: X-Burguer R$18 | X-Bacon R$22 | X-Tudo R$26\n" +
    "• Combos (lanche+fritas+bebida): X-Burguer+suco R$28 | X-Bacon+refri R$32\n" +
    "• Bebidas: Suco natural R$8 | Refri R$5",
  pizzaria:
    "CARDÁPIO:\n" +
    "• Tradicionais: Calabresa R$35 | Frango Catupiry R$38 | Portuguesa R$38\n" +
    "• Especiais: 4 Queijos R$42 | Frango Bacon R$44\n" +
    "• Tamanhos: Pequena (+R$0) | Média (+R$10) | Grande (+R$20) | GG (+R$35)\n" +
    "• Bordas: Sem borda | Catupiry +R$8 | Cheddar +R$8",
};

const SALES_FUNNEL = `
FUNIL DE VENDAS — siga SEMPRE esta sequência:
1. ENTENDER: descubra o que o cliente quer (produto, quantidade, personalização).
2. CONFIRMAR PEDIDO: repita os itens e o total antes de pedir qualquer dado pessoal.
3. FECHAR: após confirmação, peça nome, endereço completo e forma de pagamento (dinheiro/pix/cartão) em UMA só mensagem.
4. ENCERRAR: confirme o pedido com prazo estimado e agradeça.

REGRAS ABSOLUTAS:
- NUNCA peça endereço antes de ter pelo menos 1 item confirmado no pedido.
- NUNCA repita informações que o cliente já deu.
- Se o cliente pedir o cardápio, mostre os itens de forma organizada e já sugira um item popular.
- Se o cliente disser um item que não existe, sugira o mais próximo e siga em frente — não trave.
- Seja direto: faça UMA pergunta por mensagem; não enfilere várias perguntas de uma vez.
- Mantenha respostas curtas (máx. 3 linhas), exceto quando exibir o cardápio completo.
- Seu único objetivo é fechar o pedido. Não filosfe, não dê receitas, não fuja do escopo.`;

function compilePromptIa(data: {
  botName: string;
  companyName: string;
  toneOfVoice: string;
  botObjective: string;
  niche?: "adega" | "lanchonete" | "pizzaria";
  businessContext?: string;
}): string {
  const tone = TONE_LABELS[data.toneOfVoice] ?? "amigável e prestativo";

  if (data.niche) {
    return (
      `Você é ${data.botName}, atendente virtual da ${data.companyName}.\n` +
      `Tom de voz: ${tone}.\n\n` +
      NICHE_MENU[data.niche] +
      "\n" +
      SALES_FUNNEL
    );
  }

  const objective =
    OBJECTIVE_LABELS[data.botObjective] ??
    "fechar pedidos e atender clientes com eficiência";

  let prompt =
    `Você é ${data.botName}, atendente virtual da ${data.companyName}.\n` +
    `Tom de voz: ${tone}.\n\n` +
    `OBJETIVO: ${objective}.\n` +
    SALES_FUNNEL;

  const context = (data.businessContext || "").trim();
  if (context) {
    prompt +=
      "\n\n--- CARDÁPIO / INFORMAÇÕES DO NEGÓCIO ---\n" +
      context;
  }

  return prompt;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  companyName: z.string().trim().min(1).max(120),
  botName: z.string().trim().min(1).max(80),
  niche: z.enum(["adega", "lanchonete", "pizzaria"]).optional(),
  toneOfVoice: z
    .enum(["DESCONTRAIDO", "FORMAL", "VENDEDOR"])
    .default("DESCONTRAIDO"),
  botObjective: z
    .enum(["TIRAR_DUVIDAS", "FECHAR_PEDIDO", "AGENDAR"])
    .default("TIRAR_DUVIDAS"),
  businessContext: z.string().trim().max(5000).optional().default(""),
});

export type CreateShadowTenantInput = z.infer<typeof schema>;

export type CreateShadowTenantResult =
  | { success: true; tenantId: string }
  | { success: false; error: string };

const claimShadowTenantSchema = z.object({
  tenantId: z.string().uuid("Tenant invalido"),
  name: z.string().trim().min(2, "Nome invalido").max(120),
  email: z.string().trim().email("E-mail invalido").max(255),
  password: z.string().min(6, "Senha muito curta"),
  niche: z.enum(["delivery", "clinicas", "empresas"]).default("delivery"),
});

export type ClaimShadowTenantInput = z.infer<typeof claimShadowTenantSchema>;
export type ClaimShadowTenantResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Cria um Tenant "shadow" para usuários anônimos do Test-Drive na landing page.
 * Um User temporário é gerado com e-mail shadow-{uuid}@shadow.local para
 * satisfazer a FK obrigatória sem exigir autenticação do visitante.
 */
export async function createShadowTenant(
  input: CreateShadowTenantInput,
): Promise<CreateShadowTenantResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados inválidos. Verifique os campos e tente novamente.",
    };
  }

  const data = parsed.data;

  try {
    const shadowEmail = `shadow-${crypto.randomUUID()}@shadow.local`;

    const tenant = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: shadowEmail, nome: "Shadow" },
        select: { id: true },
      });

      return tx.tenant.create({
        data: {
          nome: data.companyName,
          userId: user.id,
          botName: data.botName,
          companyName: data.companyName,
          toneOfVoice: data.toneOfVoice,
          botObjective: data.botObjective,
          configNicho: data.niche ? { subNicho: data.niche } : {},
          promptIa: compilePromptIa(data),
        },
        select: { id: true },
      });
    });

    return { success: true, tenantId: tenant.id };
  } catch (err) {
    console.error("[createShadowTenant]", err);
    return {
      success: false,
      error: "Erro ao criar o ambiente de teste. Tente novamente.",
    };
  }
}

export async function claimShadowTenant(
  input: ClaimShadowTenantInput,
): Promise<ClaimShadowTenantResult> {
  const parsed = claimShadowTenantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Dados invalidos para criar a conta.",
    };
  }

  const data = parsed.data;

  try {
    const shadowTenant = await prisma.tenant.findFirst({
      where: {
        id: data.tenantId,
        user: {
          email: {
            startsWith: "shadow-",
            endsWith: "@shadow.local",
          },
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!shadowTenant) {
      return {
        success: false,
        error: "Este ambiente de teste nao esta mais disponivel para reivindicacao.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nome: data.name,
          onboardingPending: true,
          onboardingSource: "test-drive",
        },
      },
    });

    if (authError) {
      return {
        success: false,
        error:
          authError.message === "User already registered"
            ? "Ja existe uma conta com esse e-mail. Tente fazer login."
            : authError.message,
      };
    }

    const authUserId = authData.user?.id;
    if (!authUserId) {
      return {
        success: false,
        error: "Nao foi possivel finalizar o cadastro agora.",
      };
    }

    await prisma.$transaction(async (tx) => {
      const emailInUse = await tx.user.findUnique({ where: { email: data.email } });
      if (emailInUse && emailInUse.id !== authUserId) {
        throw new Error("EMAIL_IN_USE");
      }

      await tx.user.upsert({
        where: { id: authUserId },
        create: {
          id: authUserId,
          email: data.email,
          nome: data.name,
        },
        update: {
          email: data.email,
          nome: data.name,
        },
      });

      await tx.tenant.update({
        where: { id: data.tenantId },
        data: {
          userId: authUserId,
        },
      });

      if (shadowTenant.userId !== authUserId) {
        const shadowTenantCount = await tx.tenant.count({
          where: { userId: shadowTenant.userId },
        });

        if (shadowTenantCount === 0) {
          await tx.user.delete({ where: { id: shadowTenant.userId } });
        }
      }
    });

    return {
      success: true,
      redirectTo: `/planos/${data.niche}?tenantId=${data.tenantId}`,
    };
  } catch (err) {
    if (err instanceof Error && err.message === "EMAIL_IN_USE") {
      return {
        success: false,
        error: "Este e-mail ja esta em uso por outro usuario.",
      };
    }

    console.error("[claimShadowTenant]", err);
    return {
      success: false,
      error: "Erro ao converter a conta de teste. Tente novamente.",
    };
  }
}

// ─── signupDirect ─────────────────────────────────────────────────────────────

const signupDirectSchema = z.object({
  name: z.string().trim().min(2, "Nome inválido").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha muito curta"),
  planCode: z.string().min(1),
});

export type SignupDirectInput = z.infer<typeof signupDirectSchema>;
export type SignupDirectResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };

/**
 * Cria conta + tenant diretamente (fluxo sem test-drive).
 * Usado quando o usuário clica "Assinar" direto na página de planos.
 */
export async function signupDirect(
  input: SignupDirectInput,
): Promise<SignupDirectResult> {
  const parsed = signupDirectSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos. Verifique os campos." };
  }

  const { name, email, password, planCode } = parsed.data;

  try {
    const plan = await prisma.plan.findUnique({
      where: { code: planCode },
      select: { id: true, niche: true },
    });

    if (!plan) {
      return { success: false, error: "Plano inválido. Volte e selecione um plano novamente." };
    }

    const onboardingNiche = normalizeOnboardingNiche(plan.niche);
    if (!onboardingNiche) {
      return { success: false, error: "Não foi possível identificar o nicho do plano selecionado." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome: name, onboardingPending: true, onboardingSource: "direct" } },
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
        create: { id: authUserId, email, nome: name },
        update: { email, nome: name },
      });

      const tenant = await tx.tenant.create({
        data: {
          nome: name,
          userId: authUserId,
          companyName: name,
          configNicho: { onboarding_niche: onboardingNiche } as Prisma.InputJsonValue,
        },
        select: { id: true },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planId: plan.id,
          status: "PENDING",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      return tenant;
    });

    return {
      success: true,
      redirectTo: `/setup`,
    };
  } catch (err) {
    console.error("[signupDirect]", err);
    return { success: false, error: "Erro ao criar a conta. Tente novamente." };
  }
}

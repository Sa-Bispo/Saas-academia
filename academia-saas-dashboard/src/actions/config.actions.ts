"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";

const TONE_LABELS: Record<string, string> = {
  DESCONTRAIDO: "amigável, descontraído e próximo do cliente, usando linguagem informal e emojis com moderação",
  FORMAL: "profissional e formal, usando linguagem culta e sem abreviações",
  VENDEDOR: "persuasivo e focado em vendas, sempre buscando oportunidades para fechar o pedido",
};

const OBJECTIVE_LABELS: Record<string, string> = {
  TIRAR_DUVIDAS: "tirar dúvidas do cliente sobre produtos, serviços e formas de pagamento",
  FECHAR_PEDIDO: "conduzir o cliente até o fechamento do pedido, coletando os dados necessários para entrega",
  AGENDAR: "captar o interesse do cliente e agendar um horário ou visita",
};

const SALES_FUNNEL_RULES = `

FUNIL DE VENDAS — siga SEMPRE esta sequência:
1. ENTENDER: descubra o que o cliente quer (produto, quantidade, personalização).
2. CONFIRMAR PEDIDO: repita os itens e o total antes de pedir qualquer dado pessoal.
3. FECHAR: após confirmação, peça nome, endereço completo e forma de pagamento em UMA só mensagem.
4. ENCERRAR: confirme o pedido com prazo estimado e agradeça.

REGRAS ABSOLUTAS:
- NUNCA peça endereço antes de ter pelo menos 1 item confirmado no pedido.
- NUNCA repita informações que o cliente já deu.
- Se o cliente pedir o cardápio, mostre os itens organizados e já sugira um popular.
- Se o cliente pedir algo fora do cardápio, sugira o mais próximo — não trave.
- Faça UMA pergunta por mensagem; não enfileire várias de uma vez.
- Respostas curtas (máx. 3 linhas), exceto ao exibir cardápio completo.
- Seu único objetivo é fechar o pedido. Não fuja do escopo.`;

function compilePromptIa(data: {
  botName?: string | null;
  companyName?: string | null;
  toneOfVoice?: string | null;
  strictRules?: string | null;
  botObjective?: string | null;
  operationContext?: string | null;
  subNicho?: string | null;
}): string {
  const name = (data.botName || "").trim() || "Assistente";
  const company = (data.companyName || "").trim() || (data.subNicho === "academia" ? "nossa academia" : "nossa empresa");
  const tone = TONE_LABELS[data.toneOfVoice || ""] || "amigável e prestativo";

  if (data.subNicho === "academia") {
    let prompt =
      `Você é ${name}, atendente virtual da ${company}.\n` +
      `Tom de voz: ${tone}.\n\n` +
      `OBJETIVO: atender alunos e interessados, responder dúvidas sobre modalidades, horários, planos e pagamentos.\n\n` +
      `REGRAS ABSOLUTAS:\n` +
      `- Seja objetivo e prestativo. Respostas curtas (máx. 3 linhas), exceto ao listar planos/modalidades.\n` +
      `- Quando o aluno mencionar pagamento de mensalidade, oriente-o a enviar o comprovante via WhatsApp.\n` +
      `- Não tome decisões que dependam do responsável — encaminhe ao dono quando necessário.\n` +
      `- Nunca confirme horários de aula ou disponibilidade sem que estejam nas informações abaixo.\n` +
      `- Foco total em: modalidades, horários, planos, matrículas e dúvidas gerais sobre a academia.`;

    if (data.operationContext && data.operationContext.trim()) {
      prompt += `\n\n--- INFORMAÇÕES DA ACADEMIA ---\n${data.operationContext.trim()}`;
    }

    if (data.strictRules && data.strictRules.trim()) {
      prompt += `\n\n--- REGRAS ESPECÍFICAS DO DONO (nunca quebre) ---\n${data.strictRules.trim()}`;
    }

    return prompt;
  }

  const objective = OBJECTIVE_LABELS[data.botObjective || ""] || "fechar pedidos e atender clientes com eficiência";

  let prompt =
    `Você é ${name}, atendente virtual da ${company}.\n` +
    `Tom de voz: ${tone}.\n\n` +
    `OBJETIVO: ${objective}.` +
    SALES_FUNNEL_RULES;

  if (data.operationContext && data.operationContext.trim()) {
    prompt += `\n\n--- CARDÁPIO / INFORMAÇÕES DA OPERAÇÃO ---\n${data.operationContext.trim()}`;
  }

  if (data.strictRules && data.strictRules.trim()) {
    prompt += `\n\n--- REGRAS ESPECÍFICAS DO LOJISTA (nunca quebre) ---\n${data.strictRules.trim()}`;
  }

  return prompt;
}

const updateTenantConfigSchema = z.object({
  botName: z.string().trim().max(80).optional().or(z.literal("")),
  companyName: z.string().trim().max(120).optional().or(z.literal("")),
  toneOfVoice: z.enum(["DESCONTRAIDO", "FORMAL", "VENDEDOR"]).optional().or(z.literal("")),
  strictRules: z.string().trim().max(2000).optional().or(z.literal("")),
  operationContext: z.string().trim().max(3000).optional().or(z.literal("")),
  botObjective: z.enum(["TIRAR_DUVIDAS", "FECHAR_PEDIDO", "AGENDAR"]).optional().or(z.literal("")),
  whatsappAdmin: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,20}$/, "Número inválido. Use apenas dígitos e opcional +")
    .optional()
    .or(z.literal("")),
  // Academia
  pixChave: z.string().trim().max(200).optional().or(z.literal("")),
  diasAntecedenciaCobranca: z.coerce.number().int().min(1).max(30).optional(),
  limiteDiarioCobrancas: z.coerce.number().int().min(1).max(500).optional(),
});

export type TenantConfigDTO = {
  id: string;
  nome: string;
  niche: "DELIVERY" | "CLINICA" | "EMPRESA" | null;
  promptIa: string | null;
  whatsappAdmin: string | null;
  botName: string | null;
  companyName: string | null;
  toneOfVoice: string | null;
  strictRules: string | null;
  botObjective: string | null;
  operationContext: string | null;
  // Academia
  subNicho: string | null;
  pixChave: string | null;
  diasAntecedenciaCobranca: number;
  limiteDiarioCobrancas: number;
};

export type UpdateTenantConfigInput = z.infer<typeof updateTenantConfigSchema>;

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

export async function getTenantConfig(): Promise<TenantConfigDTO> {
  const tenantData = await getAuthenticatedTenant();

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantData.tenant.id,
      userId: tenantData.user.id,
    },
    select: {
      id: true,
      nome: true,
      subscription: {
        select: {
          plan: {
            select: {
              niche: true,
            },
          },
        },
      },
      promptIa: true,
      whatsappAdmin: true,
      botName: true,
      companyName: true,
      toneOfVoice: true,
      strictRules: true,
      botObjective: true,
      operationContext: true,
      configNicho: true,
    },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado para este usuário.");
  }

  const cfg = (tenant.configNicho as Record<string, unknown> | null) ?? {};

  return {
    id: tenant.id,
    nome: tenant.nome,
    niche: tenant.subscription?.plan?.niche ?? null,
    promptIa: tenant.promptIa,
    whatsappAdmin: tenant.whatsappAdmin,
    botName: tenant.botName,
    companyName: tenant.companyName,
    toneOfVoice: tenant.toneOfVoice,
    strictRules: tenant.strictRules,
    botObjective: tenant.botObjective,
    operationContext: tenant.operationContext,
    subNicho: typeof cfg.sub_nicho === "string" ? cfg.sub_nicho : null,
    pixChave: typeof cfg.pixChave === "string" ? cfg.pixChave : null,
    diasAntecedenciaCobranca: typeof cfg.dias_antecedencia_cobranca === "number" ? cfg.dias_antecedencia_cobranca : 5,
    limiteDiarioCobrancas: typeof cfg.limite_diario_cobrancas === "number" ? cfg.limite_diario_cobrancas : 50,
  };
}

export async function updateTenantConfig(input: UpdateTenantConfigInput) {
  const payload = updateTenantConfigSchema.parse(input);
  const tenantData = await getAuthenticatedTenant();

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: tenantData.tenant.id,
      userId: tenantData.user.id,
    },
    select: { id: true, configNicho: true },
  });

  if (!tenant) {
    throw new Error("Tenant não encontrado para este usuário.");
  }

  const currentCfg = (tenant.configNicho as Record<string, unknown> | null) ?? {};

  const compiledPrompt = compilePromptIa({
    botName: payload.botName,
    companyName: payload.companyName,
    toneOfVoice: payload.toneOfVoice,
    strictRules: payload.strictRules,
    botObjective: payload.botObjective,
    operationContext: payload.operationContext,
    subNicho: typeof currentCfg.sub_nicho === "string" ? currentCfg.sub_nicho : null,
  });
  const updatedCfg: Record<string, unknown> = {
    ...currentCfg,
    ...(payload.pixChave !== undefined && { pixChave: payload.pixChave || null }),
    ...(payload.diasAntecedenciaCobranca !== undefined && { dias_antecedencia_cobranca: payload.diasAntecedenciaCobranca }),
    ...(payload.limiteDiarioCobrancas !== undefined && { limite_diario_cobrancas: payload.limiteDiarioCobrancas }),
  };

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      botName: payload.botName || null,
      companyName: payload.companyName || null,
      toneOfVoice: payload.toneOfVoice || null,
      strictRules: payload.strictRules || null,
      botObjective: payload.botObjective || null,
      operationContext: payload.operationContext || null,
      whatsappAdmin: payload.whatsappAdmin || null,
      promptIa: compiledPrompt,
      configNicho: updatedCfg,
    },
    select: {
      id: true,
      nome: true,
      promptIa: true,
      whatsappAdmin: true,
      botName: true,
      companyName: true,
      toneOfVoice: true,
      strictRules: true,
      botObjective: true,
    },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");

  return {
    success: true,
    message: "Configurações salvas com sucesso.",
    tenant: updated,
  };
}
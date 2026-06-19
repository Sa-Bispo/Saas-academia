import { prisma } from "@/lib/prisma";
import type { OnboardingNiche } from "@/lib/plan-context";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SubNicho = "academia";

export type ConfigNicho = {
  sub_nicho?: SubNicho;
  onboarding_niche?: OnboardingNiche;
  [key: string]: unknown;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULTS_ACADEMIA = {
  sub_nicho: "academia" as const,
  categorias_padrao: ["Musculação", "Aulas", "Avaliações", "Planos", "Suplementos"],
  tem_estoque: false,
  tem_combos: false,
  tem_variacoes: false,
  bot_tom: "formal",
  bot_foco: "agendamento_e_retenção",
  pergunta_quantidade: false,
  produtos_exemplo: [
    { nome: "Avaliação Física", categoria: "Avaliações", preco: 79.0, quantidade: 0 },
    { nome: "Plano Mensal", categoria: "Planos", preco: 129.9, quantidade: 0 },
    { nome: "Plano Trimestral", categoria: "Planos", preco: 349.9, quantidade: 0 },
    { nome: "Aula Experimental", categoria: "Aulas", preco: 0.0, quantidade: 0 },
  ],
};

export function getDefaultsForSubNicho(_subNicho: SubNicho) {
  return DEFAULTS_ACADEMIA;
}

// ─── Helper reutilizável ──────────────────────────────────────────────────────

export async function getTenantSubNicho(tenantId: string): Promise<SubNicho | null> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { configNicho: true },
    });

    if (!tenant) return null;

    const config = tenant.configNicho as ConfigNicho & { subNicho?: unknown };
    const sub = config?.sub_nicho ?? config?.subNicho;

    // Tenants de versões anteriores multi-nicho são tratados como academia
    if (sub === "academia" || sub === "adega" || sub === "pizzaria" || sub === "lanchonete") {
      return "academia";
    }
    return null;
  } catch {
    return "academia";
  }
}

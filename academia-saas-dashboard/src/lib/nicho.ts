import { prisma } from "@/lib/prisma";
import type { OnboardingNiche } from "@/lib/plan-context";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SubNicho = "adega" | "pizzaria" | "lanchonete" | "academia";

export type ConfigNicho = {
  sub_nicho?: SubNicho;
  onboarding_niche?: OnboardingNiche;
  [key: string]: unknown;
};

// ─── Defaults por sub-nicho ───────────────────────────────────────────────────

export const DEFAULTS_ADEGA = {
  sub_nicho: "adega" as const,
  categorias_padrao: ["Cervejas", "Destilados", "Energéticos", "Narguilé", "Petiscos", "Sem Álcool"],
  tem_estoque: true,
  tem_combos: true,
  tem_variacoes: false,
  bot_tom: "descontraido",
  bot_foco: "sugestao_de_combo",
  pergunta_quantidade: true,
  produtos_exemplo: [
    { nome: "Heineken 600ml", categoria: "Cervejas", preco: 12.0, quantidade: 48 },
    { nome: "Smirnoff 998ml", categoria: "Destilados", preco: 49.9, quantidade: 14 },
    { nome: "Red Bull 250ml", categoria: "Energéticos", preco: 9.9, quantidade: 30 },
    { nome: "Essência Duas Maçãs 50g", categoria: "Narguilé", preco: 18.0, quantidade: 22 },
  ],
  combos_exemplo: [
    {
      nome: "Combo Fim de Semana",
      descricao: "1x Smirnoff + 2x Red Bull + 1x Gelo",
      preco: 72.0,
    },
  ],
};

export const DEFAULTS_PIZZARIA = {
  sub_nicho: "pizzaria" as const,
  categorias_padrao: ["Tradicionais", "Especiais", "Doces", "Bebidas"],
  tem_estoque: false,
  tem_combos: false,
  tem_variacoes: true,
  variacoes_padrao: {
    tamanhos: [
      { nome: "Pequena", fatias: 4, modificador_preco: 0 },
      { nome: "Média", fatias: 6, modificador_preco: 10 },
      { nome: "Grande", fatias: 8, modificador_preco: 20 },
      { nome: "GG", fatias: 12, modificador_preco: 35 },
    ],
    bordas: [
      { nome: "Sem borda", preco_extra: 0 },
      { nome: "Borda de catupiry", preco_extra: 8 },
      { nome: "Borda de cheddar", preco_extra: 8 },
    ],
  },
  bot_tom: "descontraido",
  bot_foco: "venda_guiada",
  pergunta_tamanho: true,
  pergunta_borda: true,
  produtos_exemplo: [
    { nome: "Calabresa", categoria: "Tradicionais", preco: 35.0, quantidade: 0 },
    { nome: "Frango c/ Catupiry", categoria: "Tradicionais", preco: 38.0, quantidade: 0 },
    { nome: "4 Queijos", categoria: "Especiais", preco: 42.0, quantidade: 0 },
    { nome: "Portuguesa", categoria: "Tradicionais", preco: 38.0, quantidade: 0 },
  ],
};

export const DEFAULTS_LANCHONETE = {
  sub_nicho: "lanchonete" as const,
  categorias_padrao: ["Lanches", "Combos", "Bebidas", "Sobremesas"],
  tem_estoque: true,
  tem_combos: true,
  tem_variacoes: false,
  bot_tom: "descontraido",
  bot_foco: "sugestao_de_combo",
  pergunta_quantidade: true,
  produtos_exemplo: [
    { nome: "X-Burguer", categoria: "Lanches", preco: 18.0, quantidade: 0 },
    { nome: "X-Bacon", categoria: "Lanches", preco: 22.0, quantidade: 0 },
    { nome: "X-Tudo", categoria: "Lanches", preco: 26.0, quantidade: 0 },
    { nome: "Suco Natural 500ml", categoria: "Bebidas", preco: 8.0, quantidade: 0 },
  ],
  combos_exemplo: [
    {
      nome: "Combo X-Bacon",
      descricao: "X-Bacon + Fritas + Refri",
      preco: 32.0,
    },
  ],
};

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

export function getDefaultsForSubNicho(subNicho: SubNicho) {
  if (subNicho === "adega") return DEFAULTS_ADEGA;
  if (subNicho === "lanchonete") return DEFAULTS_LANCHONETE;
  if (subNicho === "academia") return DEFAULTS_ACADEMIA;
  return DEFAULTS_PIZZARIA;
}

// ─── Helper reutilizável ──────────────────────────────────────────────────────

/**
 * Retorna o sub-nicho do tenant ou null se ainda não configurado.
 * Pode ser usado em server actions e server components.
 */
export async function getTenantSubNicho(tenantId: string): Promise<SubNicho | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { configNicho: true },
  });

  if (!tenant) return null;

  const config = tenant.configNicho as ConfigNicho & { subNicho?: unknown };
  const sub = config?.sub_nicho ?? config?.subNicho;

  if (sub === "adega" || sub === "pizzaria" || sub === "lanchonete" || sub === "academia") return sub;
  return null;
}

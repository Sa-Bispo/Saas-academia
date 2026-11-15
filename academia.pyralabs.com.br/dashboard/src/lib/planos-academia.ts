// Planos de academia vendidos na landing (2026-11-15) e o que cada um libera.
// Os códigos batem com a migration 20261115000000_planos_academia_gestao_cobranca_completo.
// Usado SÓ na criação de cliente novo: trocar o plano de um cliente existente não mexe
// nos módulos dele (regra pra não impactar quem já usa, como a Academia Elite Club).
import type { ModuloChave } from "@/lib/modulos";

export type PlanoAcademiaCodigo = "academia_gestao" | "academia_cobranca" | "academia_completo";

export type PlanoAcademiaConfig = {
  nome: string;
  modulos: ModuloChave[];
  // WhatsApp da academia conectado ao sistema (instância na Evolution)
  whatsapp: boolean;
  // Lembretes e avisos de atraso saindo sozinhos (no Gestão a cobrança é assistida)
  cobrancaAutomatica: boolean;
  // Bot respondendo dúvidas 24h
  bot24h: boolean;
};

const BASE: ModuloChave[] = ["alunos", "documentos", "financeiro", "frequencia", "relatorios"];

export const PLANOS_ACADEMIA: Record<PlanoAcademiaCodigo, PlanoAcademiaConfig> = {
  academia_gestao: { nome: "Gestão", modulos: BASE, whatsapp: false, cobrancaAutomatica: false, bot24h: false },
  academia_cobranca: {
    nome: "Cobrança",
    modulos: [...BASE, "comunicacao"],
    whatsapp: true,
    cobrancaAutomatica: true,
    bot24h: false,
  },
  academia_completo: {
    nome: "Completo",
    modulos: [...BASE, "comunicacao"],
    whatsapp: true,
    cobrancaAutomatica: true,
    bot24h: true,
  },
};

export function getPlanoAcademia(code: string | null | undefined): PlanoAcademiaConfig | null {
  if (!code) return null;
  return (PLANOS_ACADEMIA as Record<string, PlanoAcademiaConfig>)[code] ?? null;
}

// Checklist de implantação mostrado depois de criar o cliente
export function checklistImplantacao(plano: PlanoAcademiaConfig | null): string[] {
  const itens = [
    "Logo e nome da academia (Configurações)",
    "Chave Pix (Configurações)",
    "Planos da academia: mensal, trimestral... (Planos)",
    "Importar ou cadastrar os alunos",
    "Revisar as perguntas do PAR-Q e mandar o link/QR",
  ];
  if (plano?.whatsapp) itens.push("Conectar o WhatsApp da academia (QR code)");
  if (plano?.cobrancaAutomatica) itens.push("Definir com quantos dias de antecedência sai o lembrete");
  return itens;
}

export const MODULOS_CHAVES = [
  "alunos",
  "documentos",
  "financeiro",
  "frequencia",
  "treinos",
  "comunicacao",
  "relatorios",
] as const;

export type ModuloChave = (typeof MODULOS_CHAVES)[number];

export const MODULOS_CATALOG: {
  chave: ModuloChave;
  nome: string;
  descricao: string;
  ordem: number;
}[] = [
  { chave: "alunos",      nome: "Alunos",      descricao: "Cadastro e ficha do aluno",           ordem: 1 },
  { chave: "documentos",  nome: "Documentos",  descricao: "PAR-Q, termos e assinatura digital",  ordem: 2 },
  { chave: "financeiro",  nome: "Financeiro",  descricao: "Mensalidades, baixas, inadimplência", ordem: 3 },
  { chave: "frequencia",  nome: "Frequência",  descricao: "Check-in e presença",                 ordem: 4 },
  { chave: "treinos",     nome: "Treinos",     descricao: "Fichas e prescrição",                 ordem: 5 },
  { chave: "comunicacao", nome: "Comunicação", descricao: "WhatsApp e avisos",                   ordem: 6 },
  { chave: "relatorios",  nome: "Relatórios",  descricao: "Dashboard e métricas",                ordem: 7 },
];

// "alunos" é base — nunca pode ser desativado pelo admin
export const MODULO_BASE: ModuloChave = "alunos";

// Mapa de rota → módulo necessário (usado na sidebar para filtrar links)
export const ROTA_MODULO: Record<string, ModuloChave> = {
  "/dashboard/academia": "relatorios",
  "/alunos":             "alunos",
  "/funcionarios":       "alunos",
  "/frequencia":         "frequencia",
  "/cobrancas":          "financeiro",
  "/planos-academia":    "financeiro",
  "/parq-config":        "documentos",
  "/whatsapp":           "comunicacao",
};

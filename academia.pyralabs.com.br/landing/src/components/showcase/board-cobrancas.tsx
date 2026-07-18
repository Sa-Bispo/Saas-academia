import { CircleDollarSign, Banknote, Check } from "lucide-react";

type Card = {
  nome: string;
  plano: string;
  valor: string;
  venc: string;
  forma: "Pix" | "Dinheiro";
};

type Coluna = {
  titulo: string;
  cor: string;
  count: number;
  cards: Card[];
};

const COLUNAS: Coluna[] = [
  {
    titulo: "Em dia",
    cor: "var(--wpp)",
    count: 86,
    cards: [
      { nome: "Ana Souza", plano: "Trimestral", valor: "89,90", venc: "12/08", forma: "Pix" },
      { nome: "Pedro Alves", plano: "Anual", valor: "79,90", venc: "03/09", forma: "Pix" },
      { nome: "Bruno Costa", plano: "Mensal", valor: "99,90", venc: "15/08", forma: "Dinheiro" },
    ],
  },
  {
    titulo: "Vence essa semana",
    cor: "#e0b341",
    count: 9,
    cards: [
      { nome: "Marcos Lima", plano: "Mensal", valor: "99,90", venc: "amanhã", forma: "Pix" },
      { nome: "Carla Dias", plano: "Trimestral", valor: "89,90", venc: "sex, 08/07", forma: "Pix" },
    ],
  },
  {
    titulo: "Atrasado",
    cor: "#e06a54",
    count: 4,
    cards: [
      { nome: "Rafael Melo", plano: "Mensal", valor: "99,90", venc: "há 3 dias", forma: "Pix" },
      { nome: "Beatriz Nunes", plano: "Mensal", valor: "99,90", venc: "há 6 dias", forma: "Dinheiro" },
    ],
  },
  {
    titulo: "Pago",
    cor: "var(--accent)",
    count: 128,
    cards: [
      { nome: "Júlia Reis", plano: "Anual", valor: "79,90", venc: "hoje", forma: "Pix" },
      { nome: "Lucas Rocha", plano: "Trimestral", valor: "89,90", venc: "ontem", forma: "Dinheiro" },
      { nome: "Diego Farias", plano: "Mensal", valor: "99,90", venc: "05/07", forma: "Pix" },
    ],
  },
];

function CardCobranca({ c, pago }: { c: Card; pago?: boolean }) {
  return (
    <div className="group rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-[var(--text-secondary)]">
          {c.nome.charAt(0)}
        </span>
        <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
          {c.nome}
        </span>
        {pago && (
          <Check size={13} className="ml-auto shrink-0 text-[var(--wpp)]" strokeWidth={3} />
        )}
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
          {c.plano}
        </span>
        <span className="flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
          {c.forma === "Pix" ? (
            <CircleDollarSign size={10} />
          ) : (
            <Banknote size={10} />
          )}
          {c.forma}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[11px] text-[var(--text-tertiary)]">{c.venc}</span>
        <span className="font-mono text-[13px] font-semibold text-[var(--text-primary)]">
          R$ {c.valor}
        </span>
      </div>
    </div>
  );
}

export function BoardCobrancas() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)]">
      {/* barra de topo estilo app */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Cobranças</span>
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-tertiary)]">
            julho
          </span>
        </div>
        <span className="rounded-full bg-[rgba(37,211,102,0.12)] px-2.5 py-1 text-[11px] font-medium text-[var(--wpp)]">
          <span className="font-mono">82%</span> recebido
        </span>
      </div>

      {/* colunas */}
      <div className="flex flex-1 gap-3 overflow-x-auto p-4">
        {COLUNAS.map((col) => (
          <div key={col.titulo} className="flex w-[180px] shrink-0 flex-col">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: col.cor }}
              />
              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                {col.titulo}
              </span>
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                {col.count}
              </span>
            </div>
            <div className="space-y-2.5">
              {col.cards.map((c) => (
                <CardCobranca key={c.nome} c={c} pago={col.titulo === "Pago"} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

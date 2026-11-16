// Réplica estática de /cobrancas (markup de app/(dashboard)/cobrancas/cobrancas-client.tsx),
// filtro "Pendentes", com os dados fictícios da Academia Demo.
// data-marca = onde o marcador numerado da landing se ancora.
import { AlertCircle, Bell, Check, CheckCircle, Clock, Hash, MessageCircle, Phone, RefreshCw, Send, Wallet, Zap } from "lucide-react";

const COBRANCAS = [
  { nome: "Rafael Mendes", tel: "(11) 91121-2570", desc: "Mensalidade Musculação Básico", venc: "13/11/2026", valor: "R$ 89,90" },
  { nome: "Heloisa Santos Pires", tel: "(11) 91163-0229", desc: "Mensalidade Musculação Básico", venc: "15/11/2026", valor: "R$ 89,90" },
  { nome: "Alexandre Souza Santos", tel: "(11) 92492-0821", desc: "Mensalidade Musculação + Cardio", venc: "16/11/2026", valor: "R$ 129,90" },
  { nome: "Giovana Santos Castro", tel: "(11) 90175-3963", desc: "Mensalidade Plano Completo", venc: "17/11/2026", valor: "R$ 179,90" },
  { nome: "Vanessa Santos Moreira", tel: "(11) 91619-3782", desc: "Mensalidade Plano Completo", venc: "18/11/2026", valor: "R$ 179,90" },
];

function ResumoCard({
  label,
  valor,
  count,
  color,
  icon: Icon,
  marca,
}: {
  label: string;
  valor: string;
  count: string;
  color: string;
  icon: React.ElementType;
  marca?: number;
}) {
  return (
    <div data-marca={marca} className="rounded-2xl border border-line bg-surface/60 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{valor}</p>
          <p className="mt-0.5 text-xs text-muted">{count}</p>
        </div>
        <div className="rounded-xl border border-line bg-white/5 p-2.5">
          <Icon size={17} className={color} />
        </div>
      </div>
    </div>
  );
}

export function TelaCobrancas() {
  return (
    <section className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Cobranças</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/60 px-4 py-2 text-sm font-medium text-foreground">
            <RefreshCw size={14} />
            Gerar cobranças
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04140a]">
            <Zap size={14} />
            Disparar lote
          </span>
        </div>
      </div>

      {/* Comprovantes pendentes de validação */}
      <div data-marca={1} className="flex items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            <Bell size={16} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
              2
            </span>
          </span>
          <p className="text-sm text-white">
            <strong>2</strong> comprovantes aguardando validação manual.
          </p>
        </div>
        <span className="shrink-0 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-400">
          Ver comprovantes
        </span>
      </div>

      {/* Info antecedência */}
      <div className="rounded-xl border border-line/50 bg-white/[0.02] px-4 py-3 text-xs text-muted">
        Cobranças serão geradas automaticamente para matrículas que vencem nos próximos{" "}
        <strong className="text-white">5 dias</strong>. Configure em <span className="text-brand">Configurações</span>.
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-3 gap-3">
        <ResumoCard label="Receita do mês" valor="R$ 49.480,30" count="2438 cobranças" color="text-brand" icon={CheckCircle} />
        <ResumoCard label="Pendente" valor="R$ 1.059,20" count="8 cobranças" color="text-amber-400" icon={Clock} marca={2} />
        <ResumoCard label="Vencido" valor="R$ 4.396,30" count="37 cobranças" color="text-red-400" icon={AlertCircle} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {["Todas", "Pendentes", "Vencidas", "Comprovantes (2)", "Pagas", "Canceladas"].map((label) => (
          <span
            key={label}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              label === "Pendentes" ? "bg-brand text-[#04140a]" : "border border-line bg-surface/60 text-muted"
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Lista */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
        <div className="divide-y divide-line/30">
          {COBRANCAS.map((c, i) => (
            <div key={c.nome} className="flex items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{c.nome}</p>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    Pendente
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Phone size={10} />
                    {c.tel}
                  </span>
                  <span>{c.desc}</span>
                  <span>Venc. {c.venc}</span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="text-base font-semibold tabular-nums text-amber-400">{c.valor}</span>
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand">
                    <Check size={12} />
                    Pix recebido
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                    <Wallet size={12} />
                    Dinheiro
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                    <Hash size={12} />
                    Código bot
                  </span>
                  <span
                    data-marca={i === 0 ? 3 : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted"
                  >
                    <MessageCircle size={12} />
                    Cobrar no meu WhatsApp
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted">
                    <Send size={12} />
                    Enviar
                  </span>
                  <span className="rounded-lg border border-line p-1.5 text-muted">
                    <AlertCircle size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Réplicas estáticas de /alunos e do modal da ficha do aluno (markup de
// app/(dashboard)/alunos/alunos-client.tsx), com os dados fictícios da Academia Demo.
// data-marca = onde o marcador numerado da landing se ancora.
import {
  Cake,
  Check,
  ClipboardList,
  Dumbbell,
  FileText,
  IdCard,
  ImageIcon,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Receipt,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react";

const ALUNOS = [
  { nome: "Caio Lima Leite", ini: "CL", cor: "bg-amber-500/30 text-amber-300", tel: "(11) 99909-8950", desde: "01/08/2026", aniv: "em 2d", mens: "Em dia", sub: "vence 08/12/2026", corMens: "var(--success-text)" },
  { nome: "Elias Silva Farias", ini: "EF", cor: "bg-rose-500/30 text-rose-300", tel: "(11) 90797-2141", desde: "07/07/2026", aniv: "em 2d", mens: "Em dia", sub: "vence 04/12/2026", corMens: "var(--success-text)" },
  { nome: "João Souza Torres", ini: "JT", cor: "bg-amber-500/30 text-amber-300", tel: "(11) 97402-8241", desde: "25/04/2026", aniv: "em 2d", mens: "Vence em 7d", sub: "23/11/2026", corMens: "var(--warning-text)" },
  { nome: "Paulo Oliveira Carvalho", ini: "PC", cor: "bg-emerald-500/30 text-emerald-300", tel: "(11) 96127-4736", desde: "19/07/2026", aniv: "em 2d", mens: "Em dia", sub: "vence 27/11/2026", corMens: "var(--success-text)" },
  { nome: "Wagner Santos Mendes", ini: "WM", cor: "bg-amber-500/30 text-amber-300", tel: "(11) 96656-9798", desde: "13/04/2026", aniv: "em 2d", mens: "Em dia", sub: "vence 30/11/2026", corMens: "var(--success-text)" },
  { nome: "Caio Silva Ribeiro", ini: "CR", cor: "bg-emerald-500/30 text-emerald-300", tel: "(11) 93428-5545", desde: "01/08/2026", aniv: "em 6d", mens: "Em dia", sub: "vence 08/12/2026", corMens: "var(--success-text)" },
  { nome: "Eduardo Souza Cunha", ini: "EC", cor: "bg-emerald-500/30 text-emerald-300", tel: "(11) 98832-8500", desde: "18/05/2026", aniv: "em 6d", mens: "Em dia", sub: "vence 27/11/2026", corMens: "var(--success-text)" },
  { nome: "Kevin Oliveira Campos", ini: "KC", cor: "bg-violet-500/30 text-violet-300", tel: "(11) 93857-1444", desde: "13/08/2026", aniv: "em 6d", mens: "Em dia", sub: "vence 30/11/2026", corMens: "var(--success-text)" },
];

function Ordenar({ label, className, ativo }: { label: string; className: string; ativo?: boolean }) {
  return (
    <span className={`items-center gap-1 uppercase tracking-wider ${ativo ? "text-foreground" : "text-muted"} ${className}`}>
      {label}
      <span className={`text-[9px] leading-none ${ativo ? "text-brand" : "text-muted/40"}`}>{ativo ? "↑" : "↕"}</span>
    </span>
  );
}

export function TelaAlunos() {
  return (
    <section className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Academia</p>
          <h1 className="font-display mt-1 text-2xl font-bold uppercase tracking-tight text-white">Alunos</h1>
          <p className="mt-1 text-sm text-muted">Seus alunos organizados — um alô no WhatsApp a um clique.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-medium text-muted">
            <Upload size={14} />
            Importar CSV
          </span>
          <span className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[#04140a]">
            <Plus size={15} />
            Novo aluno
          </span>
        </div>
      </div>

      {/* Cards de relacionamento */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Cake, t: "Aniversariantes", v: "11", s: "na semana · mande os parabéns", dot: "var(--warning-text)" },
          { icon: UserPlus, t: "Novos este mês", v: "6", s: "dê as boas-vindas · filtrar", dot: "var(--accent)" },
          { icon: FileText, t: "PAR-Q pendente", v: "0", s: "avaliação não assinada" },
        ].map(({ icon: Icon, t, v, s, dot }) => (
          <div key={t} className="rounded-2xl border border-line bg-surface/60 p-4">
            <div className="flex items-center gap-2">
              <Icon size={14} className="text-muted" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t}</p>
              {dot && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
            </div>
            <p className="font-display mt-2.5 text-[28px] font-bold leading-none tabular-nums text-white">{v}</p>
            <p className="mt-1.5 text-[11px] text-muted">{s}</p>
          </div>
        ))}
      </div>

      {/* Segmentos + busca */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-line bg-surface/60 p-1">
          {[
            { label: "Todos", count: 453, ativo: true },
            { label: "Ativos", count: 398 },
            { label: "Novos", count: 6 },
            { label: "Vencendo", count: 38, danger: true },
            { label: "Inadimplentes", count: 29, danger: true },
            { label: "Inativos", count: 18 },
          ].map(({ label, count, ativo, danger }) => (
            <span
              key={label}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${ativo ? "bg-white/[0.07] text-white" : "text-muted"}`}
            >
              {label}
              <span className={`font-mono text-[11px] ${ativo ? "text-brand" : danger ? "text-red-400/60" : "text-muted"}`}>{count}</span>
            </span>
          ))}
        </div>
        <div className="relative ml-auto w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <div className="w-full rounded-xl border border-line bg-surface/60 py-2.5 pl-9 pr-4 text-sm text-muted">
            Buscar aluno, telefone…
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-2xl border border-line bg-surface/60">
        <div className="flex items-center gap-3 border-b border-line/50 bg-white/[0.015] px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
          <Ordenar label="Aluno" className="flex flex-1" />
          <span className="w-24">Plano</span>
          <Ordenar label="Aluno desde" className="flex w-24" />
          <Ordenar label="Aniversário" className="flex w-28" ativo />
          <span className="flex-1">Observação</span>
          <Ordenar label="Mensalidade" className="flex w-36" />
          <span className="w-24">Status</span>
          <span className="w-14 text-right">Whats</span>
        </div>

        <div className="divide-y divide-line/30">
          {ALUNOS.map((a, i) => (
            <div key={a.nome} className="flex items-center gap-3 px-5 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${a.cor}`}>{a.ini}</div>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{a.nome}</span>
                  <span className="font-mono text-[11px] text-muted">{a.tel}</span>
                </div>
              </div>
              <div className="w-24">
                <span className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">Mensal</span>
              </div>
              <div className="w-24 font-mono text-[12px] text-muted">{a.desde}</div>
              <div className="w-28">
                <span className="font-mono text-[11.5px]" style={{ color: "var(--warning-text)" }}>
                  🎂 {a.aniv}
                </span>
              </div>
              <div className="flex-1 truncate text-[12.5px] text-muted">—</div>
              <div className="w-36" data-marca={i === 0 ? 1 : undefined}>
                <span className="font-mono text-[12px] font-semibold" style={{ color: a.corMens }}>
                  {a.mens}
                </span>
                <span className="block font-mono text-[10px] text-muted">{a.sub}</span>
              </div>
              <div className="w-24">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ color: "var(--success-text)", background: "rgba(37,211,102,.10)" }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success-text)" }} />
                  Ativo
                </span>
              </div>
              <div className="flex w-14 justify-end">
                <span
                  data-marca={i === 0 ? 2 : undefined}
                  className="rounded-lg border p-1.5"
                  style={{ color: "var(--accent)", borderColor: "rgba(37,211,102,.28)" }}
                >
                  <MessageCircle size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SecaoCard({ icon: Icon, titulo, children }: { icon: React.ElementType; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line/50 bg-white/[0.03] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon size={12} />
        {titulo}
      </p>
      {children}
    </div>
  );
}

// Modal "ficha do aluno" (sem o fundo escuro do modal: só o cartão)
export function TelaFichaAluno() {
  return (
    <div data-marca={3} className="flex w-full flex-col rounded-2xl border border-line bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line" style={{ background: "var(--bg-tertiary)" }}>
              <ImageIcon size={15} className="text-muted" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-surface text-muted">
              <Pencil size={10} />
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Beatriz Silva Araújo</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              Ativo
            </span>
          </div>
        </div>
        <X size={18} className="text-muted" />
      </div>

      <div className="space-y-3 px-5 py-4">
        <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)]">
          <MessageCircle size={16} /> Conversar no WhatsApp
        </span>

        <SecaoCard icon={Phone} titulo="Contato">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-sm text-foreground">
              <Phone size={12} className="text-muted" /> (11) 99754-5608
            </p>
            <p className="flex items-center gap-1.5 text-sm text-foreground">
              <Mail size={12} className="text-muted" /> beatriz43@email.com
            </p>
          </div>
        </SecaoCard>

        <SecaoCard icon={IdCard} titulo="Dados pessoais">
          <div className="grid grid-cols-2 gap-2 text-sm text-foreground">
            <p className="flex items-center gap-1.5">
              <IdCard size={12} className="text-muted" /> 602.251.596-30
            </p>
            <p className="flex items-center gap-1.5">
              <Cake size={12} className="text-muted" /> 15/08/1984 · 42 anos
            </p>
          </div>
          <p className="mt-2 text-xs text-muted">Aluno desde 10/07/2026</p>
        </SecaoCard>

        <SecaoCard icon={ClipboardList} titulo="PAR-Q">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              <Check size={10} />
              Respondido
            </span>
            <span className="text-xs text-muted">em 15/11/2026</span>
          </div>
        </SecaoCard>

        <SecaoCard icon={Dumbbell} titulo="Matrículas">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-foreground">Musculação Básico</p>
              <p className="text-xs text-muted">10/07/2026 → 07/12/2026</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">ATIVA</span>
          </div>
        </SecaoCard>

        <SecaoCard icon={Receipt} titulo="Mensalidade atual">
          <div className="space-y-3">
            <div className="text-sm">
              <p className="text-foreground">
                Musculação Básico · <span className="font-mono">R$ 89,90</span>
              </p>
              <p className="text-xs text-muted">Vence 07/12/2026</p>
            </div>
            <div className="flex gap-2">
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-xs font-semibold text-muted">
                ● Pendente
              </span>
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-xs font-semibold text-[var(--accent-text)]">
                ✓ Pago
              </span>
            </div>
            <p className="text-[11px] text-muted">Você marca na mão quando o aluno paga — sem cobrança nem mensagem automática.</p>
          </div>
        </SecaoCard>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-4">
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Trash2 size={13} /> Excluir aluno
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-[var(--accent-text)]">
          <Pencil size={14} /> Editar
        </span>
      </div>
    </div>
  );
}

"use client";

// Bento baseado no "block-bento-5" do 21st.dev, adaptado ao tema da landing (sem shadcn).
// Junta numa seção só o que antes eram 3: "Como funciona" (3 passos), "Financeiro"
// (cobrança) e "Em uso de verdade" (prova). Dados de aluno e gráfico são ilustrativos.
import { useEffect, useId, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowUpRight,
  Banknote,
  ChevronRight,
  MessageCircle,
  QrCode,
  Receipt,
  Users,
  Zap,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { Button } from "./button";
import { Cruz, Luz, SecaoTitulo } from "./grid-bits";
import { BorderTrail } from "./border-trail";
import { whatsappLink } from "./site";

const PASSOS: { n: string; titulo: string; texto: string; icon: LucideIcon }[] = [
  {
    n: "01",
    titulo: "Conecte o WhatsApp",
    texto: "Lê um QR code no painel. Eu te ajudo a escolher o número certo.",
    icon: QrCode,
  },
  {
    n: "02",
    titulo: "Cadastre alunos e planos",
    texto: "Importo sua base ou você cadastra em minutos, com Pix ou dinheiro.",
    icon: Users,
  },
  {
    n: "03",
    titulo: "Deixe rodar",
    texto: "O sistema avisa, cobra e registra. Você acompanha pelo painel.",
    icon: Rocket,
  },
];

const ALUNOS = [
  { id: "ana", nome: "Ana Souza", plano: "Mensal", dias: 0, valor: "89,90", status: "Pago", cor: "var(--wpp)" },
  { id: "marcos", nome: "Marcos Lima", plano: "Trimestral", dias: 1, valor: "79,90", status: "Comprovante recebido", cor: "#7cc4ff" },
  { id: "julia", nome: "Júlia Reis", plano: "Mensal", dias: 3, valor: "89,90", status: "Lembrete enviado", cor: "var(--text-secondary)" },
] as const;

const PAGAMENTOS: { nome: string; icon: LucideIcon }[] = [
  { nome: "Pix", icon: Zap },
  { nome: "Dinheiro", icon: Banknote },
  { nome: "WhatsApp", icon: MessageCircle },
  { nome: "Recibo", icon: Receipt },
];

// % das mensalidades do mês já recebidas, semana a semana (exemplo)
const GRAFICO = [
  { semana: "Sem 1", valor: 18 },
  { semana: "Sem 2", valor: 41 },
  { semana: "Sem 3", valor: 66 },
  { semana: "Sem 4", valor: 82 },
];

const PROVA = [
  "Alunos no lugar do caderno",
  "PAR-Q com foto e assinatura",
  "Aviso de quem está atrasado",
];

const cardBase = "group/spot relative bg-[var(--bg)]";

// Rótulo em mono, igual aos títulos de coluna do rodapé
function Rotulo({ n, children }: { n?: string; children: React.ReactNode }) {
  return (
    <p className="mb-2 font-[family-name:var(--font-space-mono)] text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
      {n && (
        <span className="mr-1.5 inline-block text-[var(--wpp)] transition-transform duration-300 group-hover/spot:translate-x-0.5">
          {n}
        </span>
      )}
      {children}
    </p>
  );
}

function dataDaqui(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function BentoFunciona() {
  const gradId = useId();
  // datas só no cliente, pra não divergir do HTML do servidor
  const [datas, setDatas] = useState<string[]>([]);
  useEffect(() => setDatas(ALUNOS.map((a) => dataDaqui(a.dias))), []);

  return (
    <section id="como-funciona" className="relative scroll-mt-16 overflow-x-clip py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SecaoTitulo
          n="01"
          rotulo="Como funciona"
          titulo="Do QR code à mensalidade paga"
          texto="Eu configuro com você, o aluno entra pelo QR code e a cobrança passa a rodar sozinha no WhatsApp. Você só acompanha pelo painel."
        />

        {/* estilo "values grid" (21st.dev): cards encostados, separados por linhas finas
            (gap-px sobre fundo da cor da linha), cruzinhas nas junções e luz que segue o mouse */}
        <div className="relative border border-[var(--border-strong)]">
          <Cruz className="left-0 top-0" />
          <Cruz className="left-full top-0" />
          <Cruz className="left-0 top-full" />
          <Cruz className="left-full top-full" />
        <div className="grid grid-cols-1 gap-px bg-[var(--border-strong)] lg:grid-cols-12 lg:items-stretch">
          {/* ── esquerda: 3 passos ─────────────────────────────── */}
          <div className={`${cardBase} flex flex-col justify-between gap-8 p-6 lg:col-span-4`}>
                <Luz />
                <Cruz className="left-0 top-0" />
            <div className="space-y-2">
              <Rotulo n="01">Implantação</Rotulo>
              <h3 className="text-xl font-bold tracking-tight">No ar em 3 passos</h3>
              <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
                Sem instalar nada e sem complicação técnica. A implantação eu faço
                junto com você.
              </p>
            </div>

            <ol className="flex flex-col gap-3">
              {PASSOS.map(({ n, titulo, texto, icon: Icon }) => (
                <li
                  key={n}
                  className="flex items-start gap-3.5 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-3.5"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.04]">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      <span className="mr-1.5 font-mono text-[var(--text-tertiary)]">{n}</span>
                      {titulo}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--text-secondary)]">
                      {texto}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <Button variant="wpp" size="md" href={whatsappLink()} external className="w-fit">
              <MessageCircle size={16} /> Falar com o Samuel
            </Button>
          </div>

          {/* ── direita ────────────────────────────────────────── */}
          <div className="flex flex-col gap-px bg-[var(--border-strong)] lg:col-span-8">
            <div className="grid flex-1 grid-cols-1 gap-px bg-[var(--border-strong)] md:grid-cols-2">
              {/* vencimentos */}
              <div id="cobranca" className={`${cardBase} flex scroll-mt-24 flex-col gap-5 p-5`}>
                <Luz />
                <Cruz className="left-0 top-0" />
                <BorderTrail
                  size={90}
                  className="bg-[var(--wpp)]"
                  style={{ boxShadow: "0 0 40px 18px rgba(37,211,102,0.45), 0 0 80px 40px rgba(37,211,102,0.15)" }}
                />
                <div className="space-y-1">
                  <Rotulo n="02">Cobrança</Rotulo>
                  <h3 className="text-lg font-bold tracking-tight">A mensalidade que se cobra sozinha</h3>
                  <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    O lembrete sai no WhatsApp antes de vencer. Pagou, você dá baixa em
                    um clique e o aluno recebe a confirmação.
                  </p>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  {ALUNOS.map((a, i) => (
                    <div
                      key={a.id}
                      className="group/item flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.04] text-sm font-semibold">
                            {a.nome[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold">{a.nome}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">
                              {a.plano} · vence {datas[i] ?? "…"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-[var(--text-tertiary)] transition-transform group-hover/item:translate-x-0.5"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-bold">R$ {a.valor}</span>
                        <span
                          className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium"
                          style={{ color: a.cor }}
                        >
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* formas de pagamento + gráfico */}
              <div className="flex flex-col gap-px bg-[var(--border-strong)]">
                <div className={`${cardBase} grid h-[72px] shrink-0 grid-cols-4 gap-2 p-2`}>
                <Luz />
                <Cruz className="left-0 top-0" />
                  {PAGAMENTOS.map(({ nome, icon: Icon }) => (
                    <div
                      key={nome}
                      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-white/[0.02]"
                    >
                      <Icon size={17} />
                      <span className="text-[11px] font-bold sm:text-xs">{nome}</span>
                    </div>
                  ))}
                </div>

                <div className={`${cardBase} flex flex-1 flex-col justify-between p-5`}>
                <Luz />
                <Cruz className="left-0 top-0" />
                  <div className="flex items-start justify-between">
                    <div>
                      <Rotulo n="03">Painel</Rotulo>
                      <p className="font-display text-4xl font-black leading-none tracking-tight">82%</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--text-secondary)]">
                        das mensalidades do mês já recebidas
                      </p>
                    </div>
                    <span className="rounded-md bg-[var(--text-primary)] px-2 py-0.5 text-xs font-bold text-[var(--bg)]">
                      no painel
                    </span>
                  </div>

                  <div className="mt-2 h-[165px] w-full text-[var(--text-primary)]">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={GRAFICO} margin={{ top: 10, right: 4, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="semana"
                        interval={0}
                        padding={{ left: 16, right: 8 }}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={6}
                        tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      />
                      <YAxis
                        orientation="right"
                        domain={[0, 100]}
                        ticks={[0, 50, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tickLine={false}
                        axisLine={false}
                        width={34}
                        tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                        contentStyle={{
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: 10,
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "var(--text-secondary)" }}
                        formatter={(v) => [`${v}% recebido`, ""]}
                        separator=""
                      />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        fill={`url(#${gradId})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-right text-[10px] text-[var(--text-tertiary)]">valores de exemplo</p>
                </div>
              </div>
            </div>

            {/* prova */}
            <div className={`${cardBase} flex min-h-20 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-7`}>
                <Luz />
                <Cruz className="left-0 top-0" />
              <p className="text-sm font-bold">
                <span className="mb-1 block font-[family-name:var(--font-space-mono)] text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  <span className="mr-1.5 text-[var(--wpp)]">04</span>Em uso de verdade
                </span>
                Numa academia de bairro aqui da região
              </p>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {PROVA.map((p) => (
                  <li key={p} className="text-[13px] text-[var(--text-secondary)]">
                    {p}
                  </li>
                ))}
              </ul>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-sm font-bold"
              >
                Ver na minha academia
                <ArrowUpRight
                  size={16}
                  className="text-[var(--text-tertiary)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]"
                />
              </a>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

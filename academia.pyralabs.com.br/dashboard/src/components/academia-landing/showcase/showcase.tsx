"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { BotDemo } from "./bot-demo";
import { CobrancaFluxo } from "./cobranca-fluxo";
import { PainelDemo } from "./painel-demo";
import { ParqDemo } from "./parq-demo";
import { Cruz, Luz, SecaoTitulo } from "../grid-bits";

// Ordem = o que mais vende primeiro. Cada aba diz de qual plano é (ver pricing.tsx).
// Só prometa aqui o que o sistema faz de verdade.
const TABS = [
  {
    id: "cobranca",
    tab: "Cobrança",
    plano: "a partir do Gestão",
    headline: "Pare de correr atrás de aluno atrasado",
    desc: "O lembrete sai no WhatsApp antes de vencer, o aluno recebe a chave Pix na conversa e manda o comprovante ali mesmo. Você confere e dá baixa em um clique.",
    points: [
      "Automático: lembrete antes de vencer e aviso de atraso",
      "Ou do seu jeito: a mensagem abre pronta e você envia",
      "Baixa em 1 clique, com confirmação pro aluno",
    ],
    hint: "Escolha Automático ou Você envia e siga os botões",
    demo: <CobrancaFluxo />,
  },
  {
    id: "parq",
    tab: "PAR-Q digital",
    plano: "todos os planos",
    headline: "O aluno novo se cadastra sozinho",
    desc: "Um QR code na recepção abre a ficha no celular do aluno. Ele preenche o PAR-Q, tira a foto e assina com o dedo. Cai tudo no seu painel.",
    points: [
      "Sem papel e sem digitar ficha na recepção",
      "Foto e assinatura guardadas com a ficha",
      "Busca por nome e PDF quando precisar",
    ],
    hint: "Simule o QR, responda e assine",
    demo: <ParqDemo />,
  },
  {
    id: "painel",
    tab: "Painel",
    plano: "todos os planos",
    headline: "Quem pagou, quem deve e quanto entrou",
    desc: "Alunos ativos, receita do mês e inadimplência num lugar só, sem caderno e sem planilha.",
    points: [
      "Receita e inadimplência do período",
      "Lista de quem está vencendo",
      "Alunos, planos e matrículas organizados",
    ],
    hint: "Passe o mouse nas barras e troque entre atrasados e vencendo",
    demo: <PainelDemo />,
  },
  {
    id: "bot",
    tab: "Atendimento 24h",
    plano: "plano Completo",
    headline: "Dúvida de aluno respondida a qualquer hora",
    desc: "Vencimento, chave Pix, horário e aula experimental: o assistente responde no WhatsApp da academia, até de madrugada.",
    points: [
      "Consulta o vencimento real do aluno",
      "Manda a chave Pix e recebe o comprovante",
      "Anota quem quer conhecer a academia e avisa a equipe",
    ],
    hint: "Clique nas opções e converse",
    demo: <BotDemo />,
  },
];

type Caixa = { left: number; width: number };

function SlidingTabs({
  labels,
  active,
  onChange,
}: {
  labels: string[];
  active: number;
  onChange: (i: number) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [caixas, setCaixas] = useState<Caixa[]>([]);

  // mede a posição de cada aba (e remede quando a tela muda de tamanho)
  useLayoutEffect(() => {
    const medir = () =>
      setCaixas(refs.current.map((el) => ({ left: el?.offsetLeft ?? 0, width: el?.offsetWidth ?? 0 })));
    medir();
    window.addEventListener("resize", medir);
    document.fonts?.ready.then(medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  const h = hover !== null ? caixas[hover] : undefined;
  const a = caixas[active];

  return (
    <div
      role="tablist"
      onMouseLeave={() => setHover(null)}
      className="relative flex w-max items-center gap-1 pb-2"
    >
      {/* fundo do hover */}
      <span
        aria-hidden
        className="absolute top-0 h-9 rounded-md bg-white/[0.08] transition-all duration-300 ease-out"
        style={{
          left: h?.left ?? a?.left ?? 0,
          width: h?.width ?? a?.width ?? 0,
          opacity: h ? 1 : 0,
        }}
      />
      {/* sublinhado da ativa */}
      <span
        aria-hidden
        className="absolute bottom-0 h-[2px] rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-out"
        style={{ left: a?.left ?? 0, width: a?.width ?? 0, opacity: a ? 1 : 0 }}
      />
      {labels.map((label, i) => (
        <button
          key={label}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          aria-selected={i === active}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          className={`relative z-10 h-9 whitespace-nowrap px-3.5 text-[15px] font-medium transition-colors duration-200 ${
            i === active || i === hover
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Showcase() {
  const [active, setActive] = useState(0);
  const t = TABS[active];

  return (
    <section id="recursos" className="relative scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SecaoTitulo
          n="02"
          rotulo="Recursos"
          titulo={
            <>
              Não acredite.{" "}
              <span className="text-[var(--text-secondary)]">Teste você mesmo.</span>
            </>
          }
          texto="Clique em cada parte e veja o sistema funcionando do jeito que a sua recepção vai usar."
        />

        {/* moldura no "esqueleto" da landing: linha fina, "+" nos cantos, abas como
            primeira linha e duas células (texto | demo) separadas por linha */}
        <div className="relative border border-[var(--border-strong)]">
          <Cruz className="left-0 top-0" />
          <Cruz className="left-full top-0" />
          <Cruz className="left-0 top-full" />
          <Cruz className="left-full top-full" />

          {/* abas estilo Vercel: o sublinhado da ativa corre sobre a linha de baixo */}
          <div className="overflow-x-auto border-b border-[var(--border-strong)]">
            <div className="min-w-max px-2 pt-2">
              <SlidingTabs labels={TABS.map((x) => x.tab)} active={active} onChange={setActive} />
            </div>
          </div>

          <div className="grid gap-px bg-[var(--border-strong)] lg:grid-cols-[0.82fr_1.18fr]">
            {/* texto */}
            <div className="group/spot relative flex flex-col justify-center bg-[var(--bg)] p-7 sm:p-10">
              <Luz />
              <Cruz className="left-full top-0 hidden lg:block" />
              <Cruz className="left-full top-full hidden lg:block" />
              <div key={`copy-${active}`} className="animate-fade-up relative">
                <p className="mb-4 font-[family-name:var(--font-space-mono)] text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                  <span className="mr-1.5 inline-block text-[var(--wpp)] transition-transform duration-300 group-hover/spot:translate-x-0.5">
                    0{active + 1}
                  </span>
                  {t.tab}
                  <span className="mx-2 text-[var(--border-strong)]">/</span>
                  {t.plano}
                </p>
                <h3 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-[32px]">
                  {t.headline}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">{t.desc}</p>
                <ul className="mt-6 space-y-3">
                  {t.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[15px]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(37,211,102,0.14)] text-[var(--wpp)]">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="text-[var(--text-primary)]">{p}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-7 text-[13px] font-medium text-[var(--text-tertiary)]">
                  {t.hint} <span className="hidden lg:inline">👉</span>
                  <span className="lg:hidden">👇</span>
                </p>
              </div>
            </div>

            {/* demo sobre a grade quadriculada */}
            <div className="relative overflow-hidden bg-[var(--bg)] p-4 sm:p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,#000_25%,transparent_80%)]"
              />
              <div key={`demo-${active}`} className="animate-fade-up relative h-[580px] [animation-delay:80ms]">
                {t.demo}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

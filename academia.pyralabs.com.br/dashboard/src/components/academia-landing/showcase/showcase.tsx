"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { BotDemo } from "./bot-demo";
import { BoardCobrancas } from "./board-cobrancas";
import { PainelDemo } from "./painel-demo";
import { ParqDemo } from "./parq-demo";

const TABS = [
  {
    id: "bot",
    tab: "Atendimento no WhatsApp",
    tabDesc: "Converse e veja o assistente responder",
    headline: "Seu atendente que nunca dorme",
    desc: "Tire dúvidas de plano, horário e vencimento a qualquer hora — na linguagem da sua academia. O aluno é atendido na hora, sem você no celular.",
    points: [
      "Responde na hora, 24 horas por dia",
      "Entende o que o aluno quer",
      "Puxa dados reais da matrícula",
    ],
    hint: "Clique nas opções e converse 👉",
    demo: <BotDemo />,
  },
  {
    id: "cobranca",
    tab: "Cobrança automática",
    tabDesc: "Dispare um vencimento e veja o Pix",
    headline: "A mensalidade que se cobra sozinha",
    desc: "O sistema identifica quem vai vencer, cobra no WhatsApp e dá baixa no pagamento — sem você correr atrás de ninguém.",
    points: [
      "Dispara sozinho pros que vão vencer",
      "Pix gerado dentro da conversa",
      "Baixa automática assim que paga",
    ],
    hint: "Alunos em colunas por status de pagamento 👉",
    demo: <BoardCobrancas />,
  },
  {
    id: "painel",
    tab: "Painel de gestão",
    tabDesc: "Receita e frequência num relance",
    headline: "Sua academia num relance",
    desc: "Receita, alunos ativos e frequência em tempo real — sem abrir cinco planilhas pra saber como o mês está indo.",
    points: [
      "Receita e inadimplência do período",
      "Frequência por dia da semana",
      "Decisão rápida, sem planilha",
    ],
    hint: "Troque o período e passe nas barras 👉",
    demo: <PainelDemo />,
  },
  {
    id: "parq",
    tab: "PAR-Q digital",
    tabDesc: "Preencha e assine como o aluno faz",
    headline: "PAR-Q assinado, sem papel",
    desc: "O aluno preenche e assina a avaliação de saúde direto no celular. Você acha, filtra e arquiva a ficha em segundos.",
    points: [
      "Preenchido e assinado no celular",
      "Busca e filtros por aluno",
      "Arquivado automaticamente",
    ],
    hint: "Responda, assine e envie 👉",
    demo: <ParqDemo />,
  },
];

export function Showcase() {
  const [active, setActive] = useState(0);
  const t = TABS[active];

  return (
    <section id="recursos" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Recursos
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            Não acredite, teste você mesmo
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Cada peça do sistema, funcionando aqui na página. Clique, mexa e veja
            como sua academia rodaria no automático.
          </p>
        </div>

        {/* Palco — copy à esquerda, demo funcional à direita */}
        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          {/* copy da feature ativa */}
          <div key={`copy-${active}`} className="animate-fade-up">
            <h3 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-[32px]">
              {t.headline}
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {t.desc}
            </p>
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
              {t.hint}
            </p>
          </div>

          {/* superfície interativa */}
          <div
            key={`demo-${active}`}
            className="animate-fade-up h-[560px] [animation-delay:80ms]"
          >
            {t.demo}
          </div>
        </div>

        {/* Abas embaixo — estilo Linear (linha + rótulo) */}
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
          {TABS.map((tabItem, i) => {
            const on = i === active;
            return (
              <button
                key={tabItem.id}
                onClick={() => setActive(i)}
                className={`border-t-2 pt-4 text-left transition-colors ${
                  on
                    ? "border-[var(--text-primary)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)]"
                }`}
              >
                <span
                  className={`block text-[15px] font-semibold transition-colors ${
                    on ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {tabItem.tab}
                </span>
                <span
                  className={`mt-1 block text-[13px] leading-snug transition-colors ${
                    on
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-tertiary)]/70"
                  }`}
                >
                  {tabItem.tabDesc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

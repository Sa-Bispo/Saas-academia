"use client";

// Visão geral = o PRÓPRIO componente do painel (AcademiaDashboardUI), só com dados
// fictícios da Academia Demo. Carrega sob demanda (recharts etc. fora do bundle inicial
// da landing). Os marcadores da landing se ancoram por texto, já que o componente
// original não tem data-marca.
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { AcademiaDashboardData } from "@/actions/academia-dashboard.actions";

const AcademiaDashboardUI = dynamic(
  () => import("@/components/academia/academia-dashboard-ui").then((m) => m.AcademiaDashboardUI),
  { ssr: false, loading: () => <div className="h-[900px]" /> },
);

const DADOS: AcademiaDashboardData = {
  totalAtivos: 397,
  totalInadimplentes: 29,
  novosEsseMes: 6,
  crescimentoAtivos: 1,
  receitaVariacaoPct: -6.4,
  receitaMesCents: 4948030,
  renovacoesProximas: 38,
  renovacoesValorCents: 412360,
  cobrancasPendentes: { count: 8, totalCents: 105920 },
  aguardandoValidacao: 2,
  taxaChurnPct: 3.1,
  ltvMedioCents: 118000,
  frequenciaMediaSemanal: 3.2,
  receitaMensal: [
    { mes: "Jun", receita: 49480, meta: 58143 },
    { mes: "Jul", receita: 49480, meta: 58143 },
    { mes: "Ago", receita: 49480, meta: 58143 },
    { mes: "Set", receita: 52857, meta: 58143 },
    { mes: "Out", receita: 52857, meta: 58143 },
    { mes: "Nov", receita: 49480, meta: 58143 },
  ],
  distribuicaoPlanos: [
    { plano: "Musculação Básico", alunos: 135, cor: "#818CF8" },
    { plano: "Musculação + Cardio", alunos: 101, cor: "#34d399" },
    { plano: "Plano Completo", alunos: 81, cor: "#f59e0b" },
    { plano: "Aulas Coletivas", alunos: 60, cor: "#f87171" },
    { plano: "VIP Anual", alunos: 21, cor: "#60a5fa" },
  ],
  frequenciaSemanal: [],
  rankingAlunos: [],
  cobrancasVencendo: [
    { id: "1", aluno: "Rafael Mendes", valor: 8990, vencimento: "13/11", plano: "Musculação Básico", dias: -3 },
    { id: "2", aluno: "Heloisa Santos Pires", valor: 8990, vencimento: "15/11", plano: "Musculação Básico", dias: -1 },
    { id: "3", aluno: "Alexandre Souza Santos", valor: 12990, vencimento: "16/11", plano: "Musculação + Cardio", dias: 0 },
  ],
  ultimosAlunos: [],
  aniversariantes: [],
  alunosEmRisco: [],
};

// Marca (1) os cards de número, (2) o gráfico de receita e (3) os próximos vencimentos,
// procurando o card pelo título. Roda de novo enquanto o componente termina de montar.
const ALVOS: [number, string][] = [
  [1, "Alunos Ativos"],
  [2, "Receita mensal"],
  [3, "Próximos vencimentos"],
];

export function TelaVisaoGeral() {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marcar = () => {
      const el = raiz.current;
      if (!el) return false;
      let achou = 0;
      for (const [n, texto] of ALVOS) {
        // o elemento mais interno cujo texto é exatamente o título do card
        const alvo: HTMLElement | undefined = [...el.querySelectorAll<HTMLElement>("div, p, span, h2, h3")]
          .reverse()
          .find((x) => x.textContent?.trim() === texto);
        // sobe até o card (primeiro ancestral com borda arredondada)
        let card: HTMLElement | null = alvo ?? null;
        while (card && card !== el) {
          const cs = getComputedStyle(card);
          if (parseFloat(cs.borderTopLeftRadius) >= 10 && parseFloat(cs.borderTopWidth) > 0) break;
          card = card.parentElement;
        }
        if (card && card !== el && !card.dataset.marca) {
          card.dataset.marca = String(n);
          achou++;
        } else if (card?.dataset.marca) achou++;
      }
      return achou === ALVOS.length;
    };
    if (marcar()) return;
    const obs = new MutationObserver(() => {
      if (marcar()) obs.disconnect();
    });
    if (raiz.current) obs.observe(raiz.current, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={raiz} className="p-6">
      <AcademiaDashboardUI data={DADOS} />
    </div>
  );
}

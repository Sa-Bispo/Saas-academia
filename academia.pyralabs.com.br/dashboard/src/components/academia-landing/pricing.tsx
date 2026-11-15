"use client";

import { Check, Flame, Plus, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { whatsappLink } from "@/components/academia-landing/site";
import Carousel from "./carousel/carousel";
import { BorderTrail } from "./border-trail";
import { SecaoTitulo } from "./grid-bits";

// Layout baseado no "pricing-02" do 21st.dev, adaptado às cores da landing (sem shadcn:
// a landing tem tema próprio em landing.css). Borda animada só no plano recomendado,
// em verde/branco discreto em vez do arco-íris original (regra anti-neon).
// 3 planos por recurso (2026-11-14). Valores: SegundoCerebro/30-Negocios/Precos e Ofertas.
type Plano = {
  nome: string;
  descricao: string;
  preco: string;
  itens: string[];
  recomendado?: boolean;
};

const planos: Plano[] = [
  {
    nome: "Gestão",
    descricao: "Pra largar o caderno e saber, num olhar, quem pagou e quem está devendo.",
    preco: "89,90",
    itens: [
      "Cadastro de alunos, planos e matrículas",
      "Painel de quem pagou e quem está devendo",
      "PAR-Q digital com foto e assinatura",
      "Cobrança assistida: a mensagem sai pronta e você envia do seu WhatsApp",
    ],
  },
  {
    nome: "Cobrança",
    descricao: "Pra parar de correr atrás de aluno atrasado. O lembrete sai sozinho no WhatsApp.",
    preco: "159,90",
    recomendado: true,
    itens: [
      "Tudo do Gestão",
      "Lembrete antes de vencer e aviso de atraso, automáticos",
      "Chave Pix na conversa e comprovante pelo WhatsApp",
      "Baixa em 1 clique, com confirmação pro aluno",
      "Pagamento em dinheiro com código na recepção",
    ],
  },
  {
    nome: "Completo",
    descricao: "Pra deixar o WhatsApp da academia respondendo aluno a qualquer hora.",
    preco: "249,90",
    itens: [
      "Tudo do Cobrança",
      "Bot respondendo dúvidas 24h: vencimento, horários e Pix",
      "Anota quem quer aula experimental e avisa a equipe",
      "Métricas de receita, inadimplência e frequência",
    ],
  },
];

const fundador = [
  "Implantação feita por mim, junto com você, sem custo",
  "14 dias usando com os seus alunos antes de pagar",
  "Sem fidelidade: se não fizer sentido, você para",
];


// O carrossel desenha um "tile" próprio atrás de cada card; aqui ele fica invisível
// pra valer só o visual do nosso card.
const CARD_SEM_FUNDO = {
  "--carousel-tile": "transparent",
  "--carousel-tile-shadow": "none",
  "--carousel-tile-edge": "transparent",
  "--carousel-tile-highlight": "transparent",
  "--carousel-hover": "none",
} as React.CSSProperties;

function PlanoCard({ p }: { p: Plano }) {
  return (
    <div className="relative flex h-full w-full flex-1 flex-col">
      {/* borda animada do recomendado */}
      {p.recomendado && (
        <div className="absolute -inset-px overflow-hidden rounded-2xl">
          <div className="absolute -inset-full animate-spin bg-[conic-gradient(from_0deg,transparent_0deg,var(--wpp)_70deg,rgba(255,255,255,0.55)_110deg,transparent_180deg,transparent_360deg)] blur-[2px] [animation-duration:4s]" />
          <div className="absolute inset-px rounded-2xl bg-[var(--bg-card)]" />
        </div>
      )}

      <div
        className={`relative flex flex-1 flex-col gap-6 rounded-2xl p-6 sm:gap-8 sm:p-8 ${
          p.recomendado ? "bg-transparent" : "border border-[var(--border)] bg-[var(--bg-card)]"
        }`}
      >
        {/* cabeçalho */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">{p.nome}</h3>
            {p.recomendado && (
              <span className="flex h-7 items-center gap-1.5 rounded-full bg-[var(--wpp)] px-3 text-sm font-semibold text-[#04140a]">
                <Flame size={15} /> Recomendado
              </span>
            )}
          </div>
          <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">{p.descricao}</p>
        </div>

        {/* preço */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-base text-[var(--text-secondary)]">R$</span>
          <span className="font-display text-5xl font-bold tracking-tight">{p.preco}</span>
          <span className="text-base text-[var(--text-tertiary)]">/mês</span>
        </div>

        <div className="h-px w-full bg-[var(--border)]" />

        {/* itens */}
        <ul className="flex flex-1 flex-col gap-4">
          {p.itens.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[15px] text-[var(--text-secondary)]">
              <Check
                size={16}
                className={`mt-0.5 shrink-0 ${p.recomendado ? "text-[var(--wpp)]" : "text-[var(--text-primary)]"}`}
              />
              {f}
            </li>
          ))}
        </ul>

        <Button
          variant={p.recomendado ? "wpp" : "secondary"}
          size="lg"
          href={whatsappLink()}
          external
          className="w-full"
        >
          Quero o {p.nome}
        </Button>
      </div>
    </div>
  );
}

// Coluna da moldura do desktop. O recomendado ganha caixa própria e a luz na borda.
function PlanoColuna({ p }: { p: Plano }) {
  return (
    <div
      className={`relative flex flex-col px-5 pb-5 pt-6 ${
        p.recomendado ? "rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)]" : ""
      }`}
    >
      {p.recomendado && (
        <BorderTrail
          size={110}
          className="bg-[var(--wpp)]"
          style={{ boxShadow: "0 0 40px 18px rgba(37,211,102,0.45), 0 0 80px 40px rgba(37,211,102,0.15)" }}
        />
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold leading-none">{p.nome}</h3>
          {p.recomendado ? (
            <span className="rounded-full bg-[var(--wpp)] px-2.5 py-0.5 text-xs font-semibold text-[#04140a]">
              Recomendado
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{p.descricao}</p>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-end gap-1 text-lg text-[var(--text-secondary)]">
          <span>R$</span>
          <span className="font-display -mb-0.5 text-5xl font-extrabold tracking-tighter text-[var(--text-primary)]">
            {p.preco}
          </span>
          <span>/mês</span>
        </div>
        <Button
          variant={p.recomendado ? "wpp" : "secondary"}
          size="md"
          href={whatsappLink()}
          external
          className="w-full"
        >
          Quero o {p.nome}
        </Button>
      </div>

      <div className="my-5 h-px w-full bg-[var(--border)]" />

      <ul className="flex flex-col gap-3">
        {p.itens.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
            <Check
              size={15}
              className={`mt-0.5 shrink-0 ${p.recomendado ? "text-[var(--wpp)]" : "text-[var(--text-primary)]"}`}
            />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="planos" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex w-full flex-col items-center gap-10">
          <div className="w-full">
            <SecaoTitulo
              n="03"
              rotulo="Preço"
              titulo="Escolha o plano que cabe na sua academia"
              texto="Preço fechado por mês, sem taxa por aluno. O Cobrança se paga com 2 alunos que deixam de atrasar."
            />
          </div>

          {/* desktop: moldura no estilo "single-pricing-card" (21st.dev), casando com o
              rodapé: linhas finas, cruzinhas nos cantos, grade de fundo e luz na borda do Cobrança */}
          <div className="relative hidden w-full lg:block">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_70%)]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="relative w-full space-y-4"
            >
              <div className="relative grid grid-cols-3 gap-2 border border-[var(--border-strong)] bg-[var(--bg)] p-4">
                {(["-top-3 -left-3", "-top-3 -right-3", "-bottom-3 -left-3", "-bottom-3 -right-3"] as const).map((pos) => (
                  <Plus key={pos} size={22} strokeWidth={1.5} className={`absolute ${pos} text-[var(--text-tertiary)]`} />
                ))}

                {planos.map((p) => (
                  <PlanoColuna key={p.nome} p={p} />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                <ShieldCheck size={16} className="text-[var(--wpp)]" />
                <span>
                  <span className="text-[var(--text-primary)]">Condição de fundador</span> (10 primeiras academias):
                  implantação sem custo · 14 dias de teste · sem fidelidade
                </span>
              </div>
            </motion.div>
          </div>

          <div className="w-full lg:hidden">
            <Carousel
              items={planos.map((p) => (
                <PlanoCard key={p.nome} p={p} />
              ))}
              initialIndex={Math.max(0, planos.findIndex((p) => p.recomendado))}
              baseWidth={420}
              aspectRatio={0.48}
              effect="slide"
              peek={12}
              gap={12}
              radius={16}
              frame={false}
              indicator="dots"
              theme="dark"
              style={CARD_SEM_FUNDO}
            />
          </div>

          {/* fundador (celular; no desktop vira a linha embaixo da moldura) */}
          <div className="w-full rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6 sm:p-7 lg:hidden">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--wpp)]">
                  Condição de fundador · 10 primeiras academias
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Vale pra qualquer plano.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-3 lg:max-w-3xl">
                {fundador.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check size={15} className="mt-0.5 shrink-0 text-[var(--wpp)]" />
                    <span className="text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Check, Plus, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./button";
import { whatsappLink } from "@/components/academia-landing/site";
import Carousel from "./carousel/carousel";
import { BorderTrail } from "./border-trail";
import { Cruz, SecaoTitulo } from "./grid-bits";

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



// O carrossel desenha um "tile" próprio atrás de cada card; aqui ele fica invisível
// pra valer só o visual do nosso card.
const CARD_SEM_FUNDO = {
  "--carousel-tile": "transparent",
  "--carousel-tile-shadow": "none",
  "--carousel-tile-edge": "transparent",
  "--carousel-tile-highlight": "transparent",
  "--carousel-hover": "none",
} as React.CSSProperties;

// Coluna da moldura (desktop) e card do carrossel (celular). O recomendado ganha caixa
// própria e a luz na borda; no celular os outros ganham borda fina pra virar card.
function PlanoColuna({ p, cartao = false }: { p: Plano; cartao?: boolean }) {
  const caixa = p.recomendado
    ? "rounded-xl border border-[var(--border-strong)] bg-[var(--bg-card)]"
    : cartao
      ? "rounded-xl border border-[var(--border)] bg-[var(--bg)]"
      : "";
  return (
    <div className={`relative flex flex-col px-5 pb-5 pt-6 ${cartao ? "h-full w-full" : ""} ${caixa}`}>
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

      <div className={`${cartao ? "mt-5" : "mt-8"} space-y-4`}>
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

      <div className={`${cartao ? "my-4" : "my-5"} h-px w-full bg-[var(--border)]`} />

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

          {/* celular: a mesma moldura do desktop (linha fina, "+" nos cantos, grade de
              fundo), com os planos num carrossel que abre no Cobrança */}
          <div className="relative w-full lg:hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,#000_15%,transparent_70%)]"
            />
            <div className="relative border border-[var(--border-strong)] bg-[var(--bg)]/60 py-4">
              <Cruz className="left-0 top-0" />
              <Cruz className="left-full top-0" />
              <Cruz className="left-0 top-full" />
              <Cruz className="left-full top-full" />
              <Carousel
                items={planos.map((p) => (
                  <PlanoColuna key={p.nome} p={p} cartao />
                ))}
                initialIndex={Math.max(0, planos.findIndex((p) => p.recomendado))}
                baseWidth={420}
                aspectRatio={0.54}
                effect="slide"
                peek={14}
                gap={10}
                radius={12}
                frame={false}
                indicator="dots"
                theme="dark"
                style={CARD_SEM_FUNDO}
              />
            </div>

            <div className="mt-5 flex items-start justify-center gap-2 px-2 text-center text-[13px] text-[var(--text-secondary)]">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--wpp)]" />
              <span>
                <span className="text-[var(--text-primary)]">Condição de fundador</span> (10 primeiras academias):
                implantação sem custo · 14 dias de teste · sem fidelidade
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

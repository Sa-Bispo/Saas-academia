import { ArrowRight } from "lucide-react";
import { Button } from "./button";
import { HeroVisual } from "./hero-visual";
import { whatsappLink } from "@/components/academia-landing/site";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Foto da academia sangrando pela direita (lg+) */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-0 hidden w-[54%] bg-cover bg-center lg:block"
        style={{ backgroundImage: "url(/academia_fundo.png)" }}
      >
        {/* escurece a foto levemente (mantém legível o chat) */}
        <div className="absolute inset-0 bg-[#0b0b0d]/25" />
        {/* funde no fundo pela esquerda — some só na borda esquerda */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0d] via-[#0b0b0d]/40 to-transparent" />
        {/* funde topo e base bem de leve */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0d]/50 via-transparent to-[#0b0b0d]/90" />
      </div>

      {/* Fundo abstrato à esquerda — formas suaves escuras (profundidade, sem neon) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full overflow-hidden lg:w-[68%]">
        {/* forma clara suave, canto superior esquerdo */}
        <div className="absolute -left-40 -top-32 h-[560px] w-[560px] rounded-full bg-white/[0.04] blur-[120px]" />
        {/* whisper quente bem sutil, meio-esquerda */}
        <div className="absolute left-[6%] top-[36%] h-[460px] w-[460px] rounded-full bg-[rgba(255,240,220,0.04)] blur-[130px]" />
        {/* forma orgânica achatada, base-esquerda */}
        <div className="absolute left-[24%] -bottom-32 h-[380px] w-[560px] rounded-[46%] bg-white/[0.025] blur-[100px]" />
        {/* sombra sutil pra dar volume à direita do bloco de texto */}
        <div className="absolute left-[42%] top-[10%] h-[420px] w-[420px] rounded-full bg-black/40 blur-[110px]" />
      </div>

      {/* grade e luz de topo bem sutis */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[520px] hero-glow" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:gap-20 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="animate-fade-up">
          <h1 className="font-display text-[46px] font-extrabold uppercase leading-[0.92] tracking-[-0.015em] text-gradient sm:text-[68px]">
            A gestão da sua
            <br />
            academia rodando
            <br />
            sozinha.
          </h1>

          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--text-secondary)]">
            Um bot de WhatsApp que atende seus alunos 24 horas, cobra as
            mensalidades no automático via Pix e organiza matrícula, frequência e
            financeiro num painel único. Você foca no treino — o resto acontece
            sozinho.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="wpp" size="lg" href={whatsappLink()} external>
              Testar no WhatsApp
              <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" size="lg" href="#como-funciona">
              Ver como funciona
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--wpp)]" />
              Sem taxa de adesão
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
              Configuração em minutos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
              Cancele quando quiser
            </span>
          </div>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}

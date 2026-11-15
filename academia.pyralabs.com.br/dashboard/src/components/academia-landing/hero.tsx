import { ArrowRight } from "lucide-react";
import { Button } from "./button";
import { HeroVisual } from "./hero-visual";
import { whatsappLink } from "@/components/academia-landing/site";

export function Hero() {
  return (
    <section className="relative flex items-center overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24 lg:min-h-[100svh]">
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
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0b0d]/50 via-transparent via-60% to-[#0b0b0d]" />
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

      {/* fade na base: funde todo o fundo do hero (foto, grade, formas) no fundo da página */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-64 bg-gradient-to-b from-transparent to-[var(--bg)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 px-5 sm:px-8 lg:gap-20 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="animate-fade-up">
          <h1 className="font-display -mt-[0.18em] pt-[0.18em] text-[44px] font-extrabold uppercase leading-[0.92] tracking-[-0.015em] text-gradient sm:text-[68px]">
            A GESTÃO DA SUA
            <br />
            ACADEMIA RODANDO
            <br />
            SOZINHA.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:mt-6 sm:text-[17px]">
            Um bot de WhatsApp que atende seus alunos 24 horas, cobra as
            mensalidades no automático via Pix e organiza matrícula, frequência e
            financeiro num painel único.
            <span className="hidden sm:inline"> Você foca no treino — o resto acontece sozinho.</span>
          </p>

          <div className="mt-7 grid grid-cols-[1.15fr_1fr] gap-2.5 sm:mt-8 sm:flex sm:gap-3">
            <Button variant="wpp" size="lg" href={whatsappLink()} external>
              <span className="sm:hidden">Testar grátis</span>
              <span className="hidden sm:inline">Testar no WhatsApp</span>
              <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" size="lg" href="#como-funciona">
              <span className="sm:hidden">Como funciona</span>
              <span className="hidden sm:inline">Ver como funciona</span>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 whitespace-nowrap text-[12px] text-[var(--text-tertiary)] sm:mt-8 sm:gap-x-6 sm:text-[13px]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--wpp)]" />
              14 dias de teste
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
              Eu configuro com você
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
              Sem fidelidade
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

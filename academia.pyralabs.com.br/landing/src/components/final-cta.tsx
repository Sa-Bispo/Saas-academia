import { ArrowRight } from "lucide-react";
import { Button } from "./button";
import { whatsappLink } from "@/lib/site";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[420px] hero-glow rotate-180" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60" />

      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight text-gradient sm:text-[56px]">
          Sua academia no automático hoje
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[17px] text-[var(--text-secondary)]">
          Fale com a gente no WhatsApp e veja o assistente funcionando com os
          dados da sua academia. Sem compromisso.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="wpp" size="lg" href={whatsappLink()} external>
            Falar no WhatsApp
            <ArrowRight size={16} />
          </Button>
          <Button variant="secondary" size="lg" href="#recursos">
            Rever os recursos
          </Button>
        </div>
      </div>
    </section>
  );
}

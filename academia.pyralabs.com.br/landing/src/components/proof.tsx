import { Star } from "lucide-react";

export function Proof() {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="card relative overflow-hidden p-8 sm:p-12">
            <div className="flex gap-1 text-[var(--accent-strong)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
            ))}
          </div>

          <blockquote className="mt-6 text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
            “Antes eu perdia metade do sábado cobrando aluno no WhatsApp. Hoje o
            sistema faz isso sozinho e a inadimplência caiu de verdade. Virou
            parte da recepção.”
          </blockquote>

          <div className="mt-7 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">
              R
            </div>
            <div>
              <p className="text-sm font-semibold">Rafael Mendes</p>
              <p className="text-sm text-[var(--text-tertiary)]">
                Dono · Studio RM Fitness
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

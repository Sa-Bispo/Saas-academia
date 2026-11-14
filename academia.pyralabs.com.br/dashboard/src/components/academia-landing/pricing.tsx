import { Check } from "lucide-react";
import { Button } from "./button";
import { whatsappLink } from "@/components/academia-landing/site";

// Estratégia (playbook): dor em R$ → âncora → preço na conversa.
// Sem preço público enquanto não fecha as 10 primeiras. Oferta de fundador = prazo, não desconto.
const inclui = [
  "Cadastro e controle de alunos",
  "PAR-Q digital com foto e assinatura",
  "Cobrança de mensalidade pelo WhatsApp com Pix",
  "Bot de WhatsApp respondendo seus alunos",
  "Painel com quem pagou e quem está devendo",
];

const fundador = [
  "Implantação feita por mim, junto com você, sem custo",
  "14 dias usando com os seus alunos antes de pagar",
  "Sem fidelidade: se não fizer sentido, você para",
];

export function Pricing() {
  return (
    <section id="planos" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Quanto custa
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            Menos que 3 mensalidades de aluno
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Se o sistema segurar 3 alunos que iam atrasar ou sumir, ele já se
            pagou. O valor depende do tamanho da academia, e eu te passo o
            número certinho em 15 minutos de conversa.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="card flex flex-col p-7 sm:p-8">
            <h3 className="text-lg font-semibold">O que entra</h3>
            <ul className="mt-6 flex-1 space-y-3">
              {inclui.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" />
                  <span className="text-[var(--text-secondary)]">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex flex-col rounded-2xl border border-[var(--accent)]/30 bg-[var(--bg-card)] p-7 sm:p-8">
            <span className="absolute -top-3 left-7 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[#08090d]">
              10 primeiras academias
            </span>
            <h3 className="text-lg font-semibold">Condição de fundador</h3>
            <ul className="mt-6 flex-1 space-y-3">
              {fundador.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" />
                  <span className="text-[var(--text-secondary)]">{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button variant="wpp" size="md" href={whatsappLink()} external className="w-full">
                Quero testar na minha academia
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

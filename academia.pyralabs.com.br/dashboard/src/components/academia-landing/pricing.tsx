import { Check } from "lucide-react";
import { Button } from "./button";
import { whatsappLink } from "@/components/academia-landing/site";

// Preço ainda não é público: é passado na conversa, conforme o tamanho da academia.
const inclui = [
  "Cadastro e controle de alunos",
  "PAR-Q digital com foto e assinatura",
  "Cobrança de mensalidade pelo WhatsApp com Pix",
  "Bot de WhatsApp respondendo seus alunos",
  "Painel financeiro com quem pagou e quem está devendo",
  "Configuração feita por mim, junto com você",
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
            Preço do tamanho da sua academia
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Depende de quantos alunos você tem e do que quer ligar. Em 15
            minutos de conversa eu te passo o valor certinho.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-xl">
          <div className="flex flex-col rounded-2xl border border-[var(--accent)]/30 bg-[var(--bg-card)] p-7 sm:p-9">
            <h3 className="text-lg font-semibold">O que entra</h3>
            <ul className="mt-6 space-y-3">
              {inclui.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" />
                  <span className="text-[var(--text-secondary)]">{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button variant="wpp" size="md" href={whatsappLink()} external className="w-full">
                Pedir o valor no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

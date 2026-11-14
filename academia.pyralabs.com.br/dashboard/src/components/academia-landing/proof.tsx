import { Check } from "lucide-react";

// Só fatos verificáveis. Trocar por depoimento real (com autorização) quando houver.
const emUso = [
  "Cadastro e controle de alunos no lugar do caderno",
  "PAR-Q digital com foto e assinatura no celular",
  "Vencimentos com aviso de quem está atrasado",
];

export function Proof() {
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="card relative overflow-hidden p-8 sm:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Em uso de verdade
          </p>

          <h2 className="mt-4 text-xl font-medium leading-relaxed tracking-tight sm:text-2xl">
            Feito junto com uma academia de bairro aqui da região, que usa o
            sistema no dia a dia da recepção.
          </h2>

          <ul className="mt-7 space-y-3">
            {emUso.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[15px]">
                <Check size={16} className="mt-1 shrink-0 text-[var(--accent-strong)]" />
                <span className="text-[var(--text-secondary)]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

import { Check } from "lucide-react";
import { Button } from "./button";
import { whatsappLink } from "@/lib/site";

const plans = [
  {
    name: "Essencial",
    price: "R$ 97",
    period: "/mês",
    desc: "Para academias que estão começando a organizar a gestão.",
    features: [
      "Bot de WhatsApp 24h",
      "Painel de alunos e frequência",
      "PAR-Q digital",
      "Até 150 alunos ativos",
    ],
    cta: "Começar",
    highlight: false,
  },
  {
    name: "Automático",
    price: "R$ 197",
    period: "/mês",
    desc: "A gestão inteira no piloto automático. O mais escolhido.",
    features: [
      "Tudo do Essencial",
      "Cobrança automática via Pix",
      "Pagamento em dinheiro por código",
      "Alunos ilimitados",
      "Relatórios e métricas",
    ],
    cta: "Falar com a gente",
    highlight: true,
  },
  {
    name: "Sob medida",
    price: "Vamos conversar",
    period: "",
    desc: "Redes e academias com mais de uma unidade.",
    features: [
      "Tudo do Automático",
      "Multiunidade",
      "Onboarding assistido",
      "Suporte prioritário",
    ],
    cta: "Fazer orçamento",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="planos" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Planos
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            Preço que cabe na academia
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Sem taxa de adesão. Cancele quando quiser.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl p-7 ${
                p.highlight
                  ? "border border-[var(--accent)]/30 bg-[var(--bg-card)]"
                  : "card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[#08090d]">
                  Mais escolhido
                </span>
              )}

              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-[28px] font-bold tracking-tight">{p.price}</span>
                <span className="text-sm text-[var(--text-tertiary)]">{p.period}</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{p.desc}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-[var(--accent-strong)]"
                    />
                    <span className="text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Button
                  variant={p.highlight ? "wpp" : "secondary"}
                  size="md"
                  href={whatsappLink()}
                  external
                  className="w-full"
                >
                  {p.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

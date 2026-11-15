import { Check } from "lucide-react";
import { Button } from "./button";
import { whatsappLink } from "@/components/academia-landing/site";

// 3 planos por recurso (2026-11-14). O do meio (Cobrança) é o que se quer vender;
// o Gestão é a porta de entrada sem WhatsApp conectado (é o que a Elite usa).
// Oferta de fundador = prazo, não desconto. Valores: 30-Negocios/Precos e Ofertas.
type Plano = {
  nome: string;
  preco: string;
  pra: string;
  itens: string[];
  destaque?: boolean;
};

const planos: Plano[] = [
  {
    nome: "Gestão",
    preco: "89,90",
    pra: "Pra largar o caderno e saber quem está devendo.",
    itens: [
      "Cadastro de alunos, planos e matrículas",
      "Painel de quem pagou e quem está devendo",
      "PAR-Q digital com foto e assinatura",
      "Cobrança assistida: a mensagem sai pronta e você envia do seu WhatsApp",
    ],
  },
  {
    nome: "Cobrança",
    preco: "159,90",
    pra: "Pra parar de correr atrás de aluno atrasado.",
    destaque: true,
    itens: [
      "Tudo do Gestão",
      "Lembrete automático antes de vencer e aviso de atraso no WhatsApp",
      "Chave Pix na conversa e baixa em 1 clique, com confirmação pro aluno",
      "Pagamento em dinheiro com código na recepção",
    ],
  },
  {
    nome: "Completo",
    preco: "249,90",
    pra: "Pra deixar o WhatsApp da academia no automático.",
    itens: [
      "Tudo do Cobrança",
      "Bot respondendo dúvidas 24h: planos, horários e vencimento",
      "Métricas de receita, inadimplência e frequência",
    ],
  },
];

const fundador = [
  "Implantação feita por mim, junto com você, sem custo",
  "14 dias usando com os seus alunos antes de pagar",
  "Sem fidelidade: se não fizer sentido, você para",
];

export function Pricing() {
  return (
    <section id="planos" className="scroll-mt-24 py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Quanto custa
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            Se paga com 2 alunos que não atrasam
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Preço fechado por mês, sem taxa por aluno. Comece pelo plano que faz
            sentido hoje e mude quando quiser.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-6xl gap-4 lg:grid-cols-3">
          {planos.map((p) => (
            <div
              key={p.nome}
              className={
                p.destaque
                  ? "relative flex flex-col rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-card)] p-7 sm:p-8"
                  : "card flex flex-col p-7 sm:p-8"
              }
            >
              {p.destaque && (
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[#08090d]">
                  Recomendado
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.nome}</h3>
              <p className="mt-1 text-sm text-[var(--text-tertiary)]">{p.pra}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-sm text-[var(--text-secondary)]">R$</span>
                <span className="font-display text-4xl font-bold tracking-tight">{p.preco}</span>
                <span className="text-sm text-[var(--text-secondary)]">/mês</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.itens.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" />
                    <span className="text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button
                  variant={p.destaque ? "wpp" : "secondary"}
                  size="md"
                  href={whatsappLink()}
                  external
                  className="w-full"
                >
                  Quero o {p.nome}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-6 max-w-6xl rounded-2xl border border-[var(--border)] bg-white/[0.02] p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                Condição de fundador · 10 primeiras academias
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Vale pra qualquer plano.
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-3 lg:max-w-3xl">
              {fundador.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" />
                  <span className="text-[var(--text-secondary)]">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

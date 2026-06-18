import Link from "next/link";
import { CalendarClock, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";

type ActivePlanViewProps = {
  businessName: string;
  planName: string;
  monthlyPriceLabel: string;
  renewDateLabel: string;
  statusLabel: string;
  plansPath: string;
};

function InfoCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <article className="rounded-2xl border border-line bg-[linear-gradient(155deg,rgba(255,255,255,0.04),rgba(9,17,26,0.92))] p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand ring-1 ring-brand/25">
        <Icon size={16} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-white">{value}</p>
    </article>
  );
}

export function ActivePlanView({
  businessName,
  planName,
  monthlyPriceLabel,
  renewDateLabel,
  statusLabel,
  plansPath,
}: ActivePlanViewProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-3xl border border-brand/40 bg-[linear-gradient(145deg,rgba(0,168,132,0.20),rgba(8,18,29,0.96))] p-6 shadow-2xl shadow-brand/10 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/90">Plano e Uso</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Assinatura vigente da conta
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
          {businessName}, aqui estao as informacoes atuais da sua assinatura para facilitar o controle de
          cobranca e renovacao.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard title="Plano atual" value={planName} icon={ReceiptText} />
        <InfoCard title="Preco mensal" value={monthlyPriceLabel} icon={CreditCard} />
        <InfoCard title="Vence em" value={renewDateLabel} icon={CalendarClock} />
        <InfoCard title="Status" value={statusLabel} icon={ShieldCheck} />
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface/70 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Gerenciar assinatura</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Precisa trocar de plano? Veja todas as opcoes e recursos disponiveis para o seu nicho.
        </p>

        <div className="mt-5">
          <Link
            href={plansPath}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Ver opcoes de planos
          </Link>
        </div>
      </section>
    </main>
  );
}

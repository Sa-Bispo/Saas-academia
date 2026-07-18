import {
  MessageSquareText,
  Wallet,
  LayoutDashboard,
  ClipboardCheck,
  QrCode,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: MessageSquareText,
    title: "Atendimento 24h no WhatsApp",
    desc: "O bot responde dúvidas sobre planos, horários e vencimentos a qualquer hora — com a linguagem da sua academia. Aluno atendido na hora, sem você no celular.",
  },
  {
    icon: Wallet,
    title: "Cobrança automática via Pix",
    desc: "Mensagens de cobrança disparadas sozinhas para quem está perto de vencer ou já atrasou. Pix gerado na conversa e baixa do pagamento no automático.",
  },
  {
    icon: LayoutDashboard,
    title: "Painel único de gestão",
    desc: "Matrícula, frequência e financeiro no mesmo lugar. Veja quem está ativo, quem faltou e quanto entrou no mês sem abrir cinco planilhas.",
  },
  {
    icon: ClipboardCheck,
    title: "PAR-Q digital assinado",
    desc: "Ficha de avaliação de saúde preenchida e assinada pelo aluno direto no celular. Busca, filtros e arquivamento — tudo organizado e sem papel.",
  },
  {
    icon: QrCode,
    title: "Pagamento em dinheiro por código",
    desc: "Aluno pede um código pelo WhatsApp e paga na recepção. O funcionário confirma, a matrícula renova e o recibo vai automático pro aluno.",
  },
  {
    icon: BarChart3,
    title: "Métricas que importam",
    desc: "Receita do mês, inadimplência, frequência semanal e alunos em risco de sair — em gráficos claros para decidir rápido.",
  },
];

export function Features() {
  return (
    <section id="recursos" className="relative py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Recursos
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            Tudo que a sua academia precisa,{" "}
            <span className="text-[var(--text-secondary)]">no automático</span>
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Menos tempo na parte chata da gestão. Mais tempo com seus alunos.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card group p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.03] text-[var(--accent-strong)] transition-colors group-hover:border-[var(--border-strong)]">
                <f.icon size={18} strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

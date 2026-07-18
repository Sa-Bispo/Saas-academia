const steps = [
  {
    n: "01",
    title: "Conecte seu WhatsApp",
    desc: "Você lê um QR Code no painel e o número da academia vira um assistente. Sem instalar nada, sem chip novo.",
  },
  {
    n: "02",
    title: "Cadastre alunos e planos",
    desc: "Importe sua base ou cadastre em minutos. Defina planos, valores e formas de pagamento (Pix ou dinheiro).",
  },
  {
    n: "03",
    title: "Deixe rodar",
    desc: "O bot passa a atender, cobrar e registrar tudo. Você acompanha pelo painel e só entra quando quiser.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Como funciona
          </p>
          <h2 className="font-display mt-3 text-3xl font-bold uppercase tracking-tight sm:text-[40px]">
            No ar em três passos
          </h2>
          <p className="mt-4 text-[var(--text-secondary)]">
            Do cadastro ao piloto automático, sem complicação técnica.
          </p>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="card h-full p-7">
                <span className="font-mono text-sm text-[var(--accent-strong)]">{s.n}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {s.desc}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute right-[-10px] top-1/2 hidden h-px w-5 -translate-y-1/2 bg-[var(--border-strong)] md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

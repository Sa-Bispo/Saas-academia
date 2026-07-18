const stats = [
  { value: "24h", label: "atendimento sem parar" },
  { value: "-70%", label: "menos tempo na cobrança" },
  { value: "1", label: "painel para tudo" },
  { value: "0", label: "planilha para manter" },
];

export function Stats() {
  return (
    <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="py-10 text-center">
            <p className="font-mono text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              {s.value}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

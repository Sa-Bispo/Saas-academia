type DashboardCardProps = {
  title: string;
  description: string;
};

export function DashboardCard({ title, description }: DashboardCardProps) {
  return (
    <article className="rounded-3xl border border-line bg-white/4 p-5 backdrop-blur">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-3 leading-7 text-muted">{description}</p>
    </article>
  );
}
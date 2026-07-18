import {
  LayoutGrid,
  Users,
  Activity,
  Receipt,
  Package,
  UserCog,
  ClipboardList,
  Settings,
  MessageCircle,
  Zap,
  TrendingUp,
  ChevronRight,
} from "lucide-react";

// Tela "Visão geral" do dashboard PyraLabs, recriada com dados realistas.
// Desenhada num tamanho fixo (1000x625) e escalada dentro da tela do laptop.

const NAV = [
  { icon: LayoutGrid, label: "Visão geral", active: true },
  { icon: Users, label: "Alunos" },
  { icon: Activity, label: "Frequência" },
  { icon: Receipt, label: "Cobranças" },
  { icon: Package, label: "Planos" },
  { icon: UserCog, label: "Funcionários" },
  { icon: ClipboardList, label: "PAR-Q" },
];

const IND = "#818cf8"; // indigo do produto

function Metric({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <p className="text-[12px] text-[#8b8f9e]">{label}</p>
      <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-2 text-[11px]" style={{ color: subColor ?? "#6b7280" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function AreaChart() {
  // 6 meses subindo em direção à meta
  const pts = [18, 34, 30, 52, 68, 82]; // %
  const w = 430;
  const h = 150;
  const step = w / (pts.length - 1);
  const y = (v: number) => h - (v / 100) * h;
  const line = pts.map((v, i) => `${i * step},${y(v)}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={IND} stopOpacity="0.35" />
          <stop offset="100%" stopColor={IND} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* meta tracejada */}
      <line x1="0" y1={y(90)} x2={w} y2={y(90)} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="5 5" />
      <polygon points={area} fill="url(#rev)" />
      <polyline points={line} fill="none" stroke={IND} strokeWidth="2.5" />
      {pts.map((v, i) => (
        <circle key={i} cx={i * step} cy={y(v)} r="3" fill={IND} />
      ))}
    </svg>
  );
}

function Donut() {
  const segs = [
    { v: 62, c: IND },
    { v: 28, c: "#a5b4fc" },
    { v: 10, c: "#c7d2fe" },
  ];
  const r = 52;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="relative flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-[130px] w-[130px] -rotate-90">
        {segs.map((s, i) => {
          const len = (s.v / 100) * c;
          const el = (
            <circle
              key={i}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={s.c}
              strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-off}
            />
          );
          off += len;
          return el;
        })}
      </svg>
      <div className="absolute left-[34px] top-1/2 -translate-y-1/2 text-center">
        <p className="text-[24px] font-semibold leading-none text-white">156</p>
        <p className="text-[9px] uppercase tracking-wide text-[#8b8f9e]">alunos</p>
      </div>
      <div className="space-y-2 text-[11px]">
        {[
          ["Mensal", "62%", IND],
          ["Trimestral", "28%", "#a5b4fc"],
          ["Anual", "10%", "#c7d2fe"],
        ].map(([n, p, col]) => (
          <div key={n as string} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: col as string }} />
            <span className="text-[#c9cdd6]">{n}</span>
            <span className="ml-2 text-[#8b8f9e]">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardMock() {
  return (
    <div className="flex h-[625px] w-[1000px] overflow-hidden bg-[#090a0f] font-sans text-white">
      {/* sidebar */}
      <aside className="flex w-[190px] flex-col border-r border-white/[0.06] bg-[#0b0c12] px-3 py-3.5">
        <div className="flex items-center gap-2 px-2 pb-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#151622] text-[#a5b4fc]">
            <Zap size={15} fill="#a5b4fc" />
          </span>
          <div className="leading-tight">
            <p className="text-[12px] font-semibold">Academia PyraLabs</p>
            <p className="text-[10px] text-[#6b7280]">Academia Pro</p>
          </div>
        </div>

        <p className="px-2 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-wider text-[#5b6070]">
          Principal
        </p>
        {NAV.map((n) => (
          <div
            key={n.label}
            className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] ${
              n.active
                ? "bg-[#818cf8]/12 font-medium text-[#a5b4fc]"
                : "text-[#9ca0ad]"
            }`}
          >
            <n.icon size={15} strokeWidth={1.9} />
            {n.label}
            {n.active && <ChevronRight size={13} className="ml-auto" />}
          </div>
        ))}

        <p className="px-2 pb-1.5 pt-4 text-[9px] font-semibold uppercase tracking-wider text-[#5b6070]">
          Configurações
        </p>
        <div className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-[#9ca0ad]">
          <Settings size={15} strokeWidth={1.9} /> Configurações
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-[#9ca0ad]">
          <MessageCircle size={15} strokeWidth={1.9} /> WhatsApp
        </div>
      </aside>

      {/* conteúdo */}
      <main className="flex-1 overflow-hidden px-6 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-[#6b7280]">Academia</p>
            <h1 className="text-[24px] font-semibold tracking-tight">Visão geral</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5 text-[11px]">
              {["Mensal", "Trimestral", "Anual"].map((p, i) => (
                <span
                  key={p}
                  className={`rounded-md px-2.5 py-1 ${
                    i === 0 ? "bg-white/[0.08] text-white" : "text-[#8b8f9e]"
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-[11px] text-[#c9cdd6]">
              <Users size={12} /> Alunos
            </span>
          </div>
        </div>

        {/* métricas linha 1 */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Metric label="Alunos Ativos" value="156" sub="↑ +8 este mês" subColor="#4ade80" />
          <Metric label="Inadimplentes" value="4" sub="2,5% da base" />
          <Metric label="Receita do Mês" value="R$ 14.240" sub="↑ +18% vs mês passado" subColor="#4ade80" />
          <Metric label="Renovações em 7 dias" value="9" sub="a vencer" />
        </div>

        {/* métricas linha 2 */}
        <div className="mt-3 grid grid-cols-4 gap-3">
          <Metric label="Churn" value="3%" sub="Inadimplentes / base" />
          <Metric label="LTV médio" value="R$ 1.180" sub="Por aluno, histórico" />
          <Metric label="Frequência" value="3,2×/sem" sub="Média de treinos" />
          <div className="flex items-center gap-3 rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
            <div className="relative flex h-11 w-11 items-center justify-center">
              <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#ffffff14" strokeWidth="4" />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke={IND}
                  strokeWidth="4"
                  strokeDasharray={`${0.79 * 2 * Math.PI * 16} ${2 * Math.PI * 16}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-[10px] font-semibold">79%</span>
            </div>
            <div>
              <p className="text-[12px] text-[#8b8f9e]">Meta do mês</p>
              <p className="mt-0.5 text-[13px] font-semibold">R$ 14.240 / R$ 18.000</p>
            </div>
          </div>
        </div>

        {/* gráficos */}
        <div className="mt-3 grid grid-cols-[1.15fr_0.85fr] gap-3">
          <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold">Receita mensal</p>
                <p className="text-[10px] text-[#6b7280]">Últimos 6 meses vs meta</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-[#8b8f9e]">
                <TrendingUp size={11} className="text-[#4ade80]" /> Faturamento
              </span>
            </div>
            <div className="mt-3 h-[128px]">
              <AreaChart />
            </div>
            <div className="mt-1 flex justify-between text-[9px] text-[#6b7280]">
              {["Fev", "Mar", "Abr", "Mai", "Jun", "Jul"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[13px] font-semibold">Distribuição por plano</p>
            <p className="text-[10px] text-[#6b7280]">Alunos ativos por tipo</p>
            <div className="mt-4">
              <Donut />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

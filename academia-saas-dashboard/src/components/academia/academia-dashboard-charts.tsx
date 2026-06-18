"use client";

const GREEN = "#1D9E75";
const GREEN_LIGHT = "rgba(29,158,117,0.15)";

export type ReceitaMensalItem = { mes: string; receita: number; meta: number };
export type DistribuicaoPlanoItem = { plano: string; alunos: number; cor: string };
export type FrequenciaSemanalItem = { dia: string; presencas: number };

function cardStyle() {
  return {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "16px",
    padding: "20px 24px",
    boxShadow: "var(--card-shadow)",
  } as const;
}

function formatCompactCurrency(value: number) {
  return `R$${(value / 1000).toFixed(0)}k`;
}

function buildLinePath(data: number[], width: number, height: number) {
  if (data.length === 0) return "";
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);

  return data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildAreaPath(data: number[], width: number, height: number) {
  if (data.length === 0) return "";
  const line = buildLinePath(data, width, height);
  return `${line} L ${width},${height} L 0,${height} Z`;
}

export function ReceitaMensalChart({ data }: { data: ReceitaMensalItem[] }) {
  const width = 520;
  const height = 180;
  const receitas = data.map((item) => item.receita);
  const metas = data.map((item) => item.meta);
  const max = Math.max(...receitas, ...metas, 1);
  const normalizar = (values: number[]) => values.map((value) => (value / max) * height);
  const receitaPath = buildLinePath(normalizar(receitas), width, height);
  const receitaArea = buildAreaPath(normalizar(receitas), width, height);
  const metaPath = buildLinePath(normalizar(metas), width, height);

  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
            Receita mensal
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: 2 }}>
            Últimos 6 meses vs meta
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: "11px", color: "var(--text-tertiary)", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 2, background: GREEN, display: "inline-block", borderRadius: 2 }} />
            Faturamento
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 12, height: 2, background: "rgba(255,255,255,0.25)", display: "inline-block", borderRadius: 2, borderTop: "2px dashed rgba(255,255,255,0.25)" }} />
            Valor Meta
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 12, alignItems: "stretch" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 11, color: "var(--text-tertiary)" }}>
          <span>{formatCompactCurrency(max)}</span>
          <span>{formatCompactCurrency(max / 2)}</span>
          <span>R$0</span>
        </div>
        <div>
          <svg viewBox={`0 0 ${width} ${height + 24}`} style={{ width: "100%", height: 210, overflow: "visible" }}>
            <defs>
              <linearGradient id="receitaGradLocal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GREEN} stopOpacity={0.25} />
                <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((ratio) => {
              const y = height - ratio * height;
              return (
                <line
                  key={ratio}
                  x1="0"
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="var(--border-color)"
                  strokeDasharray="4 4"
                />
              );
            })}
            <path d={receitaArea} fill="url(#receitaGradLocal)" transform={`translate(0,0)`} />
            <path d={metaPath} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="6 5" />
            <path d={receitaPath} fill="none" stroke={GREEN} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((item, index) => {
              const x = (index / Math.max(data.length - 1, 1)) * width;
              const y = height - normalizar(receitas)[index];
              return <circle key={item.mes} cx={x} cy={y} r="4" fill={GREEN} />;
            })}
            {data.map((item, index) => {
              const x = (index / Math.max(data.length - 1, 1)) * width;
              return (
                <text key={item.mes} x={x} y={height + 18} textAnchor="middle" fontSize="11" fill="var(--text-tertiary)">
                  {item.mes}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export function DistribuicaoPlanoChart({ data }: { data: DistribuicaoPlanoItem[] }) {
  const total = data.reduce((s, d) => s + d.alunos, 0);
  return (
    <div style={cardStyle()}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
          Distribuição por plano
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: 2 }}>
          Alunos ativos por tipo de plano
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: data.length
                ? `conic-gradient(${data
                    .map((item, index) => {
                      const previous = data.slice(0, index).reduce((sum, current) => sum + current.alunos, 0);
                      const start = (previous / total) * 100;
                      const end = ((previous + item.alunos) / total) * 100;
                      return `${item.cor} ${start}% ${end}%`;
                    })
                    .join(", ")})`
                : "var(--border-color)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 28,
                borderRadius: "50%",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            />
          </div>
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center", pointerEvents: "none",
          }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>{total}</div>
            <div style={{ fontSize: "10px", color: "var(--text-tertiary)", marginTop: 2 }}>alunos</div>
          </div>
        </div>
        {/* Legenda */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((item) => {
            const pct = ((item.alunos / total) * 100).toFixed(0);
            return (
              <div key={item.plano}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "12px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: item.cor, display: "inline-block", flexShrink: 0 }} />
                    {item.plano}
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{item.alunos}</span>
                </div>
                <div style={{ height: 4, borderRadius: 99, background: "var(--border-color)" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: item.cor, width: `${pct}%`, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Frequência Semanal ───────────────────────────────────────────────────────
export function FrequenciaSemanalChart({ data }: { data: FrequenciaSemanalItem[] }) {
  const max = Math.max(...data.map((d) => d.presencas));
  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>Frequência semanal</div>
          <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: 2 }}>Presenças por dia da semana</div>
        </div>
        <div style={{
          background: GREEN_LIGHT, color: GREEN,
          fontSize: "11px", fontWeight: 600, borderRadius: 8,
          padding: "3px 10px",
        }}>
          Pico: {data.find((d) => d.presencas === max)?.dia} ({max})
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length || 1}, minmax(0, 1fr))`, gap: 14, alignItems: "end", minHeight: 160 }}>
        {data.map((item) => {
          const pct = max > 0 ? (item.presencas / max) * 100 : 0;
          return (
            <div key={item.dia} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.presencas}</div>
              <div style={{ width: "100%", height: 120, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(pct, 8)}%`,
                    borderRadius: "8px 8px 0 0",
                    background: item.presencas === max ? GREEN : "rgba(29,158,117,0.35)",
                    transition: "height 0.3s ease",
                  }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{item.dia}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

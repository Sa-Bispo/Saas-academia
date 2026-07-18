"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export type ReceitaMensalItem = { mes: string; receita: number; meta: number };
export type DistribuicaoPlanoItem = { plano: string; alunos: number; cor: string };
export type FrequenciaSemanalItem = { dia: string; presencas: number };

const ACCENT = "#818CF8";
const ACCENT_MUTED = "rgba(129,140,248,0.15)";

function cardStyle(): React.CSSProperties {
  return {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: "16px",
    padding: "20px 24px",
    boxShadow: "var(--card-shadow)",
  };
}

// ─── Receita Mensal ───────────────────────────────────────────────────────────

function TooltipReceita({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
      }}
    >
      <p
        style={{
          color: "var(--text-primary)",
          fontWeight: 700,
          marginBottom: 8,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: p.dataKey === "receita" ? ACCENT : "rgba(255,255,255,0.25)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span style={{ color: "var(--text-secondary)" }}>
            {p.dataKey === "receita" ? "Faturamento" : "Meta"}:
          </span>
          <span style={{ color: "var(--text-primary)", fontWeight: 700, marginLeft: "auto" }}>
            {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReceitaMensalChart({ data }: { data: ReceitaMensalItem[] }) {
  return (
    <div style={cardStyle()}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
          >
            Receita mensal
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            Últimos 6 meses vs meta
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-tertiary)",
            alignItems: "center",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 16,
                height: 3,
                background: ACCENT,
                display: "inline-block",
                borderRadius: 99,
              }}
            />
            Faturamento
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 0,
                borderTop: "2px dashed rgba(255,255,255,0.18)",
              }}
            />
            Meta
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-color)"
            vertical={false}
          />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<TooltipReceita />} cursor={{ stroke: ACCENT_MUTED, strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="meta"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            fill="none"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="receita"
            stroke={ACCENT}
            strokeWidth={2.5}
            fill="url(#gradReceita)"
            dot={{ fill: ACCENT, r: 3.5, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: ACCENT, stroke: ACCENT_MUTED, strokeWidth: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Distribuição por Plano ───────────────────────────────────────────────────

export function DistribuicaoPlanoChart({
  data,
}: {
  data: DistribuicaoPlanoItem[];
}) {
  const total = data.reduce((s, d) => s + d.alunos, 0);

  const conicSegments =
    total > 0
      ? data
          .map((item, i) => {
            const prev = data.slice(0, i).reduce((s, c) => s + c.alunos, 0);
            const start = (prev / total) * 100;
            const end = ((prev + item.alunos) / total) * 100;
            return `${item.cor} ${start}% ${end}%`;
          })
          .join(", ")
      : null;

  return (
    <div style={cardStyle()}>
      <div style={{ marginBottom: 20 }}>
        <div
          style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
        >
          Distribuição por plano
        </div>
        <div
          style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}
        >
          Alunos ativos por tipo de plano
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        {/* Donut SVG */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 156,
              height: 156,
              borderRadius: "50%",
              background: conicSegments
                ? `conic-gradient(${conicSegments})`
                : "var(--border-color)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 22,
                borderRadius: "50%",
                background: "var(--card-bg)",
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "var(--text-primary)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {total}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                marginTop: 3,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              alunos
            </div>
          </div>
        </div>

        {/* Legenda com progress bars */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {data.length === 0 && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              Nenhum plano ativo
            </p>
          )}
          {data.map((item) => {
            const pct = total > 0 ? Math.round((item.alunos / total) * 100) : 0;
            return (
              <div key={item.plano}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 5,
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: item.cor,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {item.plano}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      display: "flex",
                      gap: 5,
                    }}
                  >
                    {item.alunos}
                    <span
                      style={{
                        color: "var(--text-tertiary)",
                        fontWeight: 400,
                        fontSize: 11,
                      }}
                    >
                      ({pct}%)
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 4,
                    borderRadius: 99,
                    background: "var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      background: item.cor,
                      width: `${pct}%`,
                      transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
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

function TooltipFreq({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
      }}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}: </span>
      <span style={{ color: ACCENT, fontWeight: 700 }}>
        {payload[0].value}
      </span>
      <span style={{ color: "var(--text-tertiary)" }}> presenças</span>
    </div>
  );
}

export function FrequenciaSemanalChart({
  data,
}: {
  data: FrequenciaSemanalItem[];
}) {
  const max = Math.max(...data.map((d) => d.presencas), 1);
  const pico = data.find((d) => d.presencas === max);

  return (
    <div style={cardStyle()}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
          >
            Frequência semanal
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}
          >
            Presenças por dia — últimos 30 dias
          </div>
        </div>
        {pico && (
          <div
            style={{
              background: ACCENT_MUTED,
              color: ACCENT,
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 8,
              padding: "4px 10px",
              border: `1px solid rgba(129,140,248,0.25)`,
            }}
          >
            Pico: {pico.dia} ({max})
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={data}
          barSize={30}
          margin={{ top: 5, right: 4, bottom: 0, left: -24 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border-color)"
            vertical={false}
          />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            content={<TooltipFreq />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="presencas" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.presencas === max ? ACCENT : ACCENT_MUTED}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AnalyticsData = {
  faturamento: Array<{ dia: string; total: number }>;
  produtos: Array<{ nome: string; quantidade: number; faturamento: number }>;
  horarios: Array<{ hora: string; pedidos: number }>;
  comparativo: {
    semanaAtual: { faturamento: number; pedidos: number };
    semanaAnterior: { faturamento: number; pedidos: number };
    variacaoFaturamento: number;
    variacaoPedidos: number;
  };
};

const GREEN = "#1D9E75";
const GREEN_DIM = "rgba(29,158,117,0.15)";

export function AnalyticsDashboard({ analytics }: { analytics: AnalyticsData }) {
  const { faturamento, produtos, horarios, comparativo } = analytics;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <ComparativoCard
          titulo="Faturamento esta semana"
          valor={`R$${comparativo.semanaAtual.faturamento.toFixed(2).replace(".", ",")}`}
          variacao={comparativo.variacaoFaturamento}
          sub={`Semana anterior: R$${comparativo.semanaAnterior.faturamento.toFixed(2).replace(".", ",")}`}
        />
        <ComparativoCard
          titulo="Pedidos esta semana"
          valor={String(comparativo.semanaAtual.pedidos)}
          variacao={comparativo.variacaoPedidos}
          sub={`Semana anterior: ${comparativo.semanaAnterior.pedidos} pedidos`}
        />
      </div>

      <div
        style={{
          background: "var(--card-bg)",
          border: "0.5px solid var(--card-border)",
          borderRadius: "var(--border-radius-lg)",
          padding: "20px",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: "16px",
          }}
        >
          Faturamento - ultimos 7 dias
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={faturamento}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
              tickFormatter={(v: number) => `R$${v}`}
            />
            <Tooltip
              formatter={(v) => {
                const valor = Number(v ?? 0);
                return [`R$${valor.toFixed(2).replace(".", ",")}`, "Faturamento"];
              }}
              contentStyle={{
                background: "var(--card-bg)",
                border: "0.5px solid var(--card-border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Line type="monotone" dataKey="total" stroke={GREEN} strokeWidth={2} dot={{ fill: GREEN, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div
          style={{
            background: "var(--card-bg)",
            border: "0.5px solid var(--card-border)",
            borderRadius: "var(--border-radius-lg)",
            padding: "20px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: "16px",
            }}
          >
            Produtos mais vendidos
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={produtos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
                width={100}
              />
              <Tooltip
                formatter={(v) => [Number(v ?? 0), "Vendidos"]}
                contentStyle={{
                  background: "var(--card-bg)",
                  border: "0.5px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="quantidade" radius={[0, 4, 4, 0]}>
                {produtos.map((_, i) => (
                  <Cell key={String(i)} fill={i === 0 ? GREEN : GREEN_DIM} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            background: "var(--card-bg)",
            border: "0.5px solid var(--card-border)",
            borderRadius: "var(--border-radius-lg)",
            padding: "20px",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--text-primary)",
              marginBottom: "16px",
            }}
          >
            Horarios de pico
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={horarios}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="hora" tick={{ fontSize: 9, fill: "var(--text-tertiary)" }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} />
              <Tooltip
                formatter={(v) => [Number(v ?? 0), "Pedidos"]}
                contentStyle={{
                  background: "var(--card-bg)",
                  border: "0.5px solid var(--card-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="pedidos" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ComparativoCard({
  titulo,
  valor,
  variacao,
  sub,
}: {
  titulo: string;
  valor: string;
  variacao: number;
  sub: string;
}) {
  const positivo = variacao >= 0;
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid var(--card-border)",
        borderRadius: "var(--border-radius-lg)",
        padding: "16px",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "6px" }}>{titulo}</div>
      <div style={{ fontSize: "24px", fontWeight: 500, color: "var(--text-primary)" }}>{valor}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: positivo ? "#1D9E75" : "#ef4444",
          }}
        >
          {positivo ? "↑" : "↓"} {Math.abs(variacao)}%
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>{sub}</span>
      </div>
    </div>
  );
}

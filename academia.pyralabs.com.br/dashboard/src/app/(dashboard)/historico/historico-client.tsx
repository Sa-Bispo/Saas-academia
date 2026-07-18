"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Package, ShoppingBag, TrendingUp, Wallet } from "lucide-react";

import { AnalyticsDashboard, type AnalyticsData } from "@/components/analytics/analytics-dashboard";
import { FeatureGate } from "@/components/ui/feature-gate";
import type { PedidoHistoricoDTO, MetricasHistorico } from "@/actions/historico.actions";

type Periodo = "hoje" | "semana" | "mes";
type Tab = "pedidos" | "analytics";

const PERIODO_LABELS: Record<Periodo, string> = {
  hoje: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
};

function toCurrency(value: number | string) {
  const numeric = Number(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatHorario(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function formatData(isoDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(isoDate));
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(" ");
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function HistoricoClient({
  periodo,
  pedidos,
  metricas,
  analytics,
}: {
  periodo: Periodo;
  pedidos: PedidoHistoricoDTO[];
  metricas: MetricasHistorico;
  analytics: AnalyticsData;
}) {
  const [tabAtiva, setTabAtiva] = useState<Tab>("pedidos");

  return (
    <section className="space-y-8">
      <div
        className="flex flex-col gap-4 rounded-2xl border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between"
        style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}
      >
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted">Relatórios</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">Histórico de pedidos</h1>
          <p className="mt-1.5 text-sm text-muted">Todos os pedidos finalizados</p>
        </div>

        {tabAtiva === "pedidos" && (
          <div
            className="flex items-center gap-1.5 rounded-2xl border border-line p-1.5"
            style={{ background: "var(--card-bg)", boxShadow: "var(--card-shadow)" }}
          >
            {(["hoje", "semana", "mes"] as Periodo[]).map((p) => (
              <Link
                key={p}
                href={`/historico?periodo=${p}`}
                className={`rounded-xl px-4 py-2 text-xs font-medium transition ${
                  periodo === p ? "bg-brand/15 text-brand" : "text-muted hover:text-foreground"
                }`}
                style={periodo === p ? undefined : { background: "var(--bg-secondary)" }}
              >
                {PERIODO_LABELS[p]}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<ShoppingBag size={16} />}
          label="Pedidos"
          value={String(metricas.totalPedidos)}
          sub={PERIODO_LABELS[periodo]}
        />
        <MetricCard
          icon={<TrendingUp size={16} />}
          label="Faturamento"
          value={toCurrency(metricas.faturamento)}
          sub={PERIODO_LABELS[periodo]}
        />
        <MetricCard
          icon={<Wallet size={16} />}
          label="Ticket médio"
          value={metricas.totalPedidos > 0 ? toCurrency(metricas.ticketMedio) : "-"}
          sub="por pedido"
        />
        <MetricCard
          icon={<Package size={16} />}
          label="Produto top"
          value={metricas.produtoTop}
          sub="mais vendido"
          truncate
        />
      </div>

      <div className="border-b border-line">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="flex w-max min-w-full justify-center gap-2">
            <button
              type="button"
              onClick={() => setTabAtiva("pedidos")}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm transition ${
                tabAtiva === "pedidos"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Pedidos
            </button>
            <button
              type="button"
              onClick={() => setTabAtiva("analytics")}
              className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm transition ${
                tabAtiva === "analytics"
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      {tabAtiva === "pedidos" && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted">
            {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"} em{" "}
            {PERIODO_LABELS[periodo].toLowerCase()}
          </h2>

          {pedidos.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-line px-6 py-12 text-center"
              style={{ background: "var(--bg-secondary)" }}
            >
              <Clock size={28} className="mx-auto mb-3 text-muted/50" />
              <p className="text-sm text-muted">
                Nenhum pedido finalizado {PERIODO_LABELS[periodo].toLowerCase()}.
              </p>
              <p className="mt-1 text-xs text-muted/60">
                  Os pedidos aparecem aqui após serem finalizados no kanban.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {pedidos.map((pedido) => {
                const isCancelado = pedido.status === "CANCELADO";
                const itensResumo = pedido.items
                  .map((i) => `${i.quantidade}x ${i.nome_produto}`)
                  .join(", ");
                const enderecoResumo =
                  pedido.customer.endereco.length > 40
                    ? `${pedido.customer.endereco.slice(0, 40)}...`
                    : pedido.customer.endereco;

                return (
                  <li
                    key={pedido.id}
                    className={`flex items-start gap-4 rounded-2xl border px-4 py-4 transition ${
                      isCancelado ? "border-red-500/20 opacity-60" : "border-line"
                    }`}
                    style={{ background: "var(--card-bg)", boxShadow: "var(--card-shadow)" }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
                      {getInitials(pedido.customer.nome)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {pedido.customer.nome}
                        </span>
                        {isCancelado && (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                            Cancelado
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs text-muted/80">{itensResumo}</p>

                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <MapPin size={10} className="shrink-0" />
                        <span className="truncate">{enderecoResumo}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-foreground">{toCurrency(pedido.total)}</p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {formatData(pedido.data_criacao)} · {formatHorario(pedido.data_criacao)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted/70">{pedido.forma_pagamento}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tabAtiva === "analytics" && (
        <FeatureGate requer="pro">
          <AnalyticsDashboard analytics={analytics} />
        </FeatureGate>
      )}
    </section>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  truncate,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  truncate?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{
        background: "var(--card-bg)",
        border: "0.5px solid var(--card-border)",
        borderRadius: "var(--border-radius-lg, 16px)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div>
        <p
          className={`text-xl font-semibold text-foreground ${truncate ? "truncate" : ""}`}
          title={truncate ? value : undefined}
        >
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
      </div>
    </div>
  );
}
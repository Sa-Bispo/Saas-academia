"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Wallet,
  TrendingUp,
  CalendarClock,
  UserX,
  UserCheck,
  Dumbbell,
  AlertTriangle,
  Cake,
  Activity,
  Target,
  ArrowUpRight,
  Trophy,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { DashboardMetricCard } from "@/components/ui/dashboard-metric-card";

import {
  ReceitaMensalChart,
  DistribuicaoPlanoChart,
  FrequenciaSemanalChart,
} from "@/components/academia/academia-dashboard-charts";
import type { AcademiaDashboardData } from "@/actions/academia-dashboard.actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_COLORS = ["#1D9E75", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ATIVO: { bg: "rgba(29,158,117,0.15)", color: "#1D9E75", label: "Ativo" },
  INADIMPLENTE: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "Inadimplente" },
  INATIVO: { bg: "rgba(100,116,139,0.15)", color: "#94a3b8", label: "Inativo" },
  SUSPENSO: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", label: "Suspenso" },
};

const MESES_LONGOS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, subPositivo, gradient, href, icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subPositivo?: boolean | null;
  gradient: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 12px 36px rgba(0,0,0,0.35)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      style={{ borderRadius: 16 }}
    >
    <Link
      href={href}
      style={{
        display: "block",
        background: gradient,
        borderRadius: 16,
        padding: "20px 22px",
        textDecoration: "none",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", right: -20, top: -20,
        width: 100, height: 100, borderRadius: "50%",
        background: "rgba(255,255,255,0.07)",
      }} />
      <div style={{
        position: "absolute", right: 16, top: 16,
        padding: 8, borderRadius: 10,
        background: "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color="rgba(255,255,255,0.9)" />
      </div>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 500, letterSpacing: "0.04em", marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 6 }}>
        {value}
      </p>
      {sub && (
        <p style={{
          fontSize: 11,
          color: subPositivo === true
            ? "rgba(255,255,255,0.9)"
            : subPositivo === false
            ? "rgba(255,200,200,0.85)"
            : "rgba(255,255,255,0.6)",
          fontWeight: subPositivo !== null ? 600 : 400,
        }}>
          {subPositivo === true && "▲ "}{subPositivo === false && "▼ "}{sub}
        </p>
      )}
    </Link>
    </motion.div>
  );
}

// ─── Main UI component ────────────────────────────────────────────────────────

const PERIODOS = ["Mensal", "Trimestral", "Anual"] as const;
type Periodo = typeof PERIODOS[number];

export function AcademiaDashboardUI({ data }: { data: AcademiaDashboardData }) {
  const [periodo, setPeriodo] = useState<Periodo>("Mensal");

  const mesAtual = MESES_LONGOS[new Date().getMonth()];

  const {
    totalAtivos,
    totalInadimplentes,
    novosEsseMes,
    receitaMesCents,
    receitaVariacaoPct,
    renovacoesProximas,
    renovacoesValorCents,
    cobrancasPendentes,
    taxaChurnPct,
    ltvMedioCents,
    frequenciaMediaSemanal,
    receitaMensal,
    distribuicaoPlanos,
    frequenciaSemanal,
    alunosEmRisco,
    aniversariantes,
    cobrancasVencendo,
    ultimosAlunos,
    rankingAlunos,
  } = data;

  // Inadimplência como % da base total
  const baseTotal = totalAtivos + totalInadimplentes;
  const pctInadimplente = baseTotal > 0
    ? ((totalInadimplentes / baseTotal) * 100).toFixed(1)
    : "0.0";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.2em", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
              Academia
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginTop: 2, lineHeight: 1.2 }}>
              Visão Geral de <span style={{ color: "#1D9E75" }}>Alunos</span>
            </h1>
          </div>
          {/* Filtro de período */}
          <div style={{
            display: "flex", gap: 4, background: "var(--bg-secondary)",
            borderRadius: 10, padding: "3px", border: "1px solid var(--border-color)",
          }}>
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                style={{
                  padding: "5px 14px", borderRadius: 8, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: periodo === p ? "#1D9E75" : "transparent",
                  color: periodo === p ? "#fff" : "var(--text-secondary)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <Link
          href="/alunos"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10,
            border: "1px solid var(--border-color)",
            background: "var(--card-bg)",
            fontSize: 13, fontWeight: 500,
            color: "var(--text-primary)", textDecoration: "none",
          }}
        >
          <Users size={14} />
          Gerenciar alunos
        </Link>
      </div>

      {/* ── KPI Cards principais (coloridos) ── */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <KpiCard
          label="Alunos Ativos"
          value={totalAtivos}
          sub={novosEsseMes > 0 ? `+${novosEsseMes} este mês` : undefined}
          subPositivo={novosEsseMes > 0 ? true : null}
          gradient="linear-gradient(135deg, #0e7f60 0%, #1D9E75 100%)"
          href="/alunos?status=ATIVO"
          icon={UserCheck}
        />
        <KpiCard
          label="Inadimplentes"
          value={totalInadimplentes}
          sub={`${pctInadimplente}% da base`}
          subPositivo={totalInadimplentes > 0 ? false : null}
          gradient="linear-gradient(135deg, #991b1b 0%, #ef4444 100%)"
          href="/alunos?status=INADIMPLENTE"
          icon={UserX}
        />
        <KpiCard
          label="Receita do Mês"
          value={formatCents(receitaMesCents)}
          sub={
            receitaVariacaoPct !== 0
              ? `${receitaVariacaoPct > 0 ? "+" : ""}${receitaVariacaoPct}% vs mês anterior`
              : "sem dados do mês anterior"
          }
          subPositivo={receitaVariacaoPct > 0 ? true : receitaVariacaoPct < 0 ? false : null}
          gradient="linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)"
          href="/cobrancas"
          icon={TrendingUp}
        />
        <KpiCard
          label="Renovações em 7 dias"
          value={renovacoesProximas}
          sub={`${formatCents(renovacoesValorCents)} em jogo`}
          subPositivo={null}
          gradient="linear-gradient(135deg, #92400e 0%, #f59e0b 100%)"
          href="/cobrancas"
          icon={CalendarClock}
        />
      </div>

      {/* ── KPIs extras (faixa fina) ── */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <DashboardMetricCard
          title="Taxa de churn"
          value={`${taxaChurnPct}%`}
          icon={Activity}
          trendChange="Inadimplentes / total"
          trendType="neutral"
        />
        <DashboardMetricCard
          title="LTV médio"
          value={formatCents(ltvMedioCents)}
          icon={Target}
          trendChange="Valor vitalício por aluno"
          trendType="neutral"
        />
        <DashboardMetricCard
          title="Frequência média"
          value={`${frequenciaMediaSemanal}x/sem`}
          icon={Dumbbell}
          trendChange="Média de treinos semanais"
          trendType="neutral"
        />
      </div>

      {/* ── Alerta cobranças pendentes ── */}
      {cobrancasPendentes.count > 0 && (
        <Link
          href="/cobrancas?status=PENDENTE"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderRadius: 14, border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.08)", padding: "14px 20px",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(245,158,11,0.2)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Wallet size={16} color="#f59e0b" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {cobrancasPendentes.count} cobranças pendentes
              </p>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Total: {formatCents(cobrancasPendentes.totalCents)} em aberto
              </p>
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            Ver cobranças <ArrowUpRight size={13} />
          </span>
        </Link>
      )}

      {/* ── Gráficos: receita mensal + donut planos ── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <ReceitaMensalChart data={receitaMensal} />
        <DistribuicaoPlanoChart data={distribuicaoPlanos} />
      </div>

      {/* ── Ranking alunos + Frequência semanal ── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* Ranking */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={15} color="#f59e0b" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Ranking de Alunos</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>Por LTV · Ticket médio · Meta</div>
              </div>
            </div>
            <Link href="/alunos" style={{ fontSize: 11, color: "#1D9E75", fontWeight: 600, textDecoration: "none" }}>
              Ver todos
            </Link>
          </div>
          {rankingAlunos.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "24px 0" }}>
              Nenhum aluno ativo ainda
            </p>
          ) : (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "28px 1fr 90px 64px 36px",
                gap: 8, padding: "0 4px 8px",
                borderBottom: "1px solid var(--border-color)",
                fontSize: 10, fontWeight: 600,
                color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                <span style={{ textAlign: "center" }}>#</span>
                <span>Aluno</span>
                <span style={{ textAlign: "right" }}>LTV</span>
                <span style={{ textAlign: "right" }}>Freq.</span>
                <span style={{ textAlign: "center" }}>Meta</span>
              </div>
              {rankingAlunos.map((aluno, idx) => (
                <div
                  key={aluno.id}
                  style={{
                    display: "grid", gridTemplateColumns: "28px 1fr 90px 64px 36px",
                    gap: 8, alignItems: "center",
                    padding: "10px 4px",
                    borderBottom: idx < rankingAlunos.length - 1 ? "1px solid var(--border-color)" : "none",
                  }}
                >
                  <div style={{
                    fontSize: idx < 3 ? 13 : 11, fontWeight: 700, textAlign: "center",
                    color: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7f32" : "var(--text-tertiary)",
                  }}>
                    {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: AVATAR_COLORS[idx % AVATAR_COLORS.length] + "30",
                      border: `1.5px solid ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}50`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                    }}>
                      {initials(aluno.nome)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {aluno.nome}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{aluno.plano}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>
                    {formatCents(aluno.ltv)}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}>
                    {aluno.frequencia}x/sem
                  </p>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {aluno.meta
                      ? <CheckCircle2 size={15} color="#1D9E75" />
                      : <XCircle size={15} color="#ef4444" />
                    }
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Frequência semanal */}
        <FrequenciaSemanalChart data={frequenciaSemanal} />
      </div>

      {/* ── Cobranças vencendo + Alunos em risco ── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* Cobranças vencendo */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CalendarClock size={13} color="#f59e0b" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Vencendo em 7 dias</p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{cobrancasVencendo.length} cobranças</p>
              </div>
            </div>
            <Link href="/cobrancas" style={{ fontSize: 11, color: "#1D9E75", fontWeight: 600, textDecoration: "none" }}>
              Ver todas
            </Link>
          </div>
          {cobrancasVencendo.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
              Nenhuma cobrança vencendo em 7 dias
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cobrancasVencendo.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.aluno}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{c.plano} · vence {c.vencimento}</p>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(245,158,11,0.15)", color: "#f59e0b",
                  }}>
                    {formatCents(c.valor)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Alunos em risco */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={13} color="#ef4444" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Alunos em risco de churn</p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Baixa frequência de treinos</p>
              </div>
            </div>
            <Link href="/alunos" style={{ fontSize: 11, color: "#1D9E75", fontWeight: 600, textDecoration: "none" }}>
              Ver todos
            </Link>
          </div>
          {alunosEmRisco.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
              Todos os alunos estão frequentando regularmente 💪
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alunosEmRisco.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.nome}
                    </p>
                    <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{a.plano} · {a.frequencia}x/sem · {a.diasSemVir}d sem treinar</p>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(239,68,68,0.12)", color: "#f87171",
                  }}>
                    Risco
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Aniversariantes + Últimos alunos ── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* Aniversariantes */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(236,72,153,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Cake size={13} color="#ec4899" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Aniversariantes de {mesAtual}
            </p>
          </div>
          {aniversariantes.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
              Sem aniversariantes este mês
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {aniversariantes.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: "rgba(236,72,153,0.12)",
                      border: "1.5px solid rgba(236,72,153,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#ec4899",
                    }}>
                      {a.dia}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.nome}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{a.plano}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 18 }}>🎂</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos cadastrados */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Últimos cadastrados</p>
            <Link href="/alunos" style={{ fontSize: 11, color: "#1D9E75", fontWeight: 600, textDecoration: "none" }}>
              Ver todos
            </Link>
          </div>
          {ultimosAlunos.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
              Nenhum aluno cadastrado ainda
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ultimosAlunos.map((aluno, idx) => {
                const s = STATUS_STYLES[aluno.status] ?? STATUS_STYLES.INATIVO;
                return (
                  <div
                    key={aluno.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 10,
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                        background: AVATAR_COLORS[idx % AVATAR_COLORS.length] + "25",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700,
                        color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
                      }}>
                        {initials(aluno.nome)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {aluno.nome}
                        </p>
                        <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                          <Dumbbell size={9} style={{ display: "inline", marginRight: 3 }} />
                          {aluno.plano} · vence {aluno.vencimento}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      {aluno.cobrancaPendente && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: "rgba(239,68,68,0.12)", color: "#f87171",
                        }}>
                          {formatCents(aluno.cobrancaPendente)}
                        </span>
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                        background: s.bg, color: s.color,
                      }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

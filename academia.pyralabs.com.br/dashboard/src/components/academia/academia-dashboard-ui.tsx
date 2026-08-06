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
  Cake,
  ArrowUpRight,
  ImageIcon,
} from "lucide-react";

import {
  ReceitaMensalChart,
  DistribuicaoPlanoChart,
} from "@/components/academia/academia-dashboard-charts";
import type { AcademiaDashboardData } from "@/actions/academia-dashboard.actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function initials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const AVATAR_COLORS = ["#818CF8", "#34d399", "#f59e0b", "#f87171", "#60a5fa"];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  ATIVO:        { bg: "rgba(52,211,153,0.12)",  color: "#34d399", label: "Ativo" },
  INADIMPLENTE: { bg: "rgba(248,113,113,0.12)", color: "#f87171", label: "Inadimplente" },
  INATIVO:      { bg: "rgba(100,116,139,0.12)", color: "#94a3b8", label: "Inativo" },
  SUSPENSO:     { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", label: "Suspenso" },
};

const MESES_LONGOS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// ─── KPI Card — minimal, sem bordas coloridas ────────────────────────────────

function KpiCard({
  label, value, sub, subPositivo, href, icon: Icon, danger,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subPositivo?: boolean | null;
  href: string;
  icon: React.ElementType;
  danger?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <Link
        href={href}
        style={{
          display: "block",
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: "12px",
          padding: "20px 22px",
          textDecoration: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Icon size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <p style={{
            fontSize: 12, fontWeight: 500,
            color: "var(--text-tertiary)",
          }}>
            {label}
          </p>
        </div>

        <p style={{
          fontSize: 30, fontWeight: 700, lineHeight: 1,
          letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums",
          color: danger ? "#f87171" : "var(--text-primary)",
        }}>
          {value}
        </p>

        {sub && (
          <p style={{
            fontSize: 12, marginTop: 8,
            color: subPositivo === true
              ? "#4ade80"
              : subPositivo === false
              ? "#f87171"
              : "var(--text-tertiary)",
            fontWeight: 400,
          }}>
            {subPositivo === true && "↑ "}
            {subPositivo === false && "↓ "}
            {sub}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

// ─── Main UI ──────────────────────────────────────────────────────────────────

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
    cobrancasPendentes,
    aguardandoValidacao,
    receitaMensal,
    distribuicaoPlanos,
    aniversariantes,
    cobrancasVencendo,
    ultimosAlunos,
  } = data;

  const baseTotal = totalAtivos + totalInadimplentes;
  const pctInadimplente = baseTotal > 0
    ? ((totalInadimplentes / baseTotal) * 100).toFixed(1)
    : "0.0";

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <p style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
          }}>
            Academia
          </p>
          <h1 style={{
            fontSize: 20, fontWeight: 600,
            color: "var(--text-primary)", marginTop: 2, lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}>
            Visão geral
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Filtro de período */}
          <div style={{
            display: "flex", gap: 3, background: "var(--bg-secondary)",
            borderRadius: 10, padding: "3px", border: "1px solid var(--border-color)",
          }}>
            {PERIODOS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                style={{
                  padding: "5px 14px", borderRadius: 7, border: "none",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s ease",
                  background: periodo === p ? "var(--bg-tertiary)" : "transparent",
                  color: periodo === p ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: "none",
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <Link
            href="/alunos"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              border: "1px solid var(--border-color)",
              background: "var(--card-bg)",
              fontSize: 13, fontWeight: 500,
              color: "var(--text-primary)", textDecoration: "none",
            }}
          >
            <Users size={14} />
            Alunos
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <KpiCard
          label="Alunos Ativos"
          value={totalAtivos}
          sub={novosEsseMes > 0 ? `+${novosEsseMes} este mês` : undefined}
          subPositivo={novosEsseMes > 0 ? true : null}
          href="/alunos?status=ATIVO"
          icon={UserCheck}
        />
        <KpiCard
          label="Inadimplentes"
          value={totalInadimplentes}
          sub={totalInadimplentes > 0 ? `${pctInadimplente}% da base` : undefined}
          subPositivo={totalInadimplentes > 0 ? false : null}
          href="/alunos?status=INADIMPLENTE"
          icon={UserX}
          danger={totalInadimplentes > 0}
        />
        <KpiCard
          label="Receita do Mês"
          value={formatCents(receitaMesCents)}
          sub={
            receitaVariacaoPct !== 0
              ? `${receitaVariacaoPct > 0 ? "+" : ""}${receitaVariacaoPct}% vs mês anterior`
              : undefined
          }
          subPositivo={receitaVariacaoPct > 0 ? true : receitaVariacaoPct < 0 ? false : null}
          href="/cobrancas"
          icon={TrendingUp}
        />
      </div>

      {/* ── Alertas ── */}
      {aguardandoValidacao > 0 && (
        <Link
          href="/cobrancas?status=AGUARDANDO_VALIDACAO"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderRadius: 14, border: "1px solid rgba(52,211,153,0.3)",
            background: "rgba(52,211,153,0.07)", padding: "14px 20px",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(52,211,153,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <ImageIcon size={16} color="#34d399" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {aguardandoValidacao} comprovante{aguardandoValidacao > 1 ? "s" : ""} aguardando validação
              </p>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                Alunos enviaram PIX — confirme ou rejeite para atualizar o status
              </p>
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            Validar agora <ArrowUpRight size={13} />
          </span>
        </Link>
      )}

      {cobrancasPendentes.count > 0 && (
        <Link
          href="/cobrancas?status=PENDENTE"
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderRadius: 14, border: "1px solid rgba(251,191,36,0.25)",
            background: "rgba(251,191,36,0.06)", padding: "14px 20px",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "rgba(251,191,36,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Wallet size={16} color="#fbbf24" />
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
          <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            Ver cobranças <ArrowUpRight size={13} />
          </span>
        </Link>
      )}

      {/* ── Gráficos: receita + distribuição ── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <ReceitaMensalChart data={receitaMensal} />
        <DistribuicaoPlanoChart data={distribuicaoPlanos} />
      </div>

      {/* ── Próximos vencimentos ── */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }}>
        {/* Cobranças vencendo */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarClock size={14} color="var(--text-tertiary)" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Próximos vencimentos</p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>vencidas ou a vencer em 7 dias</p>
              </div>
            </div>
            <Link href="/cobrancas" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
              Ver todas
            </Link>
          </div>
          {cobrancasVencendo.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "20px 0" }}>
              Nenhuma cobrança vencida ou a vencer em 7 dias
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
                    <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                      {c.plano} · vence {c.vencimento} ·{" "}
                      <span style={{ fontWeight: 700, color: c.dias < 0 ? "var(--danger-text)" : "var(--warning-text)" }}>
                        {c.dias < 0
                          ? `vencido há ${Math.abs(c.dias)} ${Math.abs(c.dias) === 1 ? "dia" : "dias"}`
                          : c.dias === 0
                            ? "vence hoje"
                            : c.dias === 1
                              ? "falta 1 dia"
                              : `faltam ${c.dias} dias`}
                      </span>
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 20,
                    background: "rgba(251,191,36,0.12)", color: "#fbbf24",
                  }}>
                    {formatCents(c.valor)}
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
            <Cake size={14} color="var(--text-tertiary)" />
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
                      background: "rgba(236,72,153,0.1)",
                      border: "1.5px solid rgba(236,72,153,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, color: "#ec4899",
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
            <Link href="/alunos" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>
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
                        background: AVATAR_COLORS[idx % AVATAR_COLORS.length] + "20",
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
                          background: "rgba(248,113,113,0.1)", color: "#f87171",
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

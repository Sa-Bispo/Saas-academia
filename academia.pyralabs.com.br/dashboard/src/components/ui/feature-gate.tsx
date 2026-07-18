"use client";

import Link from "next/link";

import { usePlano, type Plano } from "@/hooks/use-plano";

const PLANO_LABEL: Record<Plano, string> = {
  basico: "Básico",
  pro: "Pro",
  growth: "Growth",
};

const PLANO_PRECO: Record<Plano, string> = {
  basico: "R$49,90/mês",
  pro: "R$89,90/mês",
  growth: "R$139,90/mês",
};

interface FeatureGateProps {
  requer: Plano;
  children: React.ReactNode;
  modo?: "bloquear" | "esconder";
}

export function FeatureGate({ requer, children, modo = "bloquear" }: FeatureGateProps) {
  const { temAcesso } = usePlano();

  if (temAcesso(requer)) return <>{children}</>;
  if (modo === "esconder") return null;

  return <UpgradeCard planoNecessario={requer} />;
}

function UpgradeCard({ planoNecessario }: { planoNecessario: Plano }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        background: "var(--card-bg)",
        border: "0.5px solid var(--card-border)",
        borderRadius: "var(--border-radius-lg)",
        boxShadow: "var(--card-shadow)",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>

      <div>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          Disponível no plano {PLANO_LABEL[planoNecessario]}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          Faça upgrade para desbloquear esta funcionalidade
        </div>
      </div>

      <Link
        href="/planos/delivery"
        style={{
          padding: "8px 20px",
          borderRadius: "var(--border-radius-md)",
          background: "#1D9E75",
          color: "white",
          fontSize: "13px",
          fontWeight: 500,
          textDecoration: "none",
          marginTop: "4px",
        }}
      >
        Ver plano {PLANO_LABEL[planoNecessario]} - {PLANO_PRECO[planoNecessario]}
      </Link>
    </div>
  );
}

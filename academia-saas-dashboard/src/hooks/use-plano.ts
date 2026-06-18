"use client";

import { useContext } from "react";

import { PlanoContext } from "@/components/ui/plano-provider";
import { hasPlanoAccess, type Plano } from "@/lib/plano";

export type { Plano };

export function usePlano() {
  const plano = useContext(PlanoContext);

  return {
    plano,
    isBasico: plano === "basico",
    isPro: plano === "pro" || plano === "growth",
    isGrowth: plano === "growth",
    temAcesso: (requer: Plano) => hasPlanoAccess(plano, requer),
  };
}

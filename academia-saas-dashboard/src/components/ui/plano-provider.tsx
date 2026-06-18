"use client";

import { createContext } from "react";

import type { Plano } from "@/lib/plano";

export const PlanoContext = createContext<Plano>("basico");

export function PlanoProvider({
  plano,
  children,
}: {
  plano: Plano;
  children: React.ReactNode;
}) {
  return <PlanoContext.Provider value={plano}>{children}</PlanoContext.Provider>;
}

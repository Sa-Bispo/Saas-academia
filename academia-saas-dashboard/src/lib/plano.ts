export type Plano = "basico" | "pro" | "growth";

function normalize(value?: string | null): string {
  return (value || "").trim().toLowerCase();
}

// Accept both simple values (basico/pro/growth) and existing plan codes.
export function mapPlano(input?: string | null): Plano {
  const value = normalize(input);

  if (value === "growth" || value.includes("growth")) return "growth";
  if (value === "pro" || value.includes("_pro") || value.includes("-pro")) return "pro";
  if (value === "basico" || value.includes("basic") || value.includes("basico")) return "basico";

  return "basico";
}

export function hasPlanoAccess(current: Plano, required: Plano): boolean {
  if (required === "basico") return true;
  if (required === "pro") return current === "pro" || current === "growth";
  return current === "growth";
}

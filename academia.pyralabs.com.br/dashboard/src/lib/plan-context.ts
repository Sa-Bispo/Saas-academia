export const PENDING_PLAN_STORAGE_KEY = "zapiq.pending-plan-context";

export type OnboardingNiche = "DELIVERY" | "CLINICA" | "EMPRESA";

export type PendingPlanSelection = {
  planCode: string;
  niche: OnboardingNiche;
  savedAt: number;
};

const PLAN_PREFIX_TO_NICHE: Record<string, OnboardingNiche> = {
  delivery: "DELIVERY",
  clinica: "CLINICA",
  empresa: "EMPRESA",
};

const NICHE_TO_PLANOS_SLUG: Record<OnboardingNiche, string> = {
  DELIVERY: "delivery",
  CLINICA: "agendamentos",
  EMPRESA: "empresas",
};

const NICHE_TO_TEST_DRIVE: Record<OnboardingNiche, string> = {
  DELIVERY: "delivery",
  CLINICA: "clinica",
  EMPRESA: "empresa",
};

export function normalizeOnboardingNiche(value: string | null | undefined): OnboardingNiche | null {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();

  if (normalized === "DELIVERY") return "DELIVERY";
  if (normalized === "CLINICA" || normalized === "CLINICAS" || normalized === "AGENDAMENTOS") {
    return "CLINICA";
  }
  if (normalized === "EMPRESA" || normalized === "EMPRESAS") return "EMPRESA";

  return null;
}

export function getOnboardingNicheFromPlanCode(planCode: string | null | undefined): OnboardingNiche | null {
  if (!planCode) return null;

  const prefix = planCode.trim().toLowerCase().split("_")[0] ?? "";
  return PLAN_PREFIX_TO_NICHE[prefix] ?? null;
}

export function getPlanosSlugFromPlanCode(planCode: string | null | undefined): string | null {
  const niche = getOnboardingNicheFromPlanCode(planCode);
  return niche ? NICHE_TO_PLANOS_SLUG[niche] : null;
}

export function getTestDriveNicheFromPlanCode(planCode: string | null | undefined): string | null {
  const niche = getOnboardingNicheFromPlanCode(planCode);
  return niche ? NICHE_TO_TEST_DRIVE[niche] : null;
}

export function writePendingPlanSelection(selection: PendingPlanSelection) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(PENDING_PLAN_STORAGE_KEY, JSON.stringify(selection));
}

export function readPendingPlanSelection(): PendingPlanSelection | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(PENDING_PLAN_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPlanSelection>;
    const niche = normalizeOnboardingNiche(parsed.niche);

    if (!parsed.planCode || !niche || typeof parsed.savedAt !== "number") {
      return null;
    }

    return {
      planCode: parsed.planCode,
      niche,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingPlanSelection() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(PENDING_PLAN_STORAGE_KEY);
}
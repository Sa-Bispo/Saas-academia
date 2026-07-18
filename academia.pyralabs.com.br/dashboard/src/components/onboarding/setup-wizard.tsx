"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Sparkles,
  Table2,
  Store,
  Clock3,
  ChevronRight,
  Building2,
  UserRound,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadExampleProducts, saveDeliveryIdentity } from "@/actions/setup.actions";

type Weekday = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

type ShiftConfig = {
  enabled: boolean;
  openTime: string;
  closeTime: string;
  days: Weekday[];
};

type ScheduleState = Record<string, ShiftConfig>;

type ShiftItem = {
  id: string;
  emoji: string;
  label: string;
  defaultOpen: string;
  defaultClose: string;
  defaultDays?: Weekday[];
  defaultEnabled?: boolean;
};

type ChannelItem = {
  id: string;
  emoji: string;
  label: string;
  desc: string;
};

type DeliveryTone = "DESCONTRAIDO" | "VENDEDOR" | "FORMAL";

const TOTAL_STEPS = 4;

const WEEKDAYS: { id: Weekday; short: string; label: string }[] = [
  { id: "dom", short: "D", label: "Domingo" },
  { id: "seg", short: "S", label: "Segunda" },
  { id: "ter", short: "T", label: "Terca" },
  { id: "qua", short: "Q", label: "Quarta" },
  { id: "qui", short: "Q", label: "Quinta" },
  { id: "sex", short: "S", label: "Sexta" },
  { id: "sab", short: "S", label: "Sabado" },
];

const WEEKDAY_PRESETS: { id: string; label: string; days: Weekday[] }[] = [
  { id: "week", label: "Seg-Sex", days: ["seg", "ter", "qua", "qui", "sex"] },
  { id: "all", label: "Todos", days: WEEKDAYS.map((d) => d.id) },
  { id: "weekend", label: "Fim de semana", days: ["sab", "dom"] },
];

const ACADEMIA_PROFILE = {
  companyLabel: "Nome da sua academia",
  companyPlaceholder: "Academia Movimento",
  botPlaceholder: "Coach Ana",
  botPreviewFallback: "Coach Ana",
  recommendedTone: "FORMAL" as DeliveryTone,
  toneOptions: [
    { value: "FORMAL" as DeliveryTone, label: "Consultivo e profissional - recomendado" },
    { value: "VENDEDOR" as DeliveryTone, label: "Comercial e motivador" },
    { value: "DESCONTRAIDO" as DeliveryTone, label: "Leve e próximo" },
  ],
  step2Title: "Como seus alunos se inscrevem?",
  channels: [
    { id: "presencial", emoji: "office", label: "Presencial", desc: "Aluno comparece à academia" },
    { id: "online", emoji: "video_camera", label: "Online", desc: "Matrícula ou consultoria remota" },
  ] as ChannelItem[],
  step3Title: "Horário de funcionamento",
  step3Subtitle: "Ative os turnos e defina os horários de abertura e fechamento.",
  shifts: [
    {
      id: "principal",
      emoji: "sunny",
      label: "Atendimento principal",
      defaultOpen: "06:00",
      defaultClose: "22:00",
      defaultDays: ["seg", "ter", "qua", "qui", "sex"] as Weekday[],
      defaultEnabled: true,
    },
    {
      id: "opcional",
      emoji: "sun_behind_small_cloud",
      label: "Fim de semana",
      defaultOpen: "08:00",
      defaultClose: "14:00",
      defaultDays: ["sab"] as Weekday[],
    },
  ] as ShiftItem[],
  step4Title: "Monte sua base de serviços",
  step4Subtitle: "Escolha como quer cadastrar planos, aulas e avaliações.",
  step4Label: "Serviços",
};

const CATALOG_OPTIONS: {
  id: "ai" | "manual" | "sample" | "later";
  title: string;
  desc: string;
  badge?: string;
  icon: "sparkles" | "table" | "store" | "clock";
}[] = [
  {
    id: "ai",
    title: "Importar com IA",
    desc: "Envie sua tabela de planos, serviços e avaliações. A IA estrutura tudo para você.",
    badge: "Recomendado",
    icon: "sparkles",
  },
  {
    id: "manual",
    title: "Cadastrar manualmente",
    desc: "Cadastre planos, aulas e serviços de forma manual e organizada.",
    icon: "table",
  },
  {
    id: "sample",
    title: "Usar exemplo pré-configurado",
    desc: "Plano mensal/trimestral, avaliação física e aula experimental já configurados.",
    badge: "Mais rápido",
    icon: "store",
  },
  {
    id: "later",
    title: "Fazer depois",
    desc: "Pular por agora e configurar no dashboard quando quiser.",
    icon: "clock",
  },
];

function toEmoji(name: string) {
  const map: Record<string, string> = {
    sunny: "☀️",
    crescent_moon: "🌙",
    sun_behind_small_cloud: "🌤️",
    office: "🏢",
    video_camera: "📹",
  };
  return map[name] ?? "✨";
}

function buildDefaultSchedule(shifts: ShiftItem[]): ScheduleState {
  const base: ScheduleState = {};
  for (const shift of shifts) {
    base[shift.id] = {
      enabled: !!shift.defaultEnabled,
      openTime: shift.defaultOpen,
      closeTime: shift.defaultClose,
      days: shift.defaultDays ?? ["seg", "ter", "qua", "qui", "sex"],
    };
  }
  return base;
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-white/5">
      <div
        className="h-full bg-gradient-to-r from-brand to-accent transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" />
      Passo {step} de {TOTAL_STEPS}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-brand" : "bg-white/10"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-white/5 px-3 py-2.5 text-sm font-mono text-foreground outline-none transition-colors focus:border-brand/60 focus:bg-white/[0.07] [color-scheme:dark]"
      />
    </div>
  );
}

export function SetupWizard({
  dashboardRoute,
  tenantId,
  initialBusinessName,
  initialBotName,
  initialTone,
}: {
  dashboardRoute?: string;
  tenantId?: string;
  initialBusinessName?: string;
  initialBotName?: string;
  initialTone?: DeliveryTone;
}) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [schedule, setSchedule] = useState<ScheduleState>(() =>
    buildDefaultSchedule(ACADEMIA_PROFILE.shifts),
  );

  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [botName, setBotName] = useState(initialBotName ?? "");
  const [tone, setTone] = useState<DeliveryTone>(initialTone ?? ACADEMIA_PROFILE.recommendedTone);
  const [selectedSetupMethod, setSelectedSetupMethod] = useState<"ai" | "manual" | "sample" | "later">("ai");
  const [savingStep1, setSavingStep1] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!businessName) setBusinessName(ACADEMIA_PROFILE.companyPlaceholder);
    if (!botName) setBotName(ACADEMIA_PROFILE.botPreviewFallback);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateShift(id: string, patch: Partial<ShiftConfig>) {
    setSchedule((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function toggleChannel(id: string) {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function canContinue() {
    if (step === 1) {
      return businessName.trim().length >= 2 && botName.trim().length >= 2 && !!tone;
    }
    if (step === 2) return selectedChannels.size > 0;
    if (step === 3) {
      return Object.values(schedule).some((s) => s.enabled && s.days.length > 0);
    }
    return true;
  }

  async function handleContinue() {
    if (step === 1) {
      setSavingStep1(true);
      try {
        await saveDeliveryIdentity({ businessName, botName, toneOfVoice: tone });
      } catch (error) {
        console.error("[setup] Falha ao salvar identidade", error);
      } finally {
        setSavingStep1(false);
      }
    }
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }

  async function clearOnboardingFlag() {
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ data: { onboardingPending: false } });
    } catch (error) {
      console.error("[setup] Falha ao atualizar metadata de onboarding", error);
    }
  }

  async function handleFinish(method: "ai" | "manual" | "sample" | "later") {
    await clearOnboardingFlag();
    if (method === "sample" && tenantId) {
      await loadExampleProducts(tenantId, "academia");
    }
    router.push(dashboardRoute ?? "/dashboard/academia");
  }

  function handleAIUpload() {
    setUploading(true);
    setTimeout(() => {
      void handleFinish("ai");
    }, 600);
  }

  function toggleDay(shiftId: string, day: Weekday) {
    const current = schedule[shiftId].days;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    updateShift(shiftId, { days: next });
  }

  function applyPreset(shiftId: string, days: Weekday[]) {
    updateShift(shiftId, { days: [...days] });
  }

  const progressLabels = ["Identidade", "Inscrições", "Horários", ACADEMIA_PROFILE.step4Label];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20">
      <ProgressBar step={step} />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/8 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-accent/8 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="grid w-full grid-cols-4 gap-2 pr-6">
            {progressLabels.map((label, idx) => {
              const n = idx + 1;
              const active = n <= step;
              return (
                <div key={label} className="flex flex-col items-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      active ? "bg-brand" : "bg-white/20"
                    }`}
                  />
                  <span className="mt-2 text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void handleFinish("later")}
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            Pular configuração inicial
          </button>
        </div>

        <div className="rounded-3xl border border-line bg-white/[0.035] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={1} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Vamos apresentar sua academia
              </h2>
              <p className="mt-2 text-muted">Essas informações aparecem nas mensagens do bot para seus alunos.</p>

              <div className="mt-7 space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">{ACADEMIA_PROFILE.companyLabel}</span>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder={ACADEMIA_PROFILE.companyPlaceholder}
                      className="w-full rounded-xl border border-line bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                    />
                  </div>
                  <p className="text-xs text-muted">Aparece no início de cada conversa</p>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Nome do atendente virtual</span>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder={ACADEMIA_PROFILE.botPlaceholder}
                      className="w-full rounded-xl border border-line bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                    />
                  </div>
                  <p className="text-xs text-muted">Como o bot se apresenta para o aluno</p>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Tom de voz</span>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as DeliveryTone)}
                    className="w-full rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand/50"
                  >
                    {ACADEMIA_PROFILE.toneOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-foreground">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted">Defina como o bot deve se comunicar com os alunos.</p>
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-sm font-semibold text-slate-900">
                    {(botName.trim() || ACADEMIA_PROFILE.botPreviewFallback).charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {botName.trim() || ACADEMIA_PROFILE.botPreviewFallback} -{" "}
                      {businessName.trim() || ACADEMIA_PROFILE.companyPlaceholder}
                    </p>
                    <p className="text-xs text-muted">É assim que o bot vai se apresentar</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Enrollment channels */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={2} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {ACADEMIA_PROFILE.step2Title}
              </h2>

              <div className="mt-8 flex flex-col gap-4">
                {ACADEMIA_PROFILE.channels.map((channel) => {
                  const active = selectedChannels.has(channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={`flex items-center justify-between rounded-2xl border p-5 transition-all duration-200 ${
                        active ? "border-brand/40 bg-brand/[0.07]" : "border-line bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl">{toEmoji(channel.emoji)}</span>
                        <div>
                          <p className="font-semibold text-foreground">{channel.label}</p>
                          <p className="text-sm text-muted">{channel.desc}</p>
                        </div>
                      </div>
                      <Toggle checked={active} onChange={() => toggleChannel(channel.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Schedule */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={3} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {ACADEMIA_PROFILE.step3Title}
              </h2>
              <p className="mt-2 text-muted">{ACADEMIA_PROFILE.step3Subtitle}</p>

              <div className="mt-8 flex flex-col gap-4">
                {ACADEMIA_PROFILE.shifts.map((shift) => {
                  const cfg = schedule[shift.id];
                  return (
                    <div
                      key={shift.id}
                      className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                        cfg.enabled ? "border-brand/40 bg-brand/[0.07]" : "border-line bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl leading-none">{toEmoji(shift.emoji)}</span>
                          <div>
                            <p className={`font-semibold ${cfg.enabled ? "text-brand" : "text-foreground"}`}>
                              {shift.label}
                            </p>
                            <p className="text-sm text-muted">
                              {cfg.enabled
                                ? `${cfg.days.length} dia(s) • ${cfg.openTime} -> ${cfg.closeTime}`
                                : "Desativado"}
                            </p>
                          </div>
                        </div>
                        <Toggle
                          checked={cfg.enabled}
                          onChange={(v) => updateShift(shift.id, { enabled: v })}
                        />
                      </div>

                      <div
                        className={`grid transition-all duration-300 ${
                          cfg.enabled ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-white/5 px-5 pb-5 pt-4">
                            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                              Dias da semana
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {WEEKDAYS.map((day) => {
                                const selected = cfg.days.includes(day.id);
                                return (
                                  <button
                                    key={`${shift.id}-${day.id}`}
                                    type="button"
                                    onClick={() => toggleDay(shift.id, day.id)}
                                    aria-label={day.label}
                                    title={day.label}
                                    className={`h-9 w-9 rounded-full border text-sm font-semibold transition-all ${
                                      selected
                                        ? "border-brand/50 bg-brand/20 text-brand"
                                        : "border-line bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground"
                                    }`}
                                  >
                                    {day.short}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {WEEKDAY_PRESETS.map((preset) => (
                                <button
                                  key={`${shift.id}-${preset.id}`}
                                  type="button"
                                  onClick={() => applyPreset(shift.id, preset.days)}
                                  className="rounded-lg border border-line bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted transition-all hover:border-white/20 hover:bg-white/[0.07] hover:text-foreground"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 flex gap-3">
                              <TimeInput
                                label="Abertura"
                                value={cfg.openTime}
                                onChange={(v) => updateShift(shift.id, { openTime: v })}
                              />
                              <div className="flex items-end pb-2.5 text-muted">
                                <span className="text-sm">{"->"}</span>
                              </div>
                              <TimeInput
                                label="Fechamento"
                                value={cfg.closeTime}
                                onChange={(v) => updateShift(shift.id, { closeTime: v })}
                              />
                            </div>

                            {cfg.days.length === 0 && (
                              <p className="mt-3 text-xs text-amber-300/90">
                                Selecione pelo menos um dia para este turno.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Services catalog */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <StepBadge step={4} />
              <h2 className="mt-5 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                {ACADEMIA_PROFILE.step4Title}
              </h2>
              <p className="mt-2 text-muted">{ACADEMIA_PROFILE.step4Subtitle}</p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleAIUpload}
              />

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {CATALOG_OPTIONS.map((option) => {
                  const selected = selectedSetupMethod === option.id;
                  const icon =
                    option.icon === "sparkles" ? (
                      <Sparkles className="h-4 w-4 text-brand" />
                    ) : option.icon === "table" ? (
                      <Table2 className="h-4 w-4 text-muted" />
                    ) : option.icon === "store" ? (
                      <Store className="h-4 w-4 text-muted" />
                    ) : (
                      <Clock3 className="h-4 w-4 text-muted" />
                    );

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedSetupMethod(option.id)}
                      className={`flex flex-col rounded-2xl border p-5 text-left transition ${
                        selected
                          ? "border-2 border-brand bg-brand/[0.12]"
                          : "border-line bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                        {icon}
                      </span>
                      <p className="text-lg font-semibold text-foreground">{option.title}</p>
                      <p className="mt-1 text-sm text-muted">{option.desc}</p>
                      {option.badge && (
                        <span className="mt-3 text-xs font-semibold text-brand">{option.badge}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedSetupMethod === "ai" && (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Enviar arquivo (tabela de planos ou PDF)
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleFinish(selectedSetupMethod)}
                  className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-background transition hover:bg-brand-strong"
                >
                  Ir para o dashboard
                </button>
              </div>
            </div>
          )}

          {step < TOTAL_STEPS && (
            <div className="mt-8 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="text-sm text-muted transition-colors hover:text-foreground"
                >
                  {"<- Voltar"}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                disabled={!canContinue()}
                onClick={() => void handleContinue()}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-background transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingStep1 ? "Salvando..." : "Continuar"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

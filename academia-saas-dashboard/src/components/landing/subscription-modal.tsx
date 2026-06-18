"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, X, Zap } from "lucide-react";

import {
  signupWithNicho,
  activateSubscriptionFake,
} from "@/actions/subscription-modal.actions";
import type { SubNicho } from "@/lib/nicho";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  code: string;
  name: string;
  priceCents: number;
};

type NichoOption = {
  id: SubNicho;
  emoji: string;
  title: string;
  subtitle: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const NICHO_OPTIONS: NichoOption[] = [
  { id: "adega", emoji: "🍺", title: "Adega de bairro", subtitle: "Bebidas, combos e narguilé" },
  { id: "lanchonete", emoji: "🥪", title: "Lanchonete", subtitle: "Lanches, combos e sucos" },
  { id: "pizzaria", emoji: "🍕", title: "Pizzaria", subtitle: "Pizzas, tamanhos e bordas" },
];

const PLACEHOLDER_BY_NICHO: Record<SubNicho, string> = {
  adega: "Sua adega",
  lanchonete: "Sua lanchonete",
  pizzaria: "Sua pizzaria",
};

const FAKE_PIX_CODE =
  "00020126580014BR.GOV.BCB.PIX0136a629532e-7693-4846-852d-1bbff817b5a8520400005303986540589.905802BR5925PyraLabs Pagamentos LTDA6009SAO PAULO62290525pix-pyralabs-sub-demo63041234";

function toCurrencyBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Negócio" },
    { n: 2, label: "Cadastro" },
    { n: 3, label: "Pagamento" },
  ];
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map(({ n, label }, i) => {
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-emerald-500 text-white ring-2 ring-emerald-400/40"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                {done ? <Check size={12} strokeWidth={3} /> : n}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-emerald-400" : done ? "text-emerald-500/70" : "text-slate-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mb-4 h-px w-10 transition-colors ${
                  done ? "bg-emerald-500/60" : "bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-3xl border border-slate-700/60 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Step 1 — Nicho ───────────────────────────────────────────────────────────

function Step1Nicho({
  plan,
  selected,
  onSelect,
  onContinue,
  onClose,
}: {
  plan: Plan;
  selected: SubNicho | null;
  onSelect: (n: SubNicho) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-7">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Qual é o seu tipo de negócio?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Escolha pra gente configurar tudo certinho pra você
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        >
          <X size={18} />
        </button>
      </div>

      <StepIndicator step={1} />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {NICHO_OPTIONS.map((opt) => {
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={`relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-200 ${
                active
                  ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                  : "border-slate-700/60 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70"
              }`}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                  <Check size={11} strokeWidth={3} className="text-slate-950" />
                </span>
              )}
              <span className="text-3xl leading-none">{opt.emoji}</span>
              <div>
                <p className={`text-sm font-semibold ${active ? "text-emerald-400" : "text-white"}`}>
                  {opt.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{opt.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5">
        <div className="text-sm text-slate-400">
          <span className="font-medium text-white">{plan.name}</span>
          {" · "}
          <span className="text-emerald-400">{toCurrencyBRL(plan.priceCents)}/mês</span>
        </div>
        <button
          type="button"
          disabled={!selected}
          onClick={onContinue}
          className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continuar
          <ArrowRight size={15} />
        </button>
      </div>

      <div className="mt-3 text-center">
        <a
          href={`/test-drive?niche=${selected ?? "adega"}`}
          className="text-xs text-slate-500 underline underline-offset-2 transition hover:text-slate-300"
        >
          Prefiro testar grátis primeiro
        </a>
      </div>
    </div>
  );
}

// ─── Step 2 — Cadastro ────────────────────────────────────────────────────────

function Step2Cadastro({
  plan,
  subNicho,
  onBack,
  onDone,
  onClose,
}: {
  plan: Plan;
  subNicho: SubNicho;
  onBack: () => void;
  onDone: (tenantId: string) => void;
  onClose: () => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signupWithNicho({
        businessName,
        email,
        password,
        planCode: plan.code,
        subNicho,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDone(result.tenantId);
    });
  }

  return (
    <div className="p-7">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Crie sua conta</h2>
          <p className="mt-1 text-sm text-slate-400">Leva menos de 1 minuto</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        >
          <X size={18} />
        </button>
      </div>

      <StepIndicator step={2} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Nome do negócio
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={PLACEHOLDER_BY_NICHO[subNicho]}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/60 focus:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/60 focus:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Senha <span className="text-slate-500">(mínimo 8 caracteres)</span>
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/60 focus:bg-slate-800"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
                Criando conta...
              </>
            ) : (
              <>
                Criar conta e continuar
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Step 3 — Pagamento ───────────────────────────────────────────────────────

function Step3Pagamento({
  plan,
  subNicho,
  tenantId,
  onBack,
  onClose,
}: {
  plan: Plan;
  subNicho: SubNicho;
  tenantId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nichoOption = NICHO_OPTIONS.find((o) => o.id === subNicho)!;

  function handleCopy() {
    void navigator.clipboard.writeText(FAKE_PIX_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const result = await activateSubscriptionFake(tenantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo);
    });
  }

  return (
    <div className="p-7">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Pagamento</h2>
          <p className="mt-1 text-sm text-slate-400">Um único passo pra ativar sua conta</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        >
          <X size={18} />
        </button>
      </div>

      <StepIndicator step={3} />

      {/* Order summary */}
      <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Resumo do pedido</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{nichoOption.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">{nichoOption.title}</p>
              <p className="text-xs text-slate-400">{plan.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-400">{toCurrencyBRL(plan.priceCents)}</p>
            <p className="text-xs text-slate-500">/mês</p>
          </div>
        </div>
      </div>

      {/* PIX card */}
      <div className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-5">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-slate-400">
          PIX — Pagamento instantâneo
        </p>

        {/* QR code placeholder */}
        <div className="mx-auto mb-4 flex h-36 w-36 items-center justify-center rounded-2xl border border-slate-600 bg-slate-700">
          <div className="text-center">
            <div className="mx-auto mb-1.5 h-16 w-16 rounded-lg bg-slate-600 opacity-50" />
            <p className="text-[10px] text-slate-500">QR Code PIX</p>
          </div>
        </div>

        {/* Copia e cola */}
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={FAKE_PIX_CODE.slice(0, 40) + "..."}
            className="flex-1 truncate rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-400 outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
              copied
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <p className="mt-3 text-center text-xs text-slate-500">
          Após o pagamento, sua conta é ativada automaticamente em até 5 minutos
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Voltar
        </button>
        <button
          type="button"
          onClick={handleActivate}
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#6ee7b7_0%,#34d399_45%,#10b981_100%)] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950" />
              Ativando...
            </>
          ) : (
            <>
              <Zap size={15} />
              Já paguei — ativar minha conta
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main SubscriptionModal ───────────────────────────────────────────────────

export function SubscriptionModal({
  plan,
  isOpen,
  onClose,
}: {
  plan: Plan;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subNicho, setSubNicho] = useState<SubNicho | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  function handleClose() {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep(1);
      setSubNicho(null);
      setTenantId(null);
    }, 300);
  }

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClose={handleClose}>
      {step === 1 && (
        <Step1Nicho
          plan={plan}
          selected={subNicho}
          onSelect={setSubNicho}
          onContinue={() => setStep(2)}
          onClose={handleClose}
        />
      )}
      {step === 2 && subNicho && (
        <Step2Cadastro
          plan={plan}
          subNicho={subNicho}
          onBack={() => setStep(1)}
          onDone={(id) => {
            setTenantId(id);
            setStep(3);
          }}
          onClose={handleClose}
        />
      )}
      {step === 3 && subNicho && tenantId && (
        <Step3Pagamento
          plan={plan}
          subNicho={subNicho}
          tenantId={tenantId}
          onBack={() => setStep(2)}
          onClose={handleClose}
        />
      )}
    </ModalBackdrop>
  );
}

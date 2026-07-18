"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, X, Zap } from "lucide-react";

import {
  signupWithNicho,
  activateSubscriptionFake,
} from "@/actions/subscription-modal.actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  code: string;
  name: string;
  priceCents: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const FAKE_PIX_CODE =
  "00020126580014BR.GOV.BCB.PIX0136a629532e-7693-4846-852d-1bbff817b5a8520400005303986540589.905802BR5925PyraLabs Pagamentos LTDA6009SAO PAULO62290525pix-pyralabs-sub-demo63041234";

const ACADEMIA_OPTION = {
  emoji: "🏋️",
  title: "Academia",
};

function toCurrencyBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Cadastro" },
    { n: 2, label: "Pagamento" },
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

// ─── Step 1 — Cadastro ────────────────────────────────────────────────────────

function StepCadastro({
  plan,
  onBack,
  onDone,
  onClose,
}: {
  plan: Plan;
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

      <StepIndicator step={1} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Nome da academia
          </label>
          <input
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Sua academia"
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

// ─── Step 2 — Pagamento ───────────────────────────────────────────────────────

function StepPagamento({
  plan,
  tenantId,
  onBack,
  onClose,
}: {
  plan: Plan;
  tenantId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

      <StepIndicator step={2} />

      {/* Order summary */}
      <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Resumo do pedido</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{ACADEMIA_OPTION.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-white">{ACADEMIA_OPTION.title}</p>
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
  const [step, setStep] = useState<1 | 2>(1);
  const [tenantId, setTenantId] = useState<string | null>(null);

  function handleClose() {
    onClose();
    setTimeout(() => {
      setStep(1);
      setTenantId(null);
    }, 300);
  }

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClose={handleClose}>
      {step === 1 && (
        <StepCadastro
          plan={plan}
          onBack={handleClose}
          onDone={(id) => {
            setTenantId(id);
            setStep(2);
          }}
          onClose={handleClose}
        />
      )}
      {step === 2 && tenantId && (
        <StepPagamento
          plan={plan}
          tenantId={tenantId}
          onBack={() => setStep(1)}
          onClose={handleClose}
        />
      )}
    </ModalBackdrop>
  );
}

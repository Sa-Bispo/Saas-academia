"use client";

import { useState } from "react";
import { Check, LoaderCircle, X, Zap } from "lucide-react";

import { joinWaitlist } from "@/actions/waitlist.actions";

type Props = {
  niche: string;
  triggerText?: string;
  triggerClassName?: string;
  showTriggerIcon?: boolean;
};

const COPY_BY_NICHE: Record<
  string,
  {
    kicker: string;
    title: string;
    description: string;
    success: string;
  }
> = {
  pizzaria: {
    kicker: "Pizzaria - em breve",
    title: "Seja o primeiro a saber quando sair",
    description:
      "Estamos finalizando o módulo de pizzaria. Deixe seu e-mail e te avisamos na hora do lançamento.",
    success: "Te avisaremos assim que o módulo de pizzaria for liberado.",
  },
  clinica: {
    kicker: "Saúde e Beleza - em breve",
    title: "Avisaremos assim que abrirmos esse segmento",
    description:
      "Estamos finalizando os fluxos para clínicas, salões e atendimentos recorrentes. Entre na lista para receber acesso antecipado.",
    success: "Te avisaremos assim que o módulo de Saúde e Beleza for liberado.",
  },
  empresa: {
    kicker: "Empresas e Serviços - em breve",
    title: "Receba o aviso de lançamento primeiro",
    description:
      "Estamos preparando os fluxos corporativos com base de conhecimento e atendimento avançado. Cadastre seu e-mail para entrar na primeira turma.",
    success: "Te avisaremos assim que o módulo de Empresas e Serviços for liberado.",
  },
  geral: {
    kicker: "Novos segmentos - em breve",
    title: "Entre na lista de espera",
    description:
      "Estamos liberando novos segmentos aos poucos. Deixe seu e-mail para receber prioridade quando abrirmos as próximas vagas.",
    success: "Perfeito. Você será avisado quando novos segmentos forem liberados.",
  },
};

export function WaitlistModal({
  niche,
  triggerText = "Entrar na lista de espera",
  triggerClassName,
  showTriggerIcon = true,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY_BY_NICHE[niche] ?? COPY_BY_NICHE.geral;

  const defaultTriggerClassName =
    "inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await joinWaitlist(email.trim(), niche);
      if (res.success) {
        setIsDone(true);
      } else {
        setError(res.error ?? "Erro inesperado.");
      }
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName ?? defaultTriggerClassName}
      >
        {showTriggerIcon && <Zap size={15} />}
        {triggerText}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/12 bg-[linear-gradient(145deg,rgba(9,17,26,0.97),rgba(19,34,53,0.94))] p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-white/5 text-muted transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar"
            >
              <X size={15} />
            </button>

            {isDone ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-brand/30 bg-brand/10">
                  <Check size={28} className="text-brand" />
                </div>
                <h3 className="text-xl font-semibold text-white">Você está na lista!</h3>
                <p className="text-sm text-muted">
                  {copy.success}
                </p>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setIsDone(false); setEmail(""); }}
                  className="mt-2 text-sm text-muted underline-offset-2 transition hover:text-white hover:underline"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {copy.kicker}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  {copy.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {copy.description}
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
                  />

                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-60"
                  >
                    {isLoading ? (
                      <><LoaderCircle size={15} className="animate-spin" />Salvando...</>
                    ) : (
                      "Quero ser avisado"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

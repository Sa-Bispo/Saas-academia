"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, Mail, Lock, Zap } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuporteSheet, setShowSuporteSheet] = useState(false);
  const [isPreparingLogin, setIsPreparingLogin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function prepare() {
      if (searchParams.get("force") !== "1") {
        return;
      }

      setIsPreparingLogin(true);

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } finally {
        if (!cancelled) {
          setIsPreparingLogin(false);
        }
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setIsSubmitting(true);

    try {
      if (!email.trim() || !password.trim()) {
        setServerError("Preencha e-mail e senha para continuar.");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-8 lg:py-8 xl:py-10">
      <div className="pointer-events-none absolute -left-32 top-16 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-[clamp(2.2rem,4vw,4.2rem)]">
        <div className="hidden lg:block lg:pl-2">
          <div className="mb-[clamp(2rem,4vw,4rem)] flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-slate-950 shadow-lg shadow-brand/25 xl:h-14 xl:w-14">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.849L.057 23.535a.75.75 0 00.916.932l5.934-1.557A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.733 9.733 0 01-4.964-1.355l-.356-.212-3.683.967.984-3.595-.232-.37A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
              </svg>
            </div>
            <span className="text-[clamp(1.8rem,2.8vw,2.6rem)] font-bold tracking-tight text-white">PyraLabs</span>
            <span className="inline-flex rounded-xl border border-brand/35 bg-brand/10 px-3 py-1 text-[clamp(0.9rem,1.5vw,1.25rem)] font-medium text-brand">
              SAAS
            </span>
          </div>

          <p className="mb-5 text-[clamp(0.82rem,1vw,0.98rem)] uppercase tracking-[0.28em] text-brand">Plataforma WhatsApp</p>

          <h2 className="max-w-[12ch] text-[clamp(2.9rem,5.5vw,5.1rem)] font-bold leading-[0.93] tracking-[-0.03em] text-white">
            Comunique.
            <br />
            <span className="text-brand">Converta.</span>
            <br />
            Escale.
          </h2>

          <p className="mt-8 max-w-[34rem] text-[clamp(1rem,1.35vw,1.35rem)] leading-[1.55] text-muted">
            Gerencie todas as suas conversas no WhatsApp em um unico painel. Automatize, analise e cresca.
          </p>
        </div>

        <div className="mx-auto w-full max-w-sm lg:max-w-[430px] lg:rounded-3xl lg:border lg:border-line lg:bg-surface/35 lg:p-6 lg:shadow-2xl xl:p-7">
          <div className="flex flex-col items-center gap-1.5 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/20">
            <Zap size={20} className="text-slate-950" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Pyra</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted">by PyraLabs</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400">Sistema online</span>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-0">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <h1 className="text-base font-semibold text-white mb-0.5">Bem-vindo de volta</h1>
            <p className="text-xs text-muted mb-4">Acesse seu painel de pedidos</p>

            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-muted">
                E-mail
              </label>
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="h-11 w-full rounded-xl border border-line bg-background/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-brand/45"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-muted">
                Senha
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-line bg-background/60 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-brand/45"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-line bg-background accent-brand" />
                <span className="text-xs text-muted">Lembrar de mim</span>
              </label>
              <Link href="/forgot-password" className="text-xs text-brand hover:text-brand-strong transition">
                Esqueceu a senha?
              </Link>
            </div>

            {serverError && (
              <p className="mb-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isPreparingLogin}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting || isPreparingLogin ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {isPreparingLogin ? "Preparando login..." : isSubmitting ? "Entrando..." : "Entrar na plataforma"}
            </button>
          </div>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-line" />
          <span className="text-[11px] text-muted">precisa de ajuda?</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={() => setShowSuporteSheet(true)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/15"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.849L.057 23.535a.75.75 0 00.916.932l5.934-1.557A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.733 9.733 0 01-4.964-1.355l-.356-.212-3.683.967.984-3.595-.232-.37A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
          </svg>
          Falar com suporte
        </button>

          <p className="mt-5 text-center text-[11px] text-muted">
            © {new Date().getFullYear()} PyraLabs · Termos · Privacidade
          </p>
        </div>
      </div>

      {showSuporteSheet && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSuporteSheet(false)}
          />

          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="w-full rounded-t-3xl border-t border-line bg-surface p-5 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:max-w-xl sm:rounded-3xl sm:border sm:border-line">
            <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-line" />

            <h2 className="text-base font-semibold text-white mb-1">Precisa de ajuda?</h2>
            <p className="text-xs text-muted mb-4 leading-relaxed">
              Vamos te atender pelo WhatsApp agora mesmo. A mensagem já vai preenchida com seu e-mail.
            </p>

            <div className="rounded-xl border border-line bg-background/60 p-3 mb-4">
              <p className="text-[10px] uppercase tracking-[0.08em] text-muted mb-2">Mensagem que será enviada</p>
              <div className="rounded-xl rounded-bl-sm bg-emerald-500/15 px-3 py-2">
                <p className="text-xs text-emerald-300 leading-relaxed">
                  Olá! Preciso de ajuda para acessar o Pyra.
                  {email ? ` Meu e-mail é ${email}` : ""}
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/5511911792144?text=${encodeURIComponent(
                `Olá! Preciso de ajuda para acessar o Pyra.${email ? ` Meu e-mail é ${email}` : ""}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex w-full items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 transition hover:bg-emerald-500"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                <svg viewBox="0 0 24 24" fill="white" className="h-4 w-4">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.849L.057 23.535a.75.75 0 00.916.932l5.934-1.557A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.733 9.733 0 01-4.964-1.355l-.356-.212-3.683.967.984-3.595-.232-.37A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Abrir WhatsApp</span>
                <span className="text-[11px] text-emerald-200/70">Resposta em até 5 minutos</span>
              </div>
            </a>

            <button
              type="button"
              onClick={() => setShowSuporteSheet(false)}
              className="w-full py-2 text-sm text-muted transition hover:text-white"
            >
              Cancelar
            </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Carregando login...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

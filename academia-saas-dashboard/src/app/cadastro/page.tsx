"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import { ArrowLeft, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { claimShadowTenant, signupDirect } from "@/actions/tenant.actions";
import {
  getOnboardingNicheFromPlanCode,
  getPlanosSlugFromPlanCode,
  writePendingPlanSelection,
} from "@/lib/plan-context";

function CadastroPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tenantId = searchParams.get("tenantId") ?? "";
  const addons = searchParams.get("addons") ?? "";
  const niche = (searchParams.get("niche") ?? "delivery") as "delivery" | "clinicas" | "empresas";
  const planCode = searchParams.get("plan_code") ?? searchParams.get("plan") ?? "";
  const directPlanosSlug = getPlanosSlugFromPlanCode(planCode) ?? "delivery";
  const onboardingNiche = getOnboardingNicheFromPlanCode(planCode);

  // Fluxo direto: veio da página de planos sem test-drive
  const isDirect = !tenantId && !!planCode;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isDirect || !planCode || !onboardingNiche) return;

    writePendingPlanSelection({
      planCode,
      niche: onboardingNiche,
      savedAt: Date.now(),
    });
  }, [isDirect, onboardingNiche, planCode]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (isDirect) {
        const result = await signupDirect({
          name: name.trim(),
          email: email.trim(),
          password,
          planCode,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        router.push(result.redirectTo);
        router.refresh();
        return;
      }

      if (!tenantId) {
        setError("Tenant inválido. Volte ao test-drive e gere um novo bot.");
        return;
      }

      const result = await claimShadowTenant({
        tenantId,
        name: name.trim(),
        email: email.trim(),
        password,
        niche,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <main className="relative min-h-screen overflow-x-clip">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-220px] h-[520px] w-[780px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,168,132,0.22),rgba(0,168,132,0.03)_58%,transparent_72%)] blur-2xl" />
        <div className="absolute bottom-[-140px] right-[-100px] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(136,196,255,0.2),transparent_68%)]" />
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 sm:px-8 lg:px-10">
        <Link
          href={isDirect ? `/planos/${directPlanosSlug}` : "/test-drive"}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-white"
        >
          <ArrowLeft size={15} />
          {isDirect ? "Voltar para os planos" : "Voltar para o test-drive"}
        </Link>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pb-24">
        <article className="rounded-3xl border border-line bg-[linear-gradient(155deg,rgba(255,255,255,0.06),rgba(9,17,26,0.88))] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm text-brand">
            <Sparkles size={14} />
            {isDirect ? "Criar conta" : "Account Claiming"}
          </span>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {isDirect
              ? "Crie sua conta para reservar este plano."
              : "Falta muito pouco para a sua IA comecar a trabalhar."}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            {isDirect
              ? "Preencha os dados abaixo para salvar o plano escolhido e seguir para a configuração inicial do seu bot."
              : "Crie sua conta de administrador para acessar o painel e conectar seu WhatsApp oficial."}
          </p>

          {addons && (
            <p className="mt-5 rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/90">
              Superpoderes selecionados: <span className="text-brand">{addons}</span>
            </p>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Nome Completo</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Joao da Silva"
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-white">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="No minimo 6 caracteres"
                className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
                minLength={6}
                required
              />
            </label>

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-70"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {isPending ? "Criando conta..." : "Criar Conta e Continuar"}
            </button>
          </form>

          {isDirect && (
            <p className="mt-4 text-center text-sm text-muted">
              Já tem conta?{" "}
              <Link href={`/login?plan_code=${planCode}`} className="text-brand hover:underline">
                Faça login
              </Link>
            </p>
          )}
        </article>

        <aside className="rounded-3xl border border-brand/25 bg-[linear-gradient(145deg,rgba(0,168,132,0.12),rgba(9,17,26,0.9))] p-6 shadow-xl shadow-brand/10 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/90">Valor imediato</p>
          <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
            {isDirect
              ? "Assine e comece a usar em minutos."
              : "Seu bot ja esta pronto. Agora falta apenas publicar no seu numero oficial."}
          </h2>
          <p className="mt-4 text-base leading-7 text-white/80">
            {isDirect
              ? "Após o cadastro, sua assinatura fica pendente para o plano escolhido e você segue direto para o onboarding inicial."
              : "Assim que voce finalizar o cadastro, seu tenant de teste e convertido para conta real com todas as configuracoes que voce ja fez no simulador."}
          </p>

          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {isDirect ? (
              <>
                <li>• Sem cartão de crédito para criar a conta</li>
                <li>• Plano já vinculado à conta no momento do cadastro</li>
                <li>• Onboarding guiado antes de chegar ao painel</li>
              </>
            ) : (
              <>
                <li>• Sem perder contexto, objetivo e persona configurados</li>
                <li>• Sem precisar recriar seu atendimento do zero</li>
                <li>• Pronto para conectar WhatsApp e operar em producao</li>
              </>
            )}
          </ul>
        </aside>
      </section>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<main className="relative min-h-screen overflow-x-clip" />}>
      <CadastroPageContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus, Mail, Lock, User } from "lucide-react";

import { SupabaseClientEnvError, createClient } from "@/lib/supabase/client";

const schema = z
  .object({
    nome: z.string().min(2, "Nome precisa ter ao menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "A senha precisa ter ao menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

type PageState = "idle" | "confirm_email";

export default function RegisterPage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { nome: data.nome },
        },
      });

      if (error) {
        setServerError(
          error.message === "Invalid API key"
            ? "Chave publica do Supabase invalida. Atualize NEXT_PUBLIC_SUPABASE_ANON_KEY no .env."
            : error.message,
        );
        return;
      }

      // Supabase pode exigir confirmacao de e-mail dependendo da configuracao
      // do projeto. Mostramos a mensagem de confirmacao em vez de redirecionar.
      setPageState("confirm_email");
    } catch (error) {
      if (error instanceof SupabaseClientEnvError) {
        setServerError(
          "Configuracao do Supabase invalida no ambiente atual. Revise as variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
        return;
      }

      setServerError("Falha inesperada ao criar conta. Tente novamente.");
    }
  }

  if (pageState === "confirm_email") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-brand/30 bg-brand/10">
          <Mail size={22} className="text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          Confirme seu e-mail
        </h2>
        <p className="text-sm leading-6 text-muted">
          Enviamos um link de confirmação para o seu e-mail.
          <br />
          Clique no link para ativar sua conta e acessar o dashboard.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-xl border border-line bg-white/4 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/8"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Criar conta</h2>
        <p className="mt-1 text-sm text-muted">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="text-brand underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Nome */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Nome
          </label>
          <div className="relative">
            <User
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              {...register("nome")}
              className="w-full rounded-xl border border-line bg-white/4 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          {errors.nome && (
            <p className="text-xs text-red-400">{errors.nome.message}</p>
          )}
        </div>

        {/* E-mail */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            E-mail
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              {...register("email")}
              className="w-full rounded-xl border border-line bg-white/4 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Senha
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("password")}
              className="w-full rounded-xl border border-line bg-white/4 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          )}
        </div>

        {/* Confirmar Senha */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">
            Confirmar senha
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              className="w-full rounded-xl border border-line bg-white/4 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Erro do servidor */}
        {serverError && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-medium text-slate-950 transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <UserPlus size={16} />
          )}
          {isSubmitting ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
    </>
  );
}

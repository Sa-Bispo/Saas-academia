"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Credenciais inválidas.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-slate-950 shadow-lg shadow-brand/25">
            <Shield size={22} />
          </div>
          <h1 className="text-xl font-bold text-white">Acesso Admin</h1>
          <p className="text-xs text-muted">PyraLabs — painel restrito</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        >
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              E-mail
            </label>
            <div className="relative">
              <Mail
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                required
                autoComplete="email"
                className="h-10 w-full rounded-xl border border-line bg-background/60 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-brand/45"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Senha
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="h-10 w-full rounded-xl border border-line bg-background/60 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-muted focus:border-brand/45"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong disabled:opacity-70"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
            {loading ? "Entrando..." : "Entrar no admin"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted">
          © {new Date().getFullYear()} PyraLabs
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function NoPlanState() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login?force=1");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white/5 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-white">Voce esta sem plano ativo</h1>
        <p className="mt-3 text-sm text-muted">
          Sua conta foi criada, mas ainda nao existe um plano ativo vinculado.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white/10 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={16} />
          {isSigningOut ? "Saindo..." : "Deslogar"}
        </button>
      </div>
    </div>
  );
}

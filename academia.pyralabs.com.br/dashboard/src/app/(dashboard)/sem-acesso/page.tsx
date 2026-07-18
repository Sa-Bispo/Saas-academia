import { Lock } from "lucide-react";
import Link from "next/link";

export default function SemAcessoPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-color)" }}
      >
        <Lock size={20} style={{ color: "var(--text-secondary)" }} />
      </div>
      <h1 className="mb-2 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        Módulo não disponível
      </h1>
      <p className="mb-6 max-w-xs text-sm" style={{ color: "var(--text-secondary)" }}>
        Este recurso não está incluído no seu plano atual. Entre em contato para contratar.
      </p>
      <Link
        href="/alunos"
        className="rounded-xl px-4 py-2 text-sm font-medium transition"
        style={{
          background: "var(--accent)",
          color: "#fff",
        }}
      >
        Voltar ao início
      </Link>
    </div>
  );
}

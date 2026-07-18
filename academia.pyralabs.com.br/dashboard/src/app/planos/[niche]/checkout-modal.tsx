"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, QrCode, X, Zap } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface Props {
  planCode: string;
  planName: string;
  priceCents: number;
  tenantId: string | null;
  featured: boolean;
  autoOpen?: boolean;
}

type PixState =
  | { phase: "idle" }
  | { phase: "email" }
  | { phase: "loading" }
  | { phase: "pix"; qrCode: string; qrCodeBase64: string | null; ticketUrl: string | null }
  | { phase: "error"; message: string };

const isSandbox = process.env.NEXT_PUBLIC_PAYMENT_MODE !== "production";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CheckoutModal({
  planCode,
  planName,
  priceCents,
  tenantId,
  featured,
  autoOpen = false,
}: Props) {
  const router = useRouter();
  const [pixState, setPixState] = useState<PixState>({ phase: "idle" });
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleChoose() {
    if (!tenantId) {
      router.push(`/cadastro?plan_code=${planCode}`);
      return;
    }
    if (isSandbox) {
      activate();
    } else {
      setPixState({ phase: "email" });
    }
  }

  useEffect(() => {
    if (!autoOpen || isPending || pixState.phase !== "idle") return;
    handleChoose();
  }, [autoOpen, isPending, pixState.phase]);

  function activate(payerEmail = "dev@sandbox.local") {
    setPixState({ phase: "loading" });
    startTransition(async () => {
      try {
        const res = await fetch("/api/subscriptions/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planCode, tenantId, payerEmail }),
        });
        const data = await res.json();

        if (!res.ok) {
          setPixState({ phase: "error", message: data.error ?? "Erro ao processar." });
          return;
        }

        // Sandbox: redireciona direto para /setup
        if (data.mock) {
          router.push("/setup");
          return;
        }

        // Production: exibe QR PIX
        setPixState({
          phase: "pix",
          qrCode: data.qrCode ?? "",
          qrCodeBase64: data.qrCodeBase64 ?? null,
          ticketUrl: data.ticketUrl ?? null,
        });
      } catch {
        setPixState({ phase: "error", message: "Erro de conexão. Tente novamente." });
      }
    });
  }

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    activate(email);
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btnFeatured =
    "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-[#00c49a] disabled:opacity-60";
  const btnDefault =
    "mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white/6 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60";

  return (
    <>
      <button
        onClick={handleChoose}
        disabled={isPending}
        className={featured ? btnFeatured : btnDefault}
      >
        {isPending
          ? <Loader2 size={15} className="animate-spin" />
          : isSandbox ? <Zap size={15} /> : <QrCode size={15} />}
        {isPending ? "Processando..." : "Assinar plano"}
      </button>

      {/* Modal PIX (só aparece em production) */}
      {pixState.phase !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-[#0c1620] p-7 shadow-2xl">
            <button
              onClick={() => setPixState({ phase: "idle" })}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-muted transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            {pixState.phase === "loading" && (
              <div className="flex flex-col items-center gap-4 py-10">
                <Loader2 size={36} className="animate-spin text-brand" />
                <p className="text-sm text-muted">Gerando QR Code PIX...</p>
              </div>
            )}

            {pixState.phase === "email" && (
              <>
                <h2 className="text-xl font-semibold text-white">Confirme seu e-mail</h2>
                <p className="mt-2 text-sm text-muted">
                  O comprovante será enviado para este endereço.
                </p>
                <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@empresa.com"
                    required
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white outline-none ring-brand/60 transition placeholder:text-muted focus:border-brand focus:ring-2"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-[#00c49a] disabled:opacity-70"
                  >
                    {isPending ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                    Gerar QR Code PIX
                  </button>
                </form>
              </>
            )}

            {pixState.phase === "pix" && (
              <>
                <h2 className="text-xl font-semibold text-white">Pague com PIX</h2>
                <p className="mt-1 text-sm text-muted">
                  {planName} — {formatBRL(priceCents)}/mês
                </p>
                {pixState.qrCodeBase64 && (
                  <div className="mx-auto mt-5 w-fit rounded-2xl border border-white/12 bg-white p-3">
                    <Image
                      src={`data:image/png;base64,${pixState.qrCodeBase64}`}
                      alt="QR Code PIX"
                      width={200}
                      height={200}
                      unoptimized
                    />
                  </div>
                )}
                <p className="mt-4 text-center text-xs text-muted">ou copie o código Copia e Cola:</p>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <p className="flex-1 truncate font-mono text-xs text-white/70">{pixState.qrCode}</p>
                  <button
                    onClick={() => handleCopy(pixState.qrCode)}
                    className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-white"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                {copied && <p className="mt-1 text-center text-xs text-brand">Copiado!</p>}
                <p className="mt-4 text-center text-xs text-muted">
                  QR válido por 30 min. Acesso ativado automaticamente após confirmação.
                </p>
                {pixState.ticketUrl && (
                  <a href={pixState.ticketUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-4 block text-center text-xs text-brand underline underline-offset-2">
                    Abrir no app do banco
                  </a>
                )}
              </>
            )}

            {pixState.phase === "error" && (
              <>
                <h2 className="text-xl font-semibold text-white">Algo deu errado</h2>
                <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {pixState.message}
                </p>
                <button
                  onClick={() => setPixState({ phase: "idle" })}
                  className="mt-5 inline-flex w-full justify-center rounded-2xl border border-line bg-white/6 px-5 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

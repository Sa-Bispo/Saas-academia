"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle, Loader2, X } from "lucide-react";
import { comprimirFoto } from "@/lib/comprimir-foto";
import { ParqFormClient } from "./parq-form";

type Pergunta = { id: number; texto: string; tipo: "PERGUNTA" | "TEXTO" };

type Props = {
  tenantId: string;
  academiaName: string;
  logoUrl?: string | null;
  perguntas: Pergunta[];
};

function maskCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

type Etapa = "identificar" | "novo" | "foto" | "fotoEnviada" | "completo";

export function ParqEntryClient({ tenantId, academiaName, logoUrl, perguntas }: Props) {
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<Etapa>("identificar");
  const [cpf, setCpf] = useState("");
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleFotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);
    try {
      setFoto(await comprimirFoto(file));
    } catch {
      setErro("Não foi possível carregar a foto. Tente tirar outra.");
    }
  }, []);

  function handleIdentificar() {
    setErro(null);
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErro("Informe os 11 dígitos do CPF.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/parq/${tenantId}/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          status?: string; primeiroNome?: string; error?: string;
        };
        if (!res.ok) {
          setErro(data.error ?? "Não foi possível verificar seus dados.");
          return;
        }
        setPrimeiroNome(data.primeiroNome ?? "");
        if (data.status === "novo") setEtapa("novo");
        else if (data.status === "foto") setEtapa("foto");
        else if (data.status === "completo") setEtapa("completo");
      } catch {
        setErro("Sem conexão. Verifique sua internet e tente novamente.");
      }
    });
  }

  function handleEnviarFoto() {
    setErro(null);
    if (!foto) { setErro("Adicione uma foto antes de enviar."); return; }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/foto/${tenantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "enviar", cpf, foto }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) { setErro(data.error ?? "Não foi possível enviar a foto."); return; }
        setEtapa("fotoEnviada");
      } catch {
        setErro("Sem conexão. Verifique sua internet e tente novamente.");
      }
    });
  }

  // Aluno novo → formulário PAR-Q completo, com CPF já preenchido.
  if (etapa === "novo") {
    return (
      <ParqFormClient
        tenantId={tenantId}
        academiaName={academiaName}
        logoUrl={logoUrl}
        perguntas={perguntas}
        cpfInicial={cpf}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={academiaName} className="mx-auto mb-3 h-16 w-16 rounded-2xl object-contain" />
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{academiaName}</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Ficha de cadastro</h1>
        </div>

        {/* ── Etapa 1: identificar ── */}
        {etapa === "identificar" && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-white/50">Comece confirmando seu CPF.</p>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">CPF</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder-white/20 focus:border-emerald-500/50 focus:outline-none"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                inputMode="numeric"
              />
            </div>

            {erro && <p className="text-xs text-red-400">{erro}</p>}

            <button
              type="button"
              disabled={pending}
              onClick={handleIdentificar}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Verificando...</span>
              ) : "Continuar"}
            </button>
          </div>
        )}

        {/* ── Etapa 2: falta a foto ── */}
        {etapa === "foto" && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-center">
              <p className="text-sm text-white/50">Oi, {primeiroNome}! Falta só a sua foto.</p>
            </div>

            <input
              ref={fotoInputRef}
              id="foto-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFotoChange}
            />

            {foto ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="Sua foto" className="h-40 w-40 rounded-full border-2 border-emerald-500/50 object-cover" />
                <label htmlFor="foto-input" className="flex cursor-pointer items-center gap-1.5 text-xs text-white/40 transition hover:text-white/70">
                  <X size={12} /> Trocar foto
                </label>
              </div>
            ) : (
              <label
                htmlFor="foto-input"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-10 text-sm text-white/50 transition hover:border-white/30 hover:text-white/80"
              >
                <Camera size={26} />
                Tirar ou escolher foto
              </label>
            )}

            {erro && <p className="text-center text-xs text-red-400">{erro}</p>}

            <button
              type="button"
              disabled={pending || !foto}
              onClick={handleEnviarFoto}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Enviando...</span>
              ) : "Enviar foto"}
            </button>
          </div>
        )}

        {/* ── Etapa 3a: foto enviada ── */}
        {etapa === "fotoEnviada" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <h2 className="mb-1 text-xl font-semibold text-white">Foto enviada!</h2>
            <p className="text-sm text-white/50">
              Prontinho{primeiroNome ? `, ${primeiroNome}` : ""}. Seu cadastro está completo.
            </p>
          </div>
        )}

        {/* ── Etapa 3b: cadastro já completo ── */}
        {etapa === "completo" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <h2 className="mb-1 text-xl font-semibold text-white">Cadastro atualizado</h2>
            <p className="text-sm text-white/50">
              Tudo certo{primeiroNome ? `, ${primeiroNome}` : ""}! Seu cadastro já está completo, não precisa fazer nada.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-white/20">
          Seus dados são usados apenas para o cadastro na academia.
        </p>
      </div>
    </div>
  );
}

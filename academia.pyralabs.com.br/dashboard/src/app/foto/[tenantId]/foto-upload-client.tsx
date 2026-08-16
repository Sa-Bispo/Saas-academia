"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle, Loader2, X } from "lucide-react";

type Props = {
  tenantId: string;
  academiaName: string;
};

function maskCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function FotoUploadClient({ tenantId, academiaName }: Props) {
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const [etapa, setEtapa] = useState<"identificar" | "foto" | "pronto">("identificar");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [jaTemFoto, setJaTemFoto] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleFotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null);

    const lerDireto = () => {
      const reader = new FileReader();
      reader.onload = () => setFoto(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => setErro("Não foi possível carregar a foto. Tente tirar outra.");
      reader.readAsDataURL(file);
    };

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const MAX = 512;
        let { width, height } = img;
        if (!width || !height) { URL.revokeObjectURL(url); lerDireto(); return; }
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { lerDireto(); return; }
        ctx.drawImage(img, 0, 0, width, height);
        setFoto(canvas.toDataURL("image/jpeg", 0.62));
      } catch {
        lerDireto();
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); lerDireto(); };
    img.src = url;
  }, []);

  function handleIdentificar() {
    setErro(null);
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErro("Informe os 11 dígitos do CPF.");
      return;
    }
    if (!dataNascimento) {
      setErro("Informe sua data de nascimento.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/foto/${tenantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "verificar", cpf, dataNascimento }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          primeiroNome?: string; jaTemFoto?: boolean; error?: string;
        };
        if (!res.ok) {
          setErro(data.error ?? "Não foi possível verificar seus dados.");
          return;
        }
        setPrimeiroNome(data.primeiroNome ?? "");
        setJaTemFoto(!!data.jaTemFoto);
        setEtapa("foto");
      } catch {
        setErro("Sem conexão. Verifique sua internet e tente novamente.");
      }
    });
  }

  function handleEnviar() {
    setErro(null);
    if (!foto) {
      setErro("Adicione uma foto antes de enviar.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/foto/${tenantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "enviar", cpf, dataNascimento, foto }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setErro(data.error ?? "Não foi possível enviar a foto.");
          return;
        }
        setEtapa("pronto");
      } catch {
        setErro("Sem conexão. Verifique sua internet e tente novamente.");
      }
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{academiaName}</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Foto de cadastro</h1>
        </div>

        {/* ── Etapa 1: identificar ── */}
        {etapa === "identificar" && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-white/50">Confirme seus dados para atualizar sua foto.</p>

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

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Data de nascimento</label>
              <input
                type="date"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white focus:border-emerald-500/50 focus:outline-none [color-scheme:dark]"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
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

        {/* ── Etapa 2: foto ── */}
        {etapa === "foto" && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="text-center">
              <p className="text-sm text-white/50">É você,</p>
              <p className="text-lg font-semibold text-white">{primeiroNome}?</p>
              {jaTemFoto && (
                <p className="mt-1 text-xs text-amber-300/80">Você já tem uma foto — enviar uma nova vai substituir.</p>
              )}
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
                <img
                  src={foto}
                  alt="Sua foto"
                  className="h-40 w-40 rounded-full border-2 border-emerald-500/50 object-cover"
                />
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
              onClick={handleEnviar}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Enviando...</span>
              ) : "Enviar foto"}
            </button>

            <button
              type="button"
              onClick={() => { setEtapa("identificar"); setFoto(null); setErro(null); }}
              className="w-full text-center text-xs text-white/30 transition hover:text-white/60"
            >
              Não sou eu — voltar
            </button>
          </div>
        )}

        {/* ── Etapa 3: pronto ── */}
        {etapa === "pronto" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <h2 className="mb-1 text-xl font-semibold text-white">Foto enviada!</h2>
            <p className="text-sm text-white/50">
              Prontinho{primeiroNome ? `, ${primeiroNome}` : ""}. Sua foto já está no cadastro da {academiaName}.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-white/20">
          Seus dados são usados apenas para identificação no cadastro da academia.
        </p>
      </div>
    </div>
  );
}

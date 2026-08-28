"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Loader2, Trash2, Upload, ZoomIn } from "lucide-react";
import { salvarLogoAcademia, removerLogoAcademia } from "@/actions/config.actions";

const VIEW = 224; // tamanho do quadro de edição (px na tela)
const OUT = 256; // tamanho final exportado (px)

// ─── Modal de ajuste (pan + zoom) ─────────────────────────────────────────────

function CropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Carrega a imagem e calcula a escala inicial (logo inteira visível no quadro).
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setFitScale(VIEW / Math.max(image.naturalWidth, image.naturalHeight));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const drawW = img ? img.naturalWidth * fitScale * zoom : 0;
  const drawH = img ? img.naturalHeight * fitScale * zoom : 0;
  const left = VIEW / 2 - drawW / 2 + offset.x;
  const top = VIEW / 2 - drawH / 2 + offset.y;

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function handleConfirm() {
    if (!img) return;
    const k = OUT / VIEW;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, left * k, top * k, drawW * k, drawH * k);
    onConfirm(canvas.toDataURL("image/png"));
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-xs rounded-2xl border p-5 space-y-4 overflow-y-auto shadow-2xl"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-foreground">Ajuste a logo</p>
        <p className="text-xs text-muted -mt-2">Arraste para posicionar e use o zoom.</p>

        {/* Quadro de edição */}
        <div
          className="relative mx-auto touch-none overflow-hidden rounded-2xl border border-line"
          style={{ width: VIEW, height: VIEW, background: "rgba(255,255,255,0.04)", cursor: "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img.src}
              alt="Ajuste"
              draggable={false}
              style={{
                position: "absolute",
                left,
                top,
                width: drawW,
                height: drawH,
                maxWidth: "none",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}
          {/* Guias da margem */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" }} />
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-2">
          <ZoomIn size={15} className="shrink-0 text-muted" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-brand"
          />
        </div>

        <div className="flex gap-2 pt-3" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!img}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-text)" }}
          >
            Salvar logo
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2.5 text-sm transition"
            style={{ border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Uploader ─────────────────────────────────────────────────────────────────

export function LogoUploader({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [fileParaAjustar, setFileParaAjustar] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setErro(null);
    setFileParaAjustar(file);
  }

  const handleConfirmCrop = useCallback((dataUrl: string) => {
    setFileParaAjustar(null);
    startTransition(async () => {
      try {
        const res = await salvarLogoAcademia(dataUrl);
        setLogoUrl(res.logoUrl);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível salvar a logo.");
      }
    });
  }, []);

  function handleRemover() {
    setErro(null);
    startTransition(async () => {
      try {
        await removerLogoAcademia();
        setLogoUrl(null);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível remover a logo.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white/4 p-6 backdrop-blur space-y-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent"><ImageIcon size={18} /></span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/80">Identidade</p>
          <h2 className="mt-0.5 text-base font-semibold text-foreground">Logo da academia</h2>
          <p className="text-xs text-muted mt-0.5">
            Aparece no painel (menu lateral) e no formulário PAR-Q. Ao enviar, você ajusta o enquadramento. PNG com fundo transparente fica melhor.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* Preview */}
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo da academia" className="h-full w-full object-contain p-2" />
          ) : (
            <ImageIcon size={26} className="text-muted" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            id="logo-input"
            onChange={handleFile}
          />
          <div className="flex items-center gap-2">
            <label
              htmlFor="logo-input"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-foreground transition hover:bg-white/5"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {logoUrl ? "Trocar logo" : "Enviar logo"}
            </label>
            {logoUrl && !pending && (
              <button
                type="button"
                onClick={handleRemover}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-muted transition hover:text-red-400"
              >
                <Trash2 size={14} />
                Remover
              </button>
            )}
          </div>
          <p className="text-xs text-muted">PNG, JPG ou WebP · até 2 MB</p>
        </div>
      </div>

      {erro && <p className="text-xs text-red-400">{erro}</p>}

      {fileParaAjustar && (
        <CropModal
          file={fileParaAjustar}
          onCancel={() => setFileParaAjustar(null)}
          onConfirm={handleConfirmCrop}
        />
      )}
    </div>
  );
}

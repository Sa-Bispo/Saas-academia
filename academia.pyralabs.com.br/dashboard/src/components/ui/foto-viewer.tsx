"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  /** classes aplicadas à miniatura (avatar) */
  className?: string;
};

/**
 * Miniatura de foto que abre em tela cheia (lightbox) ao clicar.
 * Usada no detalhe do aluno e no modal da ficha PAR-Q.
 */
export function FotoViewer({ src, alt, className }: Props) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={() => setAberto(true)}
        style={{ cursor: "zoom-in" }}
      />

      {aberto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAberto(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: "default" }}
          />
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}

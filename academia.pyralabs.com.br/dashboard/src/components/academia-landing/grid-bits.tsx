"use client";

// Peças do "esqueleto" de linhas finas da landing (vindas do values grid do 21st.dev):
// a cruzinha das junções e a luz verde que segue o mouse dentro de um card.
import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";

// Cruzinha das junções da grade (do "values grid")
export function Cruz({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 13 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      className={`pointer-events-none absolute z-30 size-3 -translate-x-1/2 -translate-y-1/2 text-[var(--text-tertiary)] ${className}`}
    >
      <path d="M6.5 1.5v10M1.5 6.5h10" strokeLinecap="round" />
    </svg>
  );
}

// Luz verde que segue o mouse dentro do card (só aparece no hover)
export function Luz() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const card = el?.parentElement;
    if (!el || !card) return;
    const mover = (e: MouseEvent) => {
      const r = card.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    card.addEventListener("mousemove", mover);
    return () => card.removeEventListener("mousemove", mover);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
      style={{
        background:
          "radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), rgba(37,211,102,0.08), transparent 80%)",
      }}
    />
  );
}

// Cabeçalho padrão das seções: número verde em mono + rótulo, título e (opcional) texto
// à direita no desktop. Entra com um fade-up curto quando aparece no scroll.
export function SecaoTitulo({
  n,
  rotulo,
  titulo,
  texto,
}: {
  n: string;
  rotulo: string;
  titulo: ReactNode;
  texto?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10 grid gap-4 sm:mb-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12"
    >
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          <span className="text-[var(--wpp)]">{n}</span> / {rotulo}
        </p>
        <h2 className="font-display mt-3 text-balance text-3xl font-bold uppercase tracking-tight sm:text-[40px] lg:text-[44px] lg:leading-[1.05]">
          {titulo}
        </h2>
      </div>
      {texto ? (
        <p className="max-w-lg text-balance text-[var(--text-secondary)] lg:justify-self-end lg:pb-1.5">{texto}</p>
      ) : null}
    </motion.div>
  );
}

// Divisória entre seções: linha fina na largura do conteúdo, com "+" nas pontas
export function Divisor() {
  return (
    <div aria-hidden className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="relative h-px bg-[var(--border-strong)]">
        <Cruz className="left-0 top-0" />
        <Cruz className="left-full top-0" />
      </div>
    </div>
  );
}

// Trilhos: duas linhas verticais nas bordas do conteúdo, descendo do fim do hero até o
// rodapé (o -bottom-3 cobre o respiro do topo do rodapé e encosta na moldura dele). As divisórias cruzam esses trilhos, então cada "+" fica numa junção real.
export function Trilhos({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -bottom-3 z-0">
        <div className="mx-auto h-full max-w-7xl px-5 sm:px-8">
          <div className="h-full border-x border-[var(--border)]" />
        </div>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}


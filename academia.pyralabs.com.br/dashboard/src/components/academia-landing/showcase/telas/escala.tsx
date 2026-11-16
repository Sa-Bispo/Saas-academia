"use client";

// Réplicas das telas do painel: desenhadas no tamanho real do sistema (largura fixa) e
// reduzidas por escala pra caber na moldura. Texto e ícones continuam vetoriais, nítidos
// em qualquer tela. A classe `dark` aplica os tokens do tema escuro do painel
// (globals.css), então o markup é copiado do componente original quase sem mudança.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function Escala({
  largura,
  alturaMax,
  children,
  className = "",
}: {
  largura: number;
  // corta a tela nessa altura (px no tamanho real), como o recorte de um print
  alturaMax?: number;
  children: ReactNode;
  className?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [altura, setAltura] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const medir = () => {
      const w = caixa.current?.clientWidth ?? largura;
      const s = w / largura;
      setEscala(s);
      const h = tela.current?.offsetHeight ?? 0;
      setAltura((alturaMax ? Math.min(h, alturaMax) : h) * s);
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (caixa.current) ro.observe(caixa.current);
    if (tela.current) ro.observe(tela.current);
    return () => ro.disconnect();
  }, [largura, alturaMax]);

  return (
    <div ref={caixa} className={`relative w-full overflow-hidden ${className}`} style={{ height: altura }}>
      <div
        ref={tela}
        aria-hidden
        inert
        className="dark pointer-events-none absolute left-0 top-0 origin-top-left select-none bg-background font-sans text-foreground"
        style={{ width: largura, transform: `scale(${escala})` }}
      >
        {children}
      </div>
    </div>
  );
}

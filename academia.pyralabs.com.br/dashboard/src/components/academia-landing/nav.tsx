"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./button";
import { Logo } from "./logo";
import { nav, whatsappLink } from "@/components/academia-landing/site";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [ativa, setAtiva] = useState("");
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const ids = nav.map((i) => i.href.slice(1));
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgresso(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      // seção ativa = a última cujo topo já passou de 40% da tela
      const linha = window.innerHeight * 0.4;
      let atual = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= linha) atual = id;
      }
      setAtiva(atual);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "nav-glass border-b border-[var(--border)]" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-[16px] font-bold uppercase tracking-tight">
            PyraLabs
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={ativa === item.href.slice(1) ? "true" : undefined}
              className={`relative rounded-lg px-3 py-2 text-sm transition-colors hover:text-[var(--text-primary)] ${
                ativa === item.href.slice(1) ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {ativa === item.href.slice(1) && (
                <span className="absolute left-1/2 top-full h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--wpp)]" />
              )}
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="md" href="/login">
            Entrar
          </Button>
          <Button variant="secondary" size="md" href={whatsappLink()} external>
            Falar com a gente
          </Button>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden"
          aria-label="Menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* progresso do scroll, na linha de baixo da nav */}
      <div
        aria-hidden
        className="absolute inset-x-0 -bottom-px h-px origin-left bg-[var(--wpp)]/70 transition-opacity duration-300"
        style={{ transform: `scaleX(${progresso})`, opacity: scrolled ? 1 : 0 }}
      />

      {open && (
        <div className="nav-glass border-b border-[var(--border)] md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-4">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button variant="secondary" size="md" href="/login">
                Entrar
              </Button>
              <Button variant="wpp" size="md" href={whatsappLink()} external>
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

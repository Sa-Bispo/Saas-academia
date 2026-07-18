"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "./button";
import { Logo } from "./logo";
import { nav, whatsappLink } from "@/lib/site";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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
              className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="md" href="https://pyralabs.com.br" external>
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
              <Button variant="secondary" size="md" href="https://pyralabs.com.br" external>
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

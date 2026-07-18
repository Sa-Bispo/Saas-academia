"use client";

import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";

const deliverySolutions = [
  {
    icon: "🍺",
    title: "Adega de bairro",
    description: "Cardápio e combos no WhatsApp",
    href: "/#adega",
  },
  {
    icon: "🥪",
    title: "Lanchonete",
    description: "Atendimento rápido no rush",
    href: "/#lanchonete",
  },
  {
    icon: "🍕",
    title: "Pizzaria",
    description: "Fluxo guiado de pedido",
    href: "/#pizzaria",
  },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-white sm:text-lg"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand/30 bg-brand/10 text-sm text-brand">
            P
          </span>
          Pyra Labs
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setIsSolutionsOpen(true)}
            onMouseLeave={() => setIsSolutionsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsSolutionsOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-white"
              aria-expanded={isSolutionsOpen}
              aria-haspopup="menu"
            >
              Soluções
              <ChevronDown
                size={15}
                className={`transition ${isSolutionsOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div
              className={`absolute left-1/2 top-full z-50 w-[340px] -translate-x-1/2 pt-3 transition duration-200 ${
                isSolutionsOpen
                  ? "pointer-events-auto visible opacity-100"
                  : "pointer-events-none invisible opacity-0"
              }`}
            >
              <div className="rounded-2xl border border-white/12 bg-[linear-gradient(155deg,rgba(9,17,26,0.96),rgba(19,34,53,0.94))] p-2 shadow-2xl">
                <div className="pointer-events-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Para delivery
                  </p>
                </div>

                <div className="ml-3 mt-1 space-y-1 border-l border-white/12 pl-3">
                  {deliverySolutions.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSolutionsOpen(false)}
                      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/7"
                    >
                      <span className="pt-0.5 text-lg">{item.icon}</span>
                      <span>
                        <span className="block text-sm font-semibold text-white">{item.title}</span>
                        <span className="block text-xs text-muted">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="my-2 h-px bg-white/10" />

                <div
                  aria-disabled="true"
                  className="pointer-events-none rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-muted/80 opacity-50"
                >
                  <span className="mr-2">🏥</span>
                  Clínicas e Serviços <span className="text-xs text-amber-300/80">(em breve)</span>
                </div>
                <div
                  aria-disabled="true"
                  className="pointer-events-none mt-1 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-muted/80 opacity-50"
                >
                  <span className="mr-2">🏢</span>
                  Empresas <span className="text-xs text-amber-300/80">(em breve)</span>
                </div>
              </div>
            </div>
          </div>

          <a href="/#precos" className="text-sm font-medium text-muted transition hover:text-white">
            Preços
          </a>
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/login?force=1"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Entrar
          </Link>
          <Link
            href="/test-drive"
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-brand-strong"
          >
            Fazer Test-Drive
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menu"
          className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-white transition hover:bg-white/10 sm:hidden"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-white/10 bg-[linear-gradient(155deg,rgba(9,17,26,0.98),rgba(15,29,42,0.97))] px-4 pb-4 pt-3 sm:hidden">
          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Soluções</p>
            <p className="pointer-events-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              Para delivery
            </p>
            <div className="ml-2 space-y-1 border-l border-white/12 pl-3">
              {deliverySolutions.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white transition hover:bg-white/10"
                >
                  <span>{item.icon}</span>
                  <span>{item.title}</span>
                </Link>
              ))}
            </div>

            <div className="my-2 h-px bg-white/10" />

            <p
              aria-disabled="true"
              className="pointer-events-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-muted/90 opacity-50"
            >
              🏥 Clínicas e Serviços (em breve)
            </p>
            <p
              aria-disabled="true"
              className="pointer-events-none rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-muted/90 opacity-50"
            >
              🏢 Empresas (em breve)
            </p>
          </div>

          <div className="mt-4">
            <a
              href="/#precos"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-center text-sm font-medium text-white"
            >
              Preços
            </a>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/login?force=1"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-center text-sm font-medium text-white"
            >
              Entrar
            </Link>
            <Link
              href="/test-drive"
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-xl bg-brand px-3 py-2 text-center text-sm font-semibold text-slate-950"
            >
              Test-Drive
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

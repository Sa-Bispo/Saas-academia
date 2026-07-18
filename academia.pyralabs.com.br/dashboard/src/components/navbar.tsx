"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-line bg-black/10 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          WhatsApp SaaS
        </Link>

        <nav className="flex items-center gap-3">
          <a href="#recursos" className="hidden text-sm text-muted transition hover:text-white sm:inline-flex">
            Recursos
          </a>
          <Link
            href="/login?force=1"
            className="rounded-xl border border-line bg-white/4 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/8"
          >
            Entrar
          </Link>
        </nav>
      </div>
    </header>
  );
}
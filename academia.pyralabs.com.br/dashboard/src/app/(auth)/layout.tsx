"use client";

import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo / nome da plataforma */}
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">
            Plataforma
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            WhatsApp SaaS
          </h1>
        </div>

        {/* Card de auth */}
        <div className="rounded-3xl border border-line bg-white/4 p-8 backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}

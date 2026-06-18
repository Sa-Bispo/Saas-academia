"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  Bot,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Users,
  Wallet,
  X,
  Shield,
  Zap,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { FeatureGate } from "@/components/ui/feature-gate";
import type { SubNicho } from "@/lib/nicho";
import { ProfilePopover } from "@/components/ui/profile-popover";

type SidebarNichoProps = {
  subNicho: SubNicho;
  tenantName: string;
  planName: string;
  botAtivo: boolean;
  suporteNaoLidas?: number;
  userEmail?: string;
  userName?: string;
};

type LinkItem = {
  href: string;
  label: string;
  icon?: React.ElementType;
};

const OPERATIONAL_LINKS: LinkItem[] = [
  { href: "/dashboard/academia", label: "Visão geral", icon: LayoutDashboard },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/frequencia", label: "Frequência", icon: Activity },
  { href: "/cobrancas", label: "Cobranças", icon: Wallet },
  { href: "/planos-academia", label: "Planos", icon: Dumbbell },
];

const SETTINGS_LINKS: LinkItem[] = [
  { href: "/bot", label: "Bot", icon: Bot },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/plano-e-uso", label: "Plano e Uso", icon: CreditCard },
];

export function SidebarNicho({
  tenantName,
  planName,
  subNicho,
  botAtivo,
  userEmail,
  userName,
}: SidebarNichoProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const isAdmin =
    Boolean(userEmail) &&
    Boolean(process.env.NEXT_PUBLIC_ADMIN_EMAIL) &&
    userEmail === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  function isLinkActive(item: LinkItem) {
    if (item.href === "/dashboard/academia") return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login?force=1";
    } finally {
      setIsSigningOut(false);
    }
  }

  const navContent = (
    <>
      <ProfilePopover
        user={{ name: userName, email: userEmail }}
        tenant={{ name: tenantName, subNicho, plano: planName }}
        onSignOut={handleSignOut}
        profileHref="/configuracoes"
      />

      <nav className="flex-1 px-2 py-3">
        <SectionLabel label="Operacional" />

        {OPERATIONAL_LINKS.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isLinkActive(item)}
            icon={item.icon ? <item.icon size={15} /> : undefined}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}

        <SectionLabel label="Configurações" className="pt-4" />

        {SETTINGS_LINKS.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={isLinkActive(item)}
            icon={item.icon ? <item.icon size={15} /> : undefined}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}

        {isAdmin ? (
          <SidebarLink
            href="/admin"
            label="Painel admin"
            active={pathname.startsWith("/admin")}
            icon={<Shield size={15} />}
            onNavigate={() => setMobileOpen(false)}
          />
        ) : null}
      </nav>

      <div
        style={{
          padding: "12px 14px",
          borderTop: "0.5px solid var(--sidebar-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: botAtivo ? "#1D9E75" : "#ef4444",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "12px", color: "var(--sidebar-text-muted)" }}>
            {isSigningOut ? "Saindo..." : botAtivo ? "Bot ativo" : "Bot desconectado"}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/20">
            <Zap size={13} className="text-brand" />
          </div>
          <span className="max-w-[140px] truncate text-sm font-semibold" style={{ color: "var(--sidebar-text)" }}>
            {tenantName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="rounded-lg p-1.5 text-muted transition hover:text-foreground"
          style={{ background: "var(--bg-secondary)" }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col border-r"
            style={{
              background: "var(--sidebar-bg)",
              borderColor: "var(--sidebar-border)",
              borderRightStyle: "solid",
              borderRightWidth: "0.5px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}

      <aside
        className="hidden lg:flex lg:min-h-screen lg:flex-col border-r"
        style={{
          width: "220px",
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
          borderRightStyle: "solid",
          borderRightWidth: "0.5px",
          flexShrink: 0,
        }}
      >
        {navContent}
      </aside>
    </>
  );
}

function SectionLabel({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={className}
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.6px",
        textTransform: "uppercase",
        color: "var(--sidebar-text-muted)",
        padding: "8px 8px 4px",
      }}
    >
      {label}
    </div>
  );
}

function SidebarLink({
  href,
  label,
  active,
  icon,
  small,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  icon?: React.ReactNode;
  small?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      onClick={onNavigate}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: small ? "6px 10px" : "8px 10px",
        borderRadius: "var(--border-radius-md, 10px)",
        background: active ? "var(--sidebar-active-bg)" : "transparent",
        color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
        fontSize: small ? "12px" : "13px",
        fontWeight: active ? 600 : 400,
        textDecoration: "none",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(event) => {
        if (!active) event.currentTarget.style.background = "var(--bg-secondary)";
      }}
      onMouseLeave={(event) => {
        if (!active) event.currentTarget.style.background = "transparent";
      }}
    >
      {icon ? <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span> : null}
      {label}
    </Link>
  );
}

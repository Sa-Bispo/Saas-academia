"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Bot,
  ClipboardList,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Settings,
  UserCheck,
  Users,
  Wallet,
  X,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { ProfilePopover } from "@/components/ui/profile-popover";
import { useNotificacoes } from "@/hooks/use-notificacoes";
import { getWhatsAppConnectionFlag } from "@/actions/whatsapp.actions";
import { ROTA_MODULO, type ModuloChave } from "@/lib/modulos";

type SidebarNichoProps = {
  tenantId?: string;
  tenantName: string;
  planName: string;
  botAtivo: boolean;
  suporteNaoLidas?: number;
  userEmail?: string;
  userName?: string;
  subNicho?: string;
  modulosAtivos?: ModuloChave[];
};

const BOT_STATUS_POLL_INTERVAL_MS = 10000;

type LinkItem = {
  href: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
};

// Todos os links operacionais — filtrados dinamicamente por modulosAtivos
const ALL_OPERATIONAL_LINKS: LinkItem[] = [
  { href: "/dashboard/academia", label: "Visão geral", icon: LayoutDashboard },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/funcionarios", label: "Funcionários", icon: UserCheck },
  { href: "/frequencia", label: "Frequência", icon: Activity },
  { href: "/cobrancas", label: "Cobranças", icon: Wallet },
  { href: "/planos-academia", label: "Planos", icon: Dumbbell },
  { href: "/parq-config", label: "PAR-Q", icon: ClipboardList },
];

const SETTINGS_LINKS: LinkItem[] = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/bot", label: "Bot", icon: Bot },
];

export function SidebarNicho({
  tenantId,
  tenantName,
  planName,
  botAtivo,
  userEmail,
  userName,
  subNicho,
  modulosAtivos,
}: SidebarNichoProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [botAtivoLive, setBotAtivoLive] = useState(botAtivo);
  const notificacoes = useNotificacoes();

  // Mantém o indicador de bot no rodapé em sincronia mesmo sem navegar
  // entre páginas (ex: usuário conecta o WhatsApp em outra aba).
  useEffect(() => {
    setBotAtivoLive(botAtivo);
  }, [botAtivo]);

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const connected = await getWhatsAppConnectionFlag(tenantId);
        if (!cancelled) setBotAtivoLive(connected);
      } catch {
        // Ignora falhas pontuais de rede durante o polling em segundo plano.
      }
    }, BOT_STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tenantId]);

  const isAcademia = subNicho === "academia";

  function isModuloVisivel(href: string): boolean {
    // Se modulosAtivos não foi fornecido (fallback), mostrar tudo
    if (!modulosAtivos) return true;
    const modulo = ROTA_MODULO[href];
    if (!modulo) return true;
    return modulosAtivos.includes(modulo);
  }

  const operationalLinks: LinkItem[] = ALL_OPERATIONAL_LINKS.filter((l) =>
    isModuloVisivel(l.href),
  ).map((l) => {
    if (l.href === "/cobrancas" && notificacoes.comprovantes > 0)
      return { ...l, badge: notificacoes.comprovantes };
    if (l.href === "/parq-config" && notificacoes.parqNovas > 0)
      return { ...l, badge: notificacoes.parqNovas };
    return l;
  });

  const settingsLinks = SETTINGS_LINKS.filter((l) => {
    if (l.href === "/bot" && isAcademia) return false;
    return isModuloVisivel(l.href);
  });

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
    <div className="flex h-full flex-col">
      {/* ── Brand ── */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <Zap size={15} style={{ color: "var(--text-secondary)" }} />
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-[13px] font-semibold leading-tight"
            style={{ color: "var(--sidebar-text)" }}
          >
            {tenantName}
          </p>
          <p
            className="text-[10px] font-medium mt-0.5"
            style={{ color: "var(--accent)", opacity: 0.85 }}
          >
            {planName}
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavGroup label="Principal">
          {operationalLinks.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              active={isLinkActive(item)}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </NavGroup>

        <NavGroup label="Configurações" className="mt-5">
          {settingsLinks.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={item.badge}
              active={isLinkActive(item)}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </NavGroup>

        {isAdmin && (
          <NavGroup label="Admin" className="mt-5">
            <NavItem
              href="/admin"
              label="Painel admin"
              icon={Shield}
              active={pathname === "/admin"}
              onNavigate={() => setMobileOpen(false)}
            />
            <NavItem
              href="/admin/bot-corrections"
              label="Correções do bot"
              icon={Zap}
              active={pathname.startsWith("/admin/bot-corrections")}
              onNavigate={() => setMobileOpen(false)}
            />
          </NavGroup>
        )}
      </nav>

      {/* ── Footer: bot status + profile ── */}
      <div style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        {/* Bot status */}
        <div className="flex items-center gap-2 px-4 py-3">
          <span
            className="relative flex h-2 w-2 shrink-0"
          >
            {botAtivoLive && (
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: "var(--accent)" }}
              />
            )}
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: botAtivoLive ? "var(--accent)" : "#ef4444" }}
            />
          </span>
          <span className="text-xs" style={{ color: "var(--sidebar-text-muted)" }}>
            {isSigningOut ? "Saindo..." : botAtivoLive ? "Bot conectado" : "Bot desconectado"}
          </span>
        </div>

        {/* Profile */}
        <div className="px-2 pb-3">
          <ProfilePopover
            user={{ name: userName, email: userEmail }}
            tenant={{ name: tenantName, plano: planName }}
            onSignOut={handleSignOut}
            profileHref="/configuracoes"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div
        className="sidebar-mobile-bar items-center justify-between px-4 py-3"
        style={{
          background: "var(--sidebar-bg)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "var(--bg-secondary)" }}
          >
            <Zap size={13} style={{ color: "var(--accent)" }} />
          </div>
          <span
            className="max-w-[160px] truncate text-sm font-semibold"
            style={{ color: "var(--sidebar-text)" }}
          >
            {tenantName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 transition-colors"
          style={{
            color: "var(--sidebar-text-muted)",
            background: "var(--bg-secondary)",
          }}
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="absolute left-0 top-0 h-full w-64"
              onClick={(e) => e.stopPropagation()}
            >
              <aside
                className="flex h-full flex-col"
                style={{
                  background: "var(--sidebar-bg)",
                  borderRight: "1px solid var(--sidebar-border)",
                }}
              >
                {navContent}
              </aside>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar ── */}
      <aside
        className="sidebar-desktop"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {navContent}
      </aside>
    </>
  );
}

// ── NavGroup ──────────────────────────────────────────────────────────────────

function NavGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "var(--sidebar-text-muted)" }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  badge,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: React.ElementType;
  badge?: number;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="relative"
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
          style={{ background: "var(--sidebar-active-text)" }}
        />
      )}
      <Link
        href={href}
        prefetch
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-lg pl-3 pr-2.5 py-[7px] text-[13px] transition-colors duration-150"
        style={{
          background: active ? "var(--sidebar-active-bg)" : "transparent",
          color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
          fontWeight: active ? 600 : 400,
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        {Icon && (
          <Icon
            size={15}
            style={{
              color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text-muted)",
              flexShrink: 0,
            }}
          />
        )}
        <span className="flex-1 truncate">{label}</span>
        {badge && badge > 0 ? (
          <span
            className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none text-white"
            style={{ background: "#ef4444" }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : active ? (
          <ChevronRight
            size={11}
            style={{ color: "var(--sidebar-active-text)", opacity: 0.5 }}
          />
        ) : null}
      </Link>
    </motion.div>
  );
}

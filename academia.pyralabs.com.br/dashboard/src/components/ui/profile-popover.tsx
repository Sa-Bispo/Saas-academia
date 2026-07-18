"use client";

import { useEffect, useRef, useState } from "react";
import { Moon, SunMedium, UserRound, LogOut, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

type ProfilePopoverProps = {
  user: {
    name?: string | null;
    email?: string | null;
  };
  tenant: {
    name: string;
    plano: string;
  };
  onSignOut: () => Promise<void> | void;
  profileHref?: string;
};

export function ProfilePopover({
  user,
  tenant,
  onSignOut,
  profileHref = "/configuracoes",
}: ProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initialsSource = user.name?.trim() || user.email?.trim() || tenant.name;
  const initials = initialsSource
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          borderBottom: "0.5px solid var(--sidebar-border)",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "var(--sidebar-active-bg)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--sidebar-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {tenant.name}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--sidebar-text-muted)",
            }}
          >
            {tenant.plano}
          </div>
        </div>

        <ChevronDown
          size={14}
          style={{
            color: "var(--sidebar-text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "10px",
            right: "10px",
            background: "var(--card-bg)",
            border: "0.5px solid var(--card-border)",
            borderRadius: "var(--border-radius-lg, 14px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "0.5px solid var(--border-color)",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {user.name || tenant.name || "Usuário"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
              {user.email || ""}
            </div>
          </div>

          <div style={{ padding: "6px" }}>
            <PopoverItem
              icon={<UserRound size={14} />}
              label="Editar perfil"
              onClick={() => {
                setOpen(false);
                window.location.href = profileHref;
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: "var(--border-radius-md, 10px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                {isDark ? <SunMedium size={14} /> : <Moon size={14} />}
                {isDark ? "Tema claro" : "Tema escuro"}
              </div>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                style={{
                  width: "36px",
                  height: "20px",
                  borderRadius: "10px",
                  background: isDark ? "var(--accent)" : "var(--border-strong)",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  border: "none",
                  padding: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "#fff",
                    top: "2px",
                    left: isDark ? "18px" : "2px",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          </div>

          <div style={{ borderTop: "0.5px solid var(--border-color)", padding: "6px" }}>
            <PopoverItem
              icon={<LogOut size={14} />}
              label="Sair"
              danger
              onClick={() => {
                setOpen(false);
                void onSignOut();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PopoverItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 10px",
        borderRadius: "var(--border-radius-md, 10px)",
        border: "none",
        background: "transparent",
        color: danger ? "var(--danger-text)" : "var(--text-secondary)",
        fontSize: "13px",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.15s",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = danger ? "var(--danger-bg)" : "var(--bg-secondary)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}

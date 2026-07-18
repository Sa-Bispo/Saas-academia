"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import {
  disconnectWhatsApp,
  getWhatsAppQRCode,
  getWhatsAppStatus,
  reconnectWhatsApp,
  type WhatsAppQrCodeResponse,
  type WhatsAppStatus,
} from "@/actions/whatsapp.actions";

type Props = {
  tenantId: string;
  status: WhatsAppStatus;
};

const QR_POLL_INTERVAL_MS = 5000;
const STATUS_POLL_INTERVAL_MS = 8000;

export function WhatsAppClient({ tenantId, status }: Props) {
  const [state, setState] = useState<WhatsAppStatus>(status);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const isOnline = state.connected;

  // Enquanto aguarda o escaneamento, verifica em segundo plano se o QR Code
  // mudou (a Evolution API o renova periodicamente) ou se a conexão foi concluída.
  useEffect(() => {
    if (!tenantId || isOnline || !qrCode) return;

    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const response: WhatsAppQrCodeResponse = await getWhatsAppQRCode(tenantId);
        if (cancelled || !response.success) return;

        if (response.status === "CONNECTED") {
          setQrCode(null);
          setState((prev) => ({ ...prev, connected: true }));
          setFeedback("Número conectado com sucesso!");
          return;
        }

        if (response.qrCode && response.qrCode !== qrCode) {
          setQrCode(response.qrCode);
        }
      } catch {
        // Ignora falhas pontuais de rede durante o polling em segundo plano.
      }
    }, QR_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tenantId, isOnline, qrCode]);

  // Quando não há QR Code em exibição, ainda assim verifica periodicamente
  // se o status mudou (ex: conexão feita por outra aba/dispositivo).
  useEffect(() => {
    if (!tenantId || isOnline || qrCode) return;

    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const freshStatus = await getWhatsAppStatus(tenantId);
        if (cancelled) return;
        setState(freshStatus);
      } catch {
        // Ignora falhas pontuais de rede durante o polling em segundo plano.
      }
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tenantId, isOnline, qrCode]);

  // Enquanto conectado, verifica periodicamente se a instância caiu
  // (ex: número deslogado direto pelo celular).
  useEffect(() => {
    if (!tenantId || !isOnline) return;

    let cancelled = false;

    const interval = setInterval(async () => {
      try {
        const freshStatus = await getWhatsAppStatus(tenantId);
        if (cancelled) return;
        if (!freshStatus.connected) {
          setFeedback("Número desconectado.");
        }
        setState(freshStatus);
      } catch {
        // Ignora falhas pontuais de rede durante o polling em segundo plano.
      }
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tenantId, isOnline]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "860px",
        margin: "0 auto",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <div
        style={{
          borderRadius: "18px",
          border: "0.5px solid color-mix(in srgb, var(--accent) 35%, var(--border-color))",
          background:
            "linear-gradient(120deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--info-text) 14%, transparent))",
          padding: "18px 20px",
        }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
          WhatsApp
        </h1>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px" }}>
          {isOnline
            ? "Gerencie a conexão do bot com seu número"
            : "Conecte seu número para ativar o bot"}
        </p>
      </div>

      {feedback ? (
        <div
          style={{
            borderRadius: "12px",
            border: "0.5px solid var(--border-color)",
            background: "var(--bg-secondary)",
            padding: "10px 12px",
            fontSize: "12px",
            color: "var(--text-secondary)",
          }}
        >
          {feedback}
        </div>
      ) : null}

      <div
        style={{
          background: "var(--card-bg)",
          border: "0.5px solid var(--card-border)",
          borderRadius: "20px",
          boxShadow: "var(--card-shadow)",
          overflow: "hidden",
        }}
      >
        {isOnline ? (
          <EstadoConectado
            status={state}
            busy={isPending}
            onDisconnect={() => {
              setFeedback(null);
              startTransition(async () => {
                const response = await disconnectWhatsApp(tenantId);
                if (!response.success) {
                  setFeedback(response.error || "Não foi possível desconectar.");
                  return;
                }

                setQrCode(null);
                setState((prev) => ({
                  ...prev,
                  connected: false,
                  connectedAt: null,
                }));
                setFeedback("Número desconectado.");
              });
            }}
            onReconnect={() => {
              setFeedback(null);
              setLoadingQr(true);
              startTransition(async () => {
                try {
                  const response: WhatsAppQrCodeResponse = await reconnectWhatsApp(tenantId);
                  if (!response.success) {
                    setFeedback(response.error || "Erro ao reconectar.");
                    return;
                  }

                  if (response.status === "CONNECTED") {
                    setQrCode(null);
                    setState((prev) => ({ ...prev, connected: true }));
                    setFeedback("Instância já está conectada. Nenhum QR Code é necessário.");
                    return;
                  }

                  setQrCode(response.qrCode ?? null);
                  setState((prev) => ({ ...prev, connected: false, connectedAt: null }));
                  setFeedback("Novo QR Code gerado para reconectar.");
                } catch (error) {
                  setFeedback(error instanceof Error ? error.message : "Erro ao reconectar.");
                } finally {
                  setLoadingQr(false);
                }
              });
            }}
          />
        ) : (
          <EstadoDesconectado
            qrCode={qrCode}
            loading={loadingQr || isPending}
            onGerarQR={async () => {
              setFeedback(null);
              setLoadingQr(true);
              try {
                const response: WhatsAppQrCodeResponse = await getWhatsAppQRCode(tenantId);
                if (!response.success) {
                  setFeedback(response.error || "Erro ao gerar QR Code.");
                  return;
                }

                if (response.status === "CONNECTED") {
                  setQrCode(null);
                  setState((prev) => ({ ...prev, connected: true }));
                  setFeedback("Instância já está conectada. Nenhum QR Code é necessário.");
                  return;
                }

                setQrCode(response.qrCode ?? null);
              } catch (error) {
                setFeedback(error instanceof Error ? error.message : "Erro ao gerar QR Code.");
              } finally {
                setLoadingQr(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EstadoConectado({
  status,
  busy,
  onDisconnect,
  onReconnect,
}: {
  status: WhatsAppStatus;
  busy: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
}) {
  const metrics = useMemo(
    () => [
      { label: "Número conectado", value: status.phoneNumber || "Não identificado" },
      {
        label: "Conectado desde",
        value: status.connectedAt ? formatDate(status.connectedAt) : "-",
      },
      { label: "Atendimentos hoje", value: `${status.pedidosHoje || 0} atendimentos`, highlight: true },
      { label: "Mensagens hoje", value: `${status.mensagensHoje || 0} mensagens` },
    ],
    [status.connectedAt, status.mensagensHoje, status.pedidosHoje, status.phoneNumber],
  );

  return (
    <>
      <div
        style={{
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "0.5px solid var(--border-color)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(29,158,117,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              letterSpacing: "-0.015em",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#1D9E75",
                display: "inline-block",
                animation: "pulse 2s infinite",
              }}
            />
            Bot ativo e respondendo
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Número conectado · {status.tenantName}
          </div>
        </div>
        <span
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "rgba(29,158,117,0.1)",
            color: "#0f6e56",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          Online
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1px",
          background: "var(--border-color)",
          borderBottom: "0.5px solid var(--border-color)",
        }}
      >
        {metrics.map((item, i) => (
          <div
            key={i}
            style={{
              padding: "15px 20px",
              background: "var(--card-bg)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px" }}>{item.label}</div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: item.highlight ? "#1D9E75" : "var(--text-primary)",
                lineHeight: "1.25",
              }}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          gap: "8px",
          borderBottom: "0.5px solid var(--border-color)",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onDisconnect}
          disabled={busy}
          style={{
            padding: "10px 18px",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.06)",
            color: "#991b1b",
            fontSize: "13px",
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Desconectar número
        </button>
        <button
          onClick={onReconnect}
          disabled={busy}
          style={{
            padding: "10px 18px",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--border-color)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Reconectar
        </button>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", gap: "12px" }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "var(--border-radius-md)",
            background: "var(--warning-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning-text)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "4px",
            }}
          >
            Use o WhatsApp Business para a academia
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            Mantenha o número conectado para que o bot atenda os alunos automaticamente. Configure modalidades e
            horários na página Bot para que as respostas sejam sempre precisas.
          </div>
        </div>
      </div>
    </>
  );
}

function EstadoDesconectado({
  qrCode,
  loading,
  onGerarQR,
}: {
  qrCode: string | null;
  loading: boolean;
  onGerarQR: () => Promise<void>;
}) {
  return (
    <>
      <div
        style={{
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          borderBottom: "0.5px solid var(--border-color)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(239,68,68,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
            Bot desconectado
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Escaneie o QR Code para ativar
          </div>
        </div>
        <span
          style={{
            fontSize: "11px",
            padding: "4px 10px",
            borderRadius: "20px",
            background: "rgba(239,68,68,0.1)",
            color: "#991b1b",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          Offline
        </span>
      </div>

      <div
        style={{
          padding: "24px 20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          borderBottom: "0.5px solid var(--border-color)",
        }}
      >
        <div
          style={{
            width: "214px",
            height: "214px",
            background: "var(--bg-secondary)",
            borderRadius: "18px",
            border: "0.5px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {qrCode ? (
            <img src={qrCode} alt="QR Code WhatsApp" style={{ width: "188px", height: "188px" }} />
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px", padding: "20px" }}>
              Clique em "Gerar QR Code" abaixo
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "min(420px, 100%)",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
            Passo a passo para conectar
          </div>
          {[
            "Abra o WhatsApp Business no celular da sua loja",
            "Vá em Configurações → Aparelhos conectados",
            "Toque em Conectar aparelho e escaneie o QR acima",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", alignItems: "start", gap: "10px" }}>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "var(--info-bg)",
                  color: "var(--info-text)",
                  fontSize: "11px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>{text}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <button
          onClick={() => void onGerarQR()}
          disabled={loading}
          style={{
            padding: "11px 18px",
            borderRadius: "var(--border-radius-md)",
            border: "none",
            background: loading ? "var(--bg-secondary)" : "#1D9E75",
            color: loading ? "var(--text-tertiary)" : "white",
            fontSize: "14px",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
            width: "100%",
            maxWidth: "260px",
          }}
        >
          {loading ? "Gerando..." : qrCode ? "Gerar novo QR Code" : "Gerar QR Code"}
        </button>
      </div>
    </>
  );
}

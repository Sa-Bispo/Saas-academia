"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  atualizarStatus,
  enviarMensagem,
  marcarLidas,
  uploadImagemSuporteBase64,
} from "@/actions/suporte.actions";

type MensagemChamado = {
  id: string;
  autor: string;
  texto: string | null;
  imagem_url: string | null;
  lida: boolean;
  created_at: Date | string;
};

type Chamado = {
  id: string;
  tipo: string;
  titulo: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  mensagens: MensagemChamado[];
  tenant: {
    nome: string;
    plano: string;
    configNicho: unknown;
  };
};

const STATUS_LABEL = {
  ABERTO: "Aberto",
  ANDAMENTO: "Em andamento",
  RESOLVIDO: "Resolvido",
} as const;

const STATUS_COLOR = {
  ABERTO: { bg: "rgba(59,130,246,.16)", color: "#93c5fd" },
  ANDAMENTO: { bg: "rgba(245,158,11,.16)", color: "#fcd34d" },
  RESOLVIDO: { bg: "rgba(29,158,117,.16)", color: "#6ee7b7" },
} as const;

type ChamadoStatusKey = keyof typeof STATUS_LABEL;

function toStatusKey(status: string): ChamadoStatusKey {
  if (status === "ANDAMENTO") return "ANDAMENTO";
  if (status === "RESOLVIDO") return "RESOLVIDO";
  return "ABERTO";
}

function getTenantNicho(configNicho: unknown) {
  if (!configNicho || typeof configNicho !== "object" || Array.isArray(configNicho)) return "-";
  const config = configNicho as Record<string, unknown>;
  const sub = config.sub_nicho ?? config.subNicho;
  return typeof sub === "string" ? sub : "-";
}

export function AdminSuporteClient({ chamados }: { chamados: Chamado[] }) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [filtro, setFiltro] = useState<"todos" | "aberto" | "andamento" | "resolvido">("todos");
  const [texto, setTexto] = useState("");
  const [chamadoAtivoId, setChamadoAtivoId] = useState<string | null>(chamados[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();

  const chamadosFiltrados = useMemo(() => {
    if (filtro === "todos") return chamados;
    return chamados.filter((c) => c.status === filtro.toUpperCase());
  }, [chamados, filtro]);

  const chamadoAtivo = useMemo(
    () => chamados.find((c) => c.id === chamadoAtivoId) ?? chamadosFiltrados[0] ?? null,
    [chamados, chamadosFiltrados, chamadoAtivoId],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chamadoAtivo?.mensagens.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (!chamadoAtivo) return;

    startTransition(async () => {
      await marcarLidas(chamadoAtivo.id, "admin");
      router.refresh();
    });
  }, [chamadoAtivo?.id, router]);

  function handleEnviar() {
    if (!texto.trim() || !chamadoAtivo) return;

    const payload = texto;
    setTexto("");

    startTransition(async () => {
      await enviarMensagem({
        chamado_id: chamadoAtivo.id,
        autor: "admin",
        texto: payload,
      });
      router.refresh();
    });
  }

  function handleImagem(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file || !chamadoAtivo) return;

    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const imageUrl = await uploadImagemSuporteBase64(reader.result as string, file.name);
        await enviarMensagem({
          chamado_id: chamadoAtivo.id,
          autor: "admin",
          imagem_url: imageUrl,
        });
        router.refresh();
      });
    };

    reader.readAsDataURL(file);
  }

  function setStatus(status: "ABERTO" | "ANDAMENTO" | "RESOLVIDO") {
    if (!chamadoAtivo) return;
    startTransition(async () => {
      await atualizarStatus(chamadoAtivo.id, status);
      router.refresh();
    });
  }

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 48px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)" }}>Central de chamados</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Atendimento a lojistas com mensagens e imagens
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {(["todos", "aberto", "andamento", "resolvido"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFiltro(item)}
              style={{
                padding: "7px 12px",
                borderRadius: "999px",
                border: "0.5px solid var(--border-color)",
                background: filtro === item ? "rgba(29,158,117,.14)" : "var(--bg-secondary)",
                color: filtro === item ? "#4ade80" : "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {item === "todos"
                ? "Todos"
                : item === "aberto"
                  ? "Aberto"
                  : item === "andamento"
                    ? "Em andamento"
                    : "Resolvido"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          background: "var(--card-bg)",
          border: "0.5px solid var(--card-border)",
          borderRadius: "var(--border-radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--card-shadow)",
          minHeight: 0,
        }}
      >
        <div style={{ width: "320px", borderRight: "0.5px solid var(--border-color)", overflowY: "auto", flexShrink: 0 }}>
          {chamadosFiltrados.length === 0 && (
            <div style={{ padding: "24px", fontSize: "12px", color: "var(--text-tertiary)" }}>
              Nenhum chamado para o filtro selecionado.
            </div>
          )}

          {chamadosFiltrados.map((chamado) => {
            const statusKey = toStatusKey(chamado.status);
            const sc = STATUS_COLOR[statusKey];
            const naoLida = chamado.mensagens.some((m) => m.autor === "lojista" && !m.lida);
            const ultimaMsg = chamado.mensagens[chamado.mensagens.length - 1];
            const nicho = getTenantNicho(chamado.tenant.configNicho);

            return (
              <div
                key={chamado.id}
                onClick={() => setChamadoAtivoId(chamado.id)}
                style={{
                  padding: "12px 14px",
                  borderBottom: "0.5px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "background .15s",
                  background: chamadoAtivo?.id === chamado.id ? "rgba(29,158,117,.06)" : "transparent",
                  borderLeft: chamadoAtivo?.id === chamado.id ? "2px solid #1D9E75" : "2px solid transparent",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {chamado.tenant.nome}
                  </span>
                  {naoLida && (
                    <span style={{ fontSize: "10px", color: "white", background: "#ef4444", borderRadius: "999px", padding: "1px 6px", fontWeight: 700 }}>
                      {chamado.mensagens.filter((m) => m.autor === "lojista" && !m.lida).length}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "3px" }}>
                  {chamado.tenant.plano} · {nicho}
                </div>

                <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "6px", fontWeight: 500 }}>
                  {chamado.titulo}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", gap: "8px" }}>
                  <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "20px", fontWeight: 600, background: sc.bg, color: sc.color }}>
                    {STATUS_LABEL[statusKey]}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                    {new Date(chamado.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>

                {ultimaMsg && (
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ultimaMsg.texto || "📷 Imagem"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {chamadoAtivo ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-color)", background: "var(--bg-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                  {chamadoAtivo.tenant.nome} · {chamadoAtivo.titulo}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Aberto em {new Date(chamadoAtivo.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setStatus("ANDAMENTO")}
                  style={{ padding: "7px 10px", borderRadius: "8px", border: "0.5px solid #f59e0b", color: "#fcd34d", background: "rgba(245,158,11,.12)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Em andamento
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("RESOLVIDO")}
                  style={{ padding: "7px 10px", borderRadius: "8px", border: "0.5px solid #1D9E75", color: "#6ee7b7", background: "rgba(29,158,117,.12)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Marcar resolvido
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {chamadoAtivo.mensagens.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.autor === "admin" ? "flex-end" : "flex-start",
                    maxWidth: "72%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: msg.autor === "admin" ? "flex-end" : "flex-start",
                    gap: "3px",
                  }}
                >
                  {msg.texto && (
                    <div
                      style={{
                        padding: "9px 12px",
                        fontSize: "13px",
                        lineHeight: "1.5",
                        background: msg.autor === "admin" ? "#1D9E75" : "var(--bg-secondary)",
                        color: msg.autor === "admin" ? "white" : "var(--text-primary)",
                        border: msg.autor === "lojista" ? "0.5px solid var(--border-color)" : "none",
                        borderRadius: msg.autor === "admin" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                      }}
                    >
                      {msg.autor === "admin" && (
                        <div style={{ fontSize: "10px", color: "#d1fae5", fontWeight: 600, marginBottom: "3px" }}>
                          Suporte Pyra
                        </div>
                      )}
                      {msg.texto}
                    </div>
                  )}

                  {msg.imagem_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.imagem_url} alt="Anexo" style={{ maxWidth: "240px", borderRadius: "8px", border: "0.5px solid var(--border-color)" }} />
                  )}

                  <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {chamadoAtivo.status !== "RESOLVIDO" && (
              <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--border-color)", display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ cursor: "pointer", color: "var(--text-tertiary)", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagem} />
                </label>
                <input
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleEnviar();
                    }
                  }}
                  placeholder="Responder ao lojista..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px" }}
                />
                <button
                  onClick={handleEnviar}
                  disabled={isPending || !texto.trim()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "var(--border-radius-md)",
                    border: "none",
                    background: texto.trim() ? "#1D9E75" : "var(--bg-secondary)",
                    color: texto.trim() ? "white" : "var(--text-tertiary)",
                    fontSize: "13px",
                    cursor: texto.trim() ? "pointer" : "default",
                  }}
                >
                  {isPending ? "..." : "Enviar"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
            Selecione um chamado para visualizar o chat.
          </div>
        )}
      </div>
    </div>
  );
}

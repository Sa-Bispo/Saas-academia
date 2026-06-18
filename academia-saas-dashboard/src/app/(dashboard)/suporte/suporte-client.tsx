"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  abrirChamado,
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
  tenant_id: string;
  tipo: string;
  titulo: string;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
  mensagens: MensagemChamado[];
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

export function SuporteClient({ chamados, tenantId }: { chamados: Chamado[]; tenantId: string }) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [chamadoAtivoId, setChamadoAtivoId] = useState<string | null>(chamados[0]?.id ?? null);
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();

  const chamadoAtivo = useMemo(
    () => chamados.find((c) => c.id === chamadoAtivoId) ?? chamados[0] ?? null,
    [chamados, chamadoAtivoId],
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
      await marcarLidas(chamadoAtivo.id, "lojista");
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
        autor: "lojista",
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
          autor: "lojista",
          imagem_url: imageUrl,
        });
        router.refresh();
      });
    };

    reader.readAsDataURL(file);
  }

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px", height: "calc(100vh - 48px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, color: "var(--text-primary)" }}>Suporte</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Nossa equipe responde em até 24h
          </p>
        </div>
        <button
          onClick={() => setModalAbrir(true)}
          style={{ padding: "9px 18px", borderRadius: "var(--border-radius-md)", border: "none", background: "#1D9E75", color: "white", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
        >
          + Abrir chamado
        </button>
      </div>

      {chamados.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: "var(--text-tertiary)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <div style={{ fontSize: "14px" }}>Nenhum chamado aberto</div>
          <div style={{ fontSize: "12px" }}>Clique em + Abrir chamado se precisar de ajuda</div>
        </div>
      ) : (
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
          <div style={{ width: "260px", borderRight: "0.5px solid var(--border-color)", overflowY: "auto", flexShrink: 0 }}>
            {chamados.map((chamado) => {
              const statusKey = toStatusKey(chamado.status);
              const sc = STATUS_COLOR[statusKey];
              const ultimaMsg = chamado.mensagens[chamado.mensagens.length - 1];
              const naoLida = chamado.mensagens.some((m) => m.autor === "admin" && !m.lida);

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
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", gap: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: naoLida ? 700 : 500, color: "var(--text-primary)" }}>
                      {naoLida && (
                        <span
                          style={{
                            display: "inline-block",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: "#ef4444",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        />
                      )}
                      {chamado.titulo}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {new Date(chamado.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </div>

                  <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "20px", fontWeight: 600, background: sc.bg, color: sc.color }}>
                    {STATUS_LABEL[statusKey]}
                  </span>

                  {ultimaMsg && (
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ultimaMsg.texto || "📷 Imagem"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {chamadoAtivo && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-color)", background: "var(--bg-secondary)" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{chamadoAtivo.titulo}</div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  Aberto em {new Date(chamadoAtivo.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {chamadoAtivo.mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.autor === "lojista" ? "flex-end" : "flex-start",
                      maxWidth: "70%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: msg.autor === "lojista" ? "flex-end" : "flex-start",
                      gap: "3px",
                    }}
                  >
                    {msg.texto && (
                      <div
                        style={{
                          padding: "9px 12px",
                          fontSize: "13px",
                          lineHeight: "1.5",
                          background: msg.autor === "lojista" ? "#1D9E75" : "var(--bg-secondary)",
                          color: msg.autor === "lojista" ? "white" : "var(--text-primary)",
                          border: msg.autor === "admin" ? "0.5px solid var(--border-color)" : "none",
                          borderRadius: msg.autor === "lojista" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                        }}
                      >
                        {msg.autor === "admin" && (
                          <div style={{ fontSize: "10px", color: "#1D9E75", fontWeight: 600, marginBottom: "3px" }}>
                            Suporte Pyra
                          </div>
                        )}
                        {msg.texto}
                      </div>
                    )}

                    {msg.imagem_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.imagem_url} alt="Anexo" style={{ maxWidth: "220px", borderRadius: "8px", border: "0.5px solid var(--border-color)" }} />
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
                    placeholder="Digite sua mensagem..."
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
          )}
        </div>
      )}

      {modalAbrir && (
        <ModalAbrirChamado
          tenantId={tenantId}
          onClose={() => setModalAbrir(false)}
          onSuccess={() => {
            setModalAbrir(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalAbrirChamado({
  tenantId,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tipo, setTipo] = useState("bot");
  const [mensagem, setMensagem] = useState("");
  const [imagemUrl, setImagemUrl] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const TIPOS = [
    { value: "bot", label: "🤖 Bot não está respondendo" },
    { value: "cardapio", label: "📦 Problema no cardápio" },
    { value: "whatsapp", label: "📱 WhatsApp desconectado" },
    { value: "cobranca", label: "💰 Dúvida sobre cobrança" },
    { value: "motoboys", label: "🏍️ Módulo de motoboys" },
    { value: "outro", label: "💬 Outro assunto" },
  ];

  const TITULOS: Record<string, string> = {
    bot: "Bot não está respondendo",
    cardapio: "Problema no cardápio",
    whatsapp: "WhatsApp desconectado",
    cobranca: "Dúvida sobre cobrança",
    motoboys: "Dúvida sobre motoboys",
    outro: "Suporte geral",
  };

  function handleImagem(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        const imageUrl = await uploadImagemSuporteBase64(reader.result as string, file.name);
        setImagemUrl(imageUrl);
      });
    };

    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!mensagem.trim()) return;

    startTransition(async () => {
      await abrirChamado({
        tenant_id: tenantId,
        tipo,
        titulo: TITULOS[tipo] ?? "Suporte geral",
        mensagem_inicial: mensagem,
        imagem_url: imagemUrl,
      });
      onSuccess();
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "var(--card-bg)", border: "0.5px solid var(--card-border)", borderRadius: "var(--border-radius-lg)", width: "min(440px, 95vw)", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>Abrir chamado</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>Nossa equipe responde em até 24h</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-tertiary)", fontSize: "20px" }}>×</button>
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Tipo do problema</label>
            <select value={tipo} onChange={(event) => setTipo(event.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px" }}>
              {TIPOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Descreva o problema</label>
            <textarea
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              placeholder="Explique o que está acontecendo com o máximo de detalhes..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", height: "100px", resize: "none" }}
            />
          </div>

          {imagemUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagemUrl} alt="Anexo" style={{ maxWidth: "120px", borderRadius: "8px", border: "0.5px solid var(--border-color)" }} />
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--border-color)", display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
            Anexar imagem
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImagem} />
          </label>
          <button onClick={onClose} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--border-color)", background: "transparent", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Cancelar</button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !mensagem.trim()}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--border-radius-md)",
              border: "none",
              background: mensagem.trim() ? "#1D9E75" : "var(--bg-secondary)",
              color: mensagem.trim() ? "white" : "var(--text-tertiary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: mensagem.trim() ? "pointer" : "default",
            }}
          >
            {isPending ? "Abrindo..." : "Abrir chamado"}
          </button>
        </div>
      </div>
    </div>
  );
}

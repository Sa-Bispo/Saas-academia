"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { ConfusionEvent, LearnedPattern } from "./page";

// ─── Constantes ───────────────────────────────────────────────────────────────

const INTENTS = [
  { value: "matricula",  label: "Matrícula" },
  { value: "cobranca",   label: "Cobranças" },
  { value: "pix",        label: "Chave Pix" },
  { value: "paguei",     label: "Já paguei" },
  { value: "renovar",    label: "Renovar" },
  { value: "encerrar",   label: "Encerrar" },
  { value: "menu",       label: "Menu / Início" },
  { value: "desistir",   label: "Desistir / Esquece" },
];

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  // 5511999990000 → +55 (11) 99999-0000
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

const STATUS_TABS = [
  { value: "pendente",  label: "Pendentes" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "ignorado",  label: "Ignorados" },
];

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  initialEvents: ConfusionEvent[];
  initialPatterns: LearnedPattern[];
  botUrl: string;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function BotCorrectionsClient({ initialEvents, initialPatterns, botUrl }: Props) {
  const [events, setEvents] = useState<ConfusionEvent[]>(initialEvents);
  const [patterns, setPatterns] = useState<LearnedPattern[]>(initialPatterns);
  const [statusTab, setStatusTab] = useState<"pendente" | "resolvido" | "ignorado">("pendente");
  const [selectedEvent, setSelectedEvent] = useState<ConfusionEvent | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);
  const [view, setView] = useState<"events" | "patterns">("events");
  const wsRef = useRef<WebSocket | null>(null);

  // ─── WebSocket para notificações em tempo real ────────────────────────────

  const addToast = useCallback((msg: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  useEffect(() => {
    const wsUrl = botUrl.replace(/^http/, "ws") + "/api/admin/ws/notifications";
    let ws: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "confusion_event") {
            addToast(`Novo evento de confusão do bot — nicho: ${data.nicho}`);
            // Recarrega lista se estamos na aba de pendentes
            setStatusTab((cur) => {
              if (cur === "pendente") fetchEvents("pendente");
              return cur;
            });
          }
        } catch {/* ignora mensagens malformadas */}
      };

      ws.onclose = () => {
        retryTimer = setTimeout(connect, 4000);
      };
    }

    connect();
    return () => {
      ws?.close();
      clearTimeout(retryTimer);
    };
  }, [botUrl, addToast]);

  // ─── Data fetching ────────────────────────────────────────────────────────

  async function fetchEvents(status: string) {
    try {
      const res = await fetch(`${botUrl}/api/admin/confusion-events?status=${status}&limit=50`);
      if (res.ok) setEvents((await res.json()).events ?? []);
    } catch {/* silencioso */}
  }

  async function fetchPatterns() {
    try {
      const res = await fetch(`${botUrl}/api/admin/learned-patterns?nicho=academia`);
      if (res.ok) setPatterns((await res.json()).patterns ?? []);
    } catch {/* silencioso */}
  }

  function handleTabChange(tab: typeof statusTab) {
    setStatusTab(tab);
    fetchEvents(tab);
  }

  // ─── Ações nos eventos ────────────────────────────────────────────────────

  async function handleAction(eventId: string, action: "ignorar" | "resolver") {
    const res = await fetch(`${botUrl}/api/admin/confusion-events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      addToast(action === "ignorar" ? "Evento ignorado." : "Resolvido — lembre de commitar a correção.");
      setSelectedEvent(null);
      fetchEvents(statusTab);
    }
  }

  async function handleDeletePattern(id: string) {
    await fetch(`${botUrl}/api/admin/learned-patterns/${id}`, { method: "DELETE" });
    fetchPatterns();
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[--bg-primary]">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-600/90 px-4 py-3 text-sm text-white shadow-lg backdrop-blur"
          >
            <Zap className="size-4 shrink-0" />
            {t.msg}
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-5 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[--text-primary]">Histórico de problemas</h1>
            <p className="text-sm text-[--text-muted] mt-0.5">
              Sessões onde o bot não entendeu o aluno. Leia, corrija no código e marque como resolvido.
            </p>
          </div>
          <button
            onClick={() => { setView(view === "events" ? "patterns" : "events"); if (view === "events") fetchPatterns(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-secondary] border border-[--border-color] transition-colors"
          >
            <BookOpen className="size-3.5" />
            {view === "events" ? "Ver padrões" : "Ver histórico"}
          </button>
        </div>

        {view === "events" ? (
          <>
            {/* Tabs de status */}
            <div className="flex gap-1 border-b border-[--border-color]">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value as typeof statusTab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    statusTab === tab.value
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-[--text-muted] hover:text-[--text-primary]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Lista de eventos */}
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[--text-muted]">
                <CheckCircle2 className="size-10 mb-3 text-emerald-500/60" />
                <p className="text-sm">Nenhum evento {statusTab === "pendente" ? "pendente" : statusTab}.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="w-full text-left rounded-2xl border border-[--border-color] bg-[--bg-secondary] hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all overflow-hidden"
                  >
                    {/* Topo do card: cliente + meta */}
                    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-[--border-color]/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar inicial */}
                        <div className="size-8 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-indigo-400">
                            {(ev.tenantNome || ev.nicho).slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[--text-primary] truncate leading-tight">
                            {ev.tenantNome || "Cliente sem nome"}
                          </p>
                          <p className="text-xs text-[--text-muted] truncate">
                            {formatPhone(ev.phone)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider rounded-md px-2 py-0.5 bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                          {ev.nicho}
                        </span>
                        <span className="text-xs text-[--text-muted]">
                          {new Date(ev.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          {" · "}
                          {new Date(ev.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <ChevronRight className="size-4 text-[--text-muted]" />
                      </div>
                    </div>

                    {/* Corpo: o que o bot não entendeu */}
                    <div className="px-4 py-3 flex items-start gap-3">
                      <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-amber-400/80 mb-0.5">Mensagem não entendida</p>
                        <p className="text-sm text-[--text-primary] truncate">
                          &ldquo;{ev.textoProblema}&rdquo;
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[--text-muted] bg-[--bg-tertiary] rounded-md px-2 py-0.5">
                        {ev.messages.length} msgs
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <PatternsView patterns={patterns} onDelete={handleDeletePattern} botUrl={botUrl} onRefresh={fetchPatterns} />
        )}
      </div>

      {/* Modal de sessão */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAction={(id, action) => void handleAction(id, action)}
        />
      )}
    </div>
  );
}

// ─── Modal de sessão ──────────────────────────────────────────────────────────

function EventModal({
  event,
  onClose,
  onAction,
}: {
  event: ConfusionEvent;
  onClose: () => void;
  onAction: (id: string, action: "ignorar" | "resolver") => void;
}) {
  const [loading, setLoading] = useState(false);

  async function submit(action: "ignorar" | "resolver") {
    setLoading(true);
    await onAction(event.id, action);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-[--border-color] bg-[--bg-secondary] shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[--border-color]">
          <div>
            <h2 className="font-semibold text-[--text-primary]">Sessão com problema</h2>
            <p className="text-xs text-[--text-muted] mt-0.5">
              {event.tenantNome || "Academia"} · {event.nicho} · {event.phone} · {new Date(event.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[--text-muted] hover:text-[--text-primary] transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Problema em destaque */}
        <div className="px-6 pt-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/8 px-4 py-3">
            <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-400 mb-0.5">Mensagem que o bot não entendeu</p>
              <p className="text-sm text-[--text-primary]">&ldquo;{event.textoProblema}&rdquo;</p>
            </div>
          </div>
        </div>

        {/* Conversa completa */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[--text-muted] mb-3">Histórico da conversa</p>
          {event.messages.length === 0 ? (
            <p className="text-sm text-[--text-muted] text-center py-8">Sem histórico disponível.</p>
          ) : (
            event.messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600/80 text-white rounded-tr-sm"
                      : "bg-[--bg-tertiary] text-[--text-primary] rounded-tl-sm"
                  } ${msg.text === event.textoProblema ? "ring-2 ring-amber-400/50" : ""}`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-indigo-200/60 text-right" : "text-[--text-muted]"}`}>
                    {msg.role === "user" ? "Aluno" : "Bot"} · {new Date(msg.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer com ações */}
        <div className="px-6 py-4 border-t border-[--border-color]">
          {event.status === "pendente" ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-[--text-muted]">
                Corrija no código e marque como resolvido.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => void submit("ignorar")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-tertiary] transition-colors disabled:opacity-50"
                >
                  <XCircle className="size-4" />
                  Ignorar
                </button>
                <button
                  onClick={() => void submit("resolver")}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Marcar como resolvido
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-center text-[--text-muted]">
              Este evento foi <span className="text-[--text-primary] font-medium">{event.status}</span>{" "}
              {event.resolvedAt ? `em ${new Date(event.resolvedAt).toLocaleDateString("pt-BR")}` : ""}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View de padrões aprendidos ───────────────────────────────────────────────

function PatternsView({
  patterns,
  onDelete,
  botUrl,
  onRefresh,
}: {
  patterns: LearnedPattern[];
  onDelete: (id: string) => void;
  botUrl: string;
  onRefresh: () => void;
}) {
  const [frase, setFrase] = useState("");
  const [intentAlvo, setIntentAlvo] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!frase || !intentAlvo) return;
    setSaving(true);
    await fetch(`${botUrl}/api/admin/learned-patterns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nicho: "academia", frase, intentAlvo }),
    });
    setFrase("");
    setIntentAlvo("");
    setSaving(false);
    onRefresh();
  }

  const active = patterns.filter((p) => p.ativo);
  const inactive = patterns.filter((p) => !p.ativo);

  return (
    <div className="space-y-5">
      {/* Adicionar manual */}
      <div className="rounded-xl border border-[--border-color] bg-[--bg-secondary] p-4 space-y-3">
        <p className="text-sm font-medium text-[--text-primary]">Adicionar padrão manualmente</p>
        <div className="flex gap-3">
          <input
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            placeholder="Frase/variação..."
            className="flex-1 rounded-lg border border-[--border-color] bg-[--bg-primary] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={intentAlvo}
            onChange={(e) => setIntentAlvo(e.target.value)}
            className="w-44 rounded-lg border border-[--border-color] bg-[--bg-primary] px-3 py-2 text-sm text-[--text-primary] focus:border-indigo-500 focus:outline-none"
          >
            <option value="">-- intent --</option>
            {INTENTS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={saving || !frase || !intentAlvo}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            <Plus className="size-4" />
            Adicionar
          </button>
        </div>
      </div>

      {/* Lista de padrões ativos */}
      <div>
        <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wide mb-2">
          Ativos ({active.length})
        </p>
        {active.length === 0 ? (
          <p className="text-sm text-[--text-muted] py-6 text-center">Nenhum padrão ativo ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {active.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-[--border-color] bg-[--bg-secondary] px-4 py-2.5"
              >
                <span className="flex-1 text-sm text-[--text-primary] font-mono">&ldquo;{p.frase}&rdquo;</span>
                <span className="rounded-full bg-indigo-500/15 text-indigo-300 text-xs px-2 py-0.5">
                  {p.intentAlvo}
                </span>
                <span className="text-xs text-[--text-muted]">
                  {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-[--text-muted] hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {inactive.length > 0 && (
        <div>
          <p className="text-xs text-[--text-muted] font-medium uppercase tracking-wide mb-2">
            Desativados ({inactive.length})
          </p>
          <div className="space-y-1.5">
            {inactive.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-dashed border-[--border-color] px-4 py-2.5 opacity-50"
              >
                <span className="flex-1 text-sm text-[--text-muted] font-mono line-through">&ldquo;{p.frase}&rdquo;</span>
                <span className="text-xs text-[--text-muted]">{p.intentAlvo}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

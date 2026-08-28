"use client";

import { useState } from "react";
import {
  BookOpen,
  Ban,
  Briefcase,
  ChevronDown,
  ClipboardList,
  Clock,
  CreditCard,
  Dumbbell,
  FileSignature,
  Lock,
  Shirt,
  ShieldCheck,
  Users,
} from "lucide-react";
import { TextoInformativo } from "@/lib/parq-texto-informativo";

// Escolhe um ícone pelo assunto do título do bloco — puramente decorativo,
// pra cada tópico do regulamento "parecer" com o que ele é em vez de virarem
// caixinhas cinzas idênticas. Fallback genérico se nada bater.
function iconePorTitulo(titulo: string) {
  const t = titulo.toLowerCase();
  if (/(horári|funcionamento)/.test(t)) return Clock;
  if (/(pagamento|mensalidade|matr[ií]cula|cancelamento)/.test(t)) return CreditCard;
  if (/(atraso|venciment|bloqueio)/.test(t)) return Lock;
  if (/(roupa|vestu|higiene|cal[cç]ad)/.test(t)) return Shirt;
  if (/(equipamento|peso|aparelho)/.test(t)) return Dumbbell;
  if (/(acompanhante|menor)/.test(t)) return Users;
  if (/(substânci|anaboliz|proibid)/.test(t)) return Ban;
  if (/(pertence|objeto)/.test(t)) return Briefcase;
  if (/(seguran[cç]a|responsabilidade|direito)/.test(t)) return ShieldCheck;
  if (/(termo|ci[eê]ncia|declara[cç][aã]o)/.test(t)) return FileSignature;
  return ClipboardList;
}

// Convenção do conteúdo: a primeira linha do bloco é o título da seção,
// o resto é o corpo (parágrafos/bullets, lidos pelo TextoInformativo).
function separarTitulo(texto: string): { titulo: string; corpo: string } {
  const linhas = texto.split("\n");
  const idx = linhas.findIndex((l) => l.trim());
  if (idx === -1) return { titulo: "", corpo: "" };
  return { titulo: linhas[idx].trim(), corpo: linhas.slice(idx + 1).join("\n") };
}

type Bloco = { id: number; texto: string };

export function RegulamentoAccordion({ blocos }: { blocos: Bloco[] }) {
  const [abertos, setAbertos] = useState<Set<number>>(new Set());

  if (blocos.length === 0) return null;

  function toggle(id: number) {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
      <div className="flex items-start gap-2.5">
        <BookOpen size={15} className="mt-0.5 shrink-0 text-emerald-400/70" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Regulamento da academia
          </p>
          <p className="mt-1 text-xs text-white/30">Toque em cada tópico para ler.</p>
        </div>
      </div>

      <div className="space-y-2">
        {blocos.map((bloco) => {
          const { titulo, corpo } = separarTitulo(bloco.texto);
          const Icone = iconePorTitulo(titulo);
          const aberto = abertos.has(bloco.id);
          return (
            <div
              key={bloco.id}
              className={`overflow-hidden rounded-xl border transition-colors ${
                aberto ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(bloco.id)}
                aria-expanded={aberto}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
              >
                <Icone
                  size={15}
                  className={`shrink-0 transition-colors ${aberto ? "text-emerald-400" : "text-white/40"}`}
                />
                <span className={`flex-1 text-xs font-medium ${aberto ? "text-emerald-300" : "text-white/70"}`}>
                  {titulo}
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-white/30 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
                />
              </button>

              <div
                className="grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: aberto ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <TextoInformativo
                    texto={corpo}
                    className="space-y-1.5 px-4 pb-4 text-xs leading-relaxed text-white/60"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

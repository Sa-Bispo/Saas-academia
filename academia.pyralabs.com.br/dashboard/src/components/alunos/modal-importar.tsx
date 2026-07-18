"use client";

import { useRef, useState, useTransition } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  ChevronRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  Users,
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

import { parseDateBR, formatDateBR, normalizeTelefone } from "@/lib/importar-utils";
import { importarAlunos } from "@/actions/importar-alunos.actions";
import type { ImportRow, ImportResult } from "@/actions/importar-alunos.actions";

type Plano = { id: string; nome: string; valorCents: number };

type Step = "upload" | "mapping" | "preview" | "result";

type Campo =
  | "nome"
  | "telefone"
  | "cpf"
  | "email"
  | "dataNascimento"
  | "observacoes"
  | "planoNome"
  | "dataVencimento"
  | "dataInicio"
  | "";

const CAMPOS_OPCOES: { key: Campo; label: string }[] = [
  { key: "", label: "— Ignorar —" },
  { key: "nome", label: "Nome *" },
  { key: "telefone", label: "Telefone *" },
  { key: "cpf", label: "CPF (dedup)" },
  { key: "email", label: "E-mail" },
  { key: "dataNascimento", label: "Data de nascimento" },
  { key: "observacoes", label: "Observações" },
  { key: "planoNome", label: "Plano (nome)" },
  { key: "dataVencimento", label: "Data de vencimento" },
  { key: "dataInicio", label: "Data de início" },
];

function autoMapear(header: string): Campo {
  const h = header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
  if (/\b(nome|name|aluno|cliente|pessoa)\b/.test(h)) return "nome";
  if (/\b(tel|cel|celular|phone|whatsapp|fone|contato|numero|wpp)\b/.test(h)) return "telefone";
  if (/\bcpf\b/.test(h)) return "cpf";
  if (/\b(email|e-mail|mail|correio)\b/.test(h)) return "email";
  if (/\b(nasc|aniversario|birthday|nascimento)\b/.test(h)) return "dataNascimento";
  if (/\b(obs|observ|nota|detalhe|anotacao)\b/.test(h)) return "observacoes";
  if (/\b(plano|plan|modalidade|categoria)\b/.test(h)) return "planoNome";
  if (/\b(venc|vencimento|expir|validade|valido|fim|termino)\b/.test(h)) return "dataVencimento";
  if (/\b(inicio|start|cadastro|entrada|matricula)\b/.test(h)) return "dataInicio";
  return "";
}

async function parseCSV(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (r) => {
        const data = r.data;
        if (data.length < 2) {
          reject(new Error("Arquivo CSV sem dados ou só com cabeçalho"));
          return;
        }
        const headers = data[0].map((h) => String(h).trim());
        const rows = data.slice(1).filter((row) => row.some((c) => String(c).trim()));
        resolve({ headers, rows: rows.map((row) => row.map((c) => String(c).trim())) });
      },
      error: reject,
    });
  });
}

async function parseExcel(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  });

  if (raw.length < 2) throw new Error("Arquivo Excel sem dados ou só com cabeçalho");

  const stringify = (v: string | number | Date | null): string => {
    if (v === null || v === undefined) return "";
    if (v instanceof Date) {
      const d = String(v.getDate()).padStart(2, "0");
      const m = String(v.getMonth() + 1).padStart(2, "0");
      return `${d}/${m}/${v.getFullYear()}`;
    }
    return String(v).trim();
  };

  const headers = (raw[0] as (string | number | Date | null)[]).map(stringify);
  const rows = raw
    .slice(1)
    .map((row) => (row as (string | number | Date | null)[]).map(stringify))
    .filter((row) => row.some((c) => c.length > 0));

  return { headers, rows };
}

type MappedRow = ImportRow & {
  _dataVencimentoDisplay: string;
  _telefoneDisplay: string;
};

function buildMappedRow(rawRow: string[], linha: number, map: Record<number, Campo>): MappedRow {
  const get = (campo: Campo): string => {
    const entry = Object.entries(map).find(([, v]) => v === campo);
    if (!entry) return "";
    return rawRow[parseInt(entry[0])] ?? "";
  };

  const telefoneRaw = get("telefone");
  const vencimentoRaw = get("dataVencimento");
  const inicioRaw = get("dataInicio");
  const nascimentoRaw = get("dataNascimento");

  const telefoneNorm = normalizeTelefone(telefoneRaw);
  const dataVencimento = parseDateBR(vencimentoRaw);
  const dataInicio = parseDateBR(inicioRaw);
  const dataNascimento = parseDateBR(nascimentoRaw);

  return {
    _linha: linha,
    nome: get("nome"),
    telefone: telefoneNorm,
    cpf: get("cpf") || undefined,
    email: get("email") || undefined,
    observacoes: get("observacoes") || undefined,
    planoNome: get("planoNome") || undefined,
    dataNascimento: dataNascimento?.toISOString() ?? undefined,
    dataVencimento: dataVencimento?.toISOString() ?? undefined,
    dataInicio: dataInicio?.toISOString() ?? undefined,
    _dataVencimentoDisplay: dataVencimento
      ? `vence ${formatDateBR(dataVencimento)}`
      : vencimentoRaw
        ? "⚠ data inválida"
        : "—",
    _telefoneDisplay: telefoneNorm || telefoneRaw || "—",
  };
}

// ── Componente Principal ──────────────────────────────────────────────────────

export function ModalImportar({
  onClose,
  planos,
}: {
  onClose: () => void;
  planos: Plano[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, Campo>>({});
  const [globalPlanoId, setGlobalPlanoId] = useState("");
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewRows = rawRows.slice(0, 5).map((row, i) =>
    buildMappedRow(row, i + 2, mapping)
  );
  const totalLinhas = rawRows.length;
  const temNome = Object.values(mapping).includes("nome");
  const temTelefone = Object.values(mapping).includes("telefone");
  const podeAvancar = temNome && temTelefone;

  async function handleFile(file: File) {
    setErroArquivo(null);
    try {
      const { headers: h, rows: r } =
        file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv")
          ? await parseCSV(file)
          : await parseExcel(file);

      if (r.length === 0) {
        setErroArquivo("Nenhuma linha de dados encontrada no arquivo.");
        return;
      }

      const autoMap: Record<number, Campo> = {};
      h.forEach((col, idx) => {
        autoMap[idx] = autoMapear(col);
      });

      setHeaders(h);
      setRawRows(r);
      setMapping(autoMap);
      setStep("mapping");
    } catch (err) {
      setErroArquivo(
        err instanceof Error ? err.message : "Erro ao ler o arquivo."
      );
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImportar() {
    const allRows: ImportRow[] = rawRows.map((row, i) => {
      const m = buildMappedRow(row, i + 2, mapping);
      return {
        _linha: m._linha,
        nome: m.nome,
        telefone: m.telefone,
        cpf: m.cpf,
        email: m.email,
        observacoes: m.observacoes,
        planoNome: m.planoNome,
        dataNascimento: m.dataNascimento,
        dataVencimento: m.dataVencimento,
        dataInicio: m.dataInicio,
      };
    });

    startTransition(async () => {
      const res = await importarAlunos(allRows, globalPlanoId || undefined);
      setResultado(res);
      setStep("result");
    });
  }

  const STEP_LABELS: Record<Step, string> = {
    upload: "Selecionar arquivo",
    mapping: "Mapear colunas",
    preview: "Prévia",
    result: "Resultado",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-surface shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Importar alunos</h2>
            <p className="mt-0.5 text-xs text-muted">{STEP_LABELS[step]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-1">
          {(["upload", "mapping", "preview", "result"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                step === s
                  ? "bg-brand"
                  : ["mapping", "preview", "result"].indexOf(step) > ["mapping", "preview", "result"].indexOf(s) || step === "result"
                    ? "bg-brand/40"
                    : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Etapa 1: Upload ── */}
          {step === "upload" && (
            <div className="p-5">
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] py-14 transition hover:border-brand/40 hover:bg-brand/[0.03]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06]">
                  <FileSpreadsheet size={22} className="text-muted" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Arraste o arquivo aqui</p>
                  <p className="mt-1 text-xs text-muted">ou clique para selecionar</p>
                  <p className="mt-2 text-[11px] text-muted/60">Aceita: .csv · .xlsx · .xls</p>
                </div>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-2 rounded-xl bg-brand/20 px-4 py-2 text-xs font-semibold text-brand hover:bg-brand/30 transition"
                >
                  <Upload size={13} />
                  Selecionar arquivo
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {erroArquivo && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                  <p className="text-xs text-red-400">{erroArquivo}</p>
                </div>
              )}
              <p className="mt-4 text-[11px] text-muted/50 text-center">
                Colunas necessárias: <strong className="text-muted">nome</strong> e{" "}
                <strong className="text-muted">telefone</strong>. As demais são opcionais.
              </p>
            </div>
          )}

          {/* ── Etapa 2: Mapeamento ── */}
          {step === "mapping" && (
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted">
                Mapeie cada coluna da planilha para o campo correspondente. Colunas detectadas automaticamente.
              </p>

              <div className="overflow-hidden rounded-xl border border-line/50">
                <div className="grid grid-cols-2 gap-0 border-b border-line/50 bg-white/[0.03] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <span>Coluna na planilha</span>
                  <span>Campo do sistema</span>
                </div>
                <div className="divide-y divide-line/30">
                  {headers.map((h, idx) => (
                    <div key={idx} className="grid grid-cols-2 items-center gap-3 px-4 py-2.5">
                      <span className="truncate text-sm text-white/70" title={h}>
                        {h || <span className="text-muted italic">sem cabeçalho</span>}
                      </span>
                      <select
                        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-white focus:border-brand/50 focus:outline-none"
                        value={mapping[idx] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [idx]: e.target.value as Campo }))
                        }
                      >
                        {CAMPOS_OPCOES.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Plano padrão global */}
              <div className="rounded-xl border border-line/50 bg-white/[0.02] p-4 space-y-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                  Plano padrão (opcional)
                </p>
                <p className="text-[11px] text-muted/60">
                  Aplicado quando a linha não tiver coluna de plano. Necessário para criar matrícula.
                </p>
                <select
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-white focus:border-brand/50 focus:outline-none"
                  value={globalPlanoId}
                  onChange={(e) => setGlobalPlanoId(e.target.value)}
                >
                  <option value="">— Sem plano padrão —</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — R$ {(p.valorCents / 100).toFixed(2).replace(".", ",")}
                    </option>
                  ))}
                </select>
              </div>

              {!podeAvancar && (
                <p className="text-xs text-amber-400">
                  ⚠ Mapeie pelo menos as colunas <strong>Nome</strong> e <strong>Telefone</strong> para continuar.
                </p>
              )}
            </div>
          )}

          {/* ── Etapa 3: Prévia ── */}
          {step === "preview" && (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">
                  Mostrando as primeiras {Math.min(5, totalLinhas)} de{" "}
                  <strong className="text-white">{totalLinhas}</strong> linhas.
                  Os dados abaixo já foram interpretados — revise antes de importar.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-line/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-line/50 bg-white/[0.03]">
                      <th className="px-3 py-2 text-left font-semibold text-muted uppercase tracking-wide">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted uppercase tracking-wide">Telefone</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted uppercase tracking-wide">Vencimento</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted uppercase tracking-wide">Plano</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/20">
                    {previewRows.map((row) => (
                      <tr key={row._linha} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2">
                          {row.nome ? (
                            <span className="text-white">{row.nome}</span>
                          ) : (
                            <span className="text-red-400">⚠ ausente</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted/80">
                          {row._telefoneDisplay}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              row._dataVencimentoDisplay.startsWith("⚠")
                                ? "text-amber-400"
                                : row._dataVencimentoDisplay === "—"
                                  ? "text-muted/40"
                                  : "text-emerald-400"
                            }
                          >
                            {row._dataVencimentoDisplay}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted/70">
                          {row.planoNome || (globalPlanoId ? planos.find(p => p.id === globalPlanoId)?.nome : "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalLinhas > 5 && (
                <p className="text-center text-[11px] text-muted/40">
                  ... e mais {totalLinhas - 5} linha{totalLinhas - 5 > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* ── Etapa 4: Resultado ── */}
          {step === "result" && (
            <div className="p-5 space-y-4">
              {pending ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <Loader2 size={28} className="animate-spin text-brand" />
                  <p className="text-sm text-muted">Importando {totalLinhas} aluno{totalLinhas > 1 ? "s" : ""}...</p>
                </div>
              ) : resultado ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-xs text-emerald-400/70 uppercase tracking-wide font-semibold">Criados</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-400">{resultado.criados}</p>
                    </div>
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                      <p className="text-xs text-indigo-400/70 uppercase tracking-wide font-semibold">Atualizados</p>
                      <p className="mt-1 text-2xl font-bold text-indigo-400">{resultado.atualizados}</p>
                    </div>
                  </div>

                  {resultado.semMatricula.length > 0 && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wide">
                        <AlertTriangle size={11} />
                        {resultado.semMatricula.length} criado{resultado.semMatricula.length > 1 ? "s" : ""} SEM matrícula — completar depois
                      </p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {resultado.semMatricula.map((a) => (
                          <p key={a.linha} className="text-xs text-amber-300/70">
                            <span className="text-muted/40 mr-1.5">Linha {a.linha}:</span>
                            {a.nome}{" "}
                            <span className="font-mono text-[10px] text-muted/50">{a.telefone}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {resultado.erros.length > 0 && (
                    <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3 space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400 uppercase tracking-wide">
                        <X size={11} />
                        {resultado.erros.length} erro{resultado.erros.length > 1 ? "s" : ""}
                      </p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {resultado.erros.map((e, i) => (
                          <p key={i} className="text-xs text-red-300/70">
                            <span className="text-muted/40 mr-1.5">Linha {e.linha}:</span>
                            {e.motivo}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {resultado.semMatricula.length === 0 && resultado.erros.length === 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                      <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                      <p className="text-xs text-emerald-400">Importação concluída sem erros!</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-5 py-4">
          {step === "upload" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Cancelar
            </button>
          )}

          {step === "mapping" && (
            <>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground"
              >
                ← Voltar
              </button>
              <button
                type="button"
                disabled={!podeAvancar}
                onClick={() => setStep("preview")}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90 disabled:opacity-40"
              >
                Ver prévia <ChevronRight size={14} />
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                type="button"
                onClick={() => setStep("mapping")}
                className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:text-foreground"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleImportar}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
              >
                <Users size={14} />
                Importar {totalLinhas} aluno{totalLinhas > 1 ? "s" : ""}
              </button>
            </>
          )}

          {step === "result" && !pending && (
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
              >
                <UserPlus size={14} />
                Fechar e ver alunos
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

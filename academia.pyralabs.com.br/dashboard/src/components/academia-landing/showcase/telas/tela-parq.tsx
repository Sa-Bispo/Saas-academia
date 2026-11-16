// Réplicas estáticas do PAR-Q: lista de fichas recebidas (markup de
// app/(dashboard)/parq-config/parq-config-client.tsx) e o formulário que o aluno abre no
// celular (app/parq/[tenantId]/parq-form.tsx). Dados fictícios da Academia Demo.
// data-marca = onde o marcador numerado da landing se ancora.
import { AlertTriangle, Archive, Check, ClipboardList, Download, ExternalLink, FileText, Link2, Plus, Search, Settings2 } from "lucide-react";

const FICHAS = [
  { nome: "Beatriz Silva Araújo", cpf: "602.251.596-30", tel: "(11) 99754-5608", data: "15/11/2026, 06:43", lib: false, lead: false },
  { nome: "Emerson Silva Cunha", cpf: "418.903.257-12", tel: "(11) 92847-1063", data: "14/11/2026, 01:43", lib: true, lead: false },
  { nome: "Eduardo Souza Cunha", cpf: "735.120.648-91", tel: "(11) 98832-8500", data: "12/11/2026, 20:43", lib: false, lead: false },
  { nome: "Olivia Lima Araújo", cpf: "291.586.034-77", tel: "(11) 95316-2289", data: "11/11/2026, 15:43", lib: false, lead: false },
  { nome: "Jéssica Santos Silva", cpf: "863.047.192-05", tel: "(11) 97105-4432", data: "10/11/2026, 10:43", lib: true, lead: false },
  { nome: "Thiago Silva Dias", cpf: "157.932.680-44", tel: "(11) 94268-7710", data: "09/11/2026, 05:43", lib: false, lead: false },
  { nome: "Larissa Moreira", cpf: "382.746.150-20", tel: "(11) 98765-0001", data: "08/11/2026, 00:43", lib: false, lead: true },
  { nome: "Diego Albuquerque", cpf: "519.637.284-01", tel: "(11) 98765-0002", data: "06/11/2026, 19:43", lib: false, lead: true },
];

function Pill({ ativo, children }: { ativo?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="rounded-lg px-2.5 py-1.5 text-xs font-medium"
      style={{
        background: ativo ? "var(--accent)" : "var(--bg-primary)",
        color: ativo ? "#04140a" : "var(--text-secondary)",
        border: `1px solid ${ativo ? "var(--accent)" : "var(--border-color)"}`,
      }}
    >
      {children}
    </span>
  );
}

const botao = "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs";
const botaoEstilo = { borderColor: "var(--border-color)", color: "var(--text-secondary)" };

export function TelaParqFichas() {
  return (
    <section className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em]" style={{ color: "var(--text-secondary)" }}>
            Academia
          </p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            PAR-Q
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium" style={botaoEstilo}>
            <ExternalLink size={13} />
            Preview
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium" style={botaoEstilo}>
            <Link2 size={13} />
            Copiar link
          </span>
        </div>
      </div>

      {/* Abas */}
      <div className="flex w-fit gap-1 rounded-xl border p-1" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)" }}>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-2 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          <ClipboardList size={13} />
          Fichas recebidas
          <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(255,255,255,0.1)" }}>
            8
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          <Settings2 size={13} />
          Configurar perguntas
        </span>
      </div>

      <div className="space-y-3">
        {/* Filtros */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
            <div
              className="w-full rounded-lg border py-2 pl-8 pr-3 text-xs"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border-color)", color: "var(--text-tertiary)" }}
            >
              Buscar por nome, CPF ou telefone...
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Pill ativo>Todos</Pill>
            <Pill>Já matriculados</Pill>
            <Pill>Leads</Pill>
          </div>
          <Pill>
            <span className="inline-flex items-center gap-1">
              <AlertTriangle size={11} />
              Lib. médica: Sim
            </span>
          </Pill>
          <Pill>
            <span className="inline-flex items-center gap-1">
              <Archive size={11} />
              Arquivados
            </span>
          </Pill>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border-color)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Nome", "CPF", "Telefone", "Data", "Lib. médica", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FICHAS.map((f, i) => (
                <tr key={f.nome} style={{ borderTop: i > 0 ? "1px solid var(--border-color)" : undefined }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                    {f.nome}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                    {f.cpf}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {f.tel}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {f.data}
                  </td>
                  <td className="px-4 py-3">
                    {f.lib ? (
                      <span
                        data-marca={i === 1 ? 2 : undefined}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}
                      >
                        <AlertTriangle size={10} />
                        Sim
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
                      >
                        Não
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <span className={botao} style={botaoEstilo}>
                        <Download size={12} />
                        PDF
                      </span>
                      <span className={botao} style={botaoEstilo}>
                        <FileText size={12} />
                        Ver ficha
                      </span>
                      <span className={botao} style={botaoEstilo}>
                        <Archive size={12} />
                        Arquivar
                      </span>
                      {f.lead ? (
                        <span
                          data-marca={i === 6 ? 3 : undefined}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-[#04140a]"
                          style={{ background: "var(--accent)" }}
                        >
                          <Plus size={12} />
                          Matricular
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                          style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}
                        >
                          <Check size={11} />
                          Matriculado
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const campo = "w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white";

// Formulário que o aluno abre no celular pelo QR code
export function TelaParqCelular() {
  return (
    <div data-marca={1} className="min-h-[900px] bg-[#0a0a0a] px-4 pb-10 pt-12">
      <div className="mx-auto w-full space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white">
            <span className="font-display text-xl font-black tracking-tight text-[#0b0b0d]">AD</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Academia Demo</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Ficha de Pré-cadastro</h1>
          <p className="mt-1 text-sm text-white/40">Questionário PAR-Q + Termo de Responsabilidade</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Dados pessoais</p>
          <div>
            <p className="mb-1.5 block text-xs font-medium text-white/60">Nome completo *</p>
            <div className={campo}>Lucas Ferreira</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 block text-xs font-medium text-white/60">CPF *</p>
              <div className={campo}>284.913.570-62</div>
            </div>
            <div>
              <p className="mb-1.5 block text-xs font-medium text-white/60">WhatsApp *</p>
              <div className={campo}>(11) 98421-3307</div>
            </div>
          </div>
          <div>
            <p className="mb-1.5 block text-xs font-medium text-white/60">Data de nascimento</p>
            <div className={campo}>12/03/1998</div>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Questionário PAR-Q</p>
            <p className="mt-1 text-xs text-white/30">Por favor, responda com sinceridade. Responda SIM ou NÃO para cada pergunta.</p>
          </div>
          {[
            "Algum médico já disse que você possui algum problema de coração e que só deveria realizar atividade física supervisionada por profissionais de saúde?",
            "Você sente dores no peito quando pratica atividade física?",
          ].map((texto, idx) => (
            <div key={texto} className="space-y-2">
              <p className="text-sm text-white/80">
                <span className="mr-1.5 font-semibold text-white/40">{idx + 1}.</span>
                {texto}
              </p>
              <div className="flex gap-2">
                <span className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-center text-sm font-semibold text-white/40">
                  Sim
                </span>
                <span className="flex-1 rounded-xl border border-emerald-500/60 bg-emerald-500/15 py-2 text-center text-sm font-semibold text-emerald-300">
                  Não
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

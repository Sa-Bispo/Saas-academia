import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: {
    fontSize: 9,
    color: "#1a1a2e",
    paddingHorizontal: 36,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: "#ffffff",
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerLeft: { gap: 2 },
  academiaName: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  docTitle: { fontSize: 10, color: "#6b7280" },
  headerRight: { alignItems: "flex-end", gap: 2 },
  dateText: { fontSize: 8, color: "#6b7280" },

  // ─── Section ───────────────────────────────────────────────────────────────
  section: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  // ─── Grid pessoal ──────────────────────────────────────────────────────────
  grid2: { flexDirection: "row", gap: 6 },
  gridCell: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cellLabel: { fontSize: 7, color: "#9ca3af", marginBottom: 2 },
  cellValue: { fontSize: 9, fontWeight: "bold", color: "#111827" },

  // ─── Pergunta item ─────────────────────────────────────────────────────────
  perguntaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 3,
  },
  perguntaRowNormal: { backgroundColor: "#f9fafb" },
  perguntaRowSim: { backgroundColor: "#fffbeb" },
  perguntaNum: { fontSize: 8, color: "#9ca3af", width: 14, marginTop: 0.5 },
  perguntaTexto: { flex: 1, fontSize: 8.5, color: "#374151", lineHeight: 1.4 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 7.5,
    fontWeight: "bold",
  },
  badgeSim: { backgroundColor: "#fef3c7", color: "#92400e" },
  badgeNao: { backgroundColor: "#ecfdf5", color: "#065f46" },

  // ─── Alerta médico ─────────────────────────────────────────────────────────
  alertBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 14,
  },
  alertText: { fontSize: 8, color: "#92400e", lineHeight: 1.4 },

  // ─── Assinatura ────────────────────────────────────────────────────────────
  sigBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 4,
    backgroundColor: "#ffffff",
    height: 70,
  },
  sigImage: { width: "100%", height: 70, objectFit: "contain" },
  sigCaption: { fontSize: 7.5, color: "#6b7280" },

  // ─── Termo LGPD ────────────────────────────────────────────────────────────
  termoBox: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
    padding: 8,
  },
  termoText: { fontSize: 7, color: "#6b7280", lineHeight: 1.5 },

  // ─── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 6.5, color: "#9ca3af" },
  footerHash: { fontSize: 6, color: "#b0b8c4", fontFamily: "Courier" },
  pageNum: { fontSize: 7, color: "#9ca3af" },
});

function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Pergunta = { id: number; texto: string };
type Ficha = {
  id: string;
  assinanteNome: string;
  assinanteCpf: string;
  respostas: Record<string, string>;
  precisaLiberacaoMedica: boolean;
  assinaturaUrl: string | null; // base64 data URL já resolvido pelo botão
  termoHash: string;
  ip: string | null;
  consentimentoLgpd: boolean;
  assinadoEm: Date | string;
  aluno: { telefone: string };
};

type Props = {
  ficha: Ficha;
  perguntas: Pergunta[];
  academiaName: string;
  termoTexto: string;
};

export function ParqPdfDocument({ ficha, perguntas, academiaName, termoTexto }: Props) {
  const perguntaMap = new Map(perguntas.map((p) => [String(p.id), p.texto]));
  const respostasOrdenadas = Object.entries(ficha.respostas).sort(
    ([a], [b]) => Number(a) - Number(b)
  );

  return (
    <Document
      title={`PAR-Q - ${ficha.assinanteNome}`}
      author={academiaName}
      subject="Questionario de Prontidao para Atividade Fisica"
    >
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <Text style={s.academiaName}>{academiaName}</Text>
            <Text style={s.docTitle}>Questionario PAR-Q — Ficha de Pre-Cadastro</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.dateText}>Emitido em {formatDate(ficha.assinadoEm)}</Text>
            <Text style={s.dateText}>ID: {ficha.id.split("-")[0]}</Text>
          </View>
        </View>

        {/* ── Dados pessoais ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Dados Pessoais</Text>
          <View style={s.grid2}>
            <View style={s.gridCell}>
              <Text style={s.cellLabel}>Nome completo</Text>
              <Text style={s.cellValue}>{ficha.assinanteNome}</Text>
            </View>
            <View style={[s.gridCell, { flex: 0.6 }]}>
              <Text style={s.cellLabel}>CPF</Text>
              <Text style={s.cellValue}>{formatCpf(ficha.assinanteCpf)}</Text>
            </View>
            <View style={[s.gridCell, { flex: 0.6 }]}>
              <Text style={s.cellLabel}>Telefone</Text>
              <Text style={s.cellValue}>{ficha.aluno.telefone}</Text>
            </View>
          </View>
        </View>

        {/* ── Perguntas PAR-Q ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Questionario PAR-Q</Text>
          {respostasOrdenadas.map(([id, resposta], i) => {
            const isSim = resposta === "S";
            return (
              <View
                key={id}
                style={[
                  s.perguntaRow,
                  isSim ? s.perguntaRowSim : s.perguntaRowNormal,
                ]}
              >
                <Text style={s.perguntaNum}>{i + 1}.</Text>
                <Text style={s.perguntaTexto}>
                  {perguntaMap.get(id) ?? `Pergunta #${id}`}
                </Text>
                <Text style={[s.badge, isSim ? s.badgeSim : s.badgeNao]}>
                  {isSim ? "SIM" : "NAO"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ── Alerta médico ── */}
        {ficha.precisaLiberacaoMedica && (
          <View style={s.alertBox}>
            <Text style={s.alertText}>
              ATENCAO: Uma ou mais respostas indicam condicao de saude relevante.
              Recomenda-se consultar um medico antes de iniciar atividades fisicas.
            </Text>
          </View>
        )}

        {/* ── Assinatura ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Assinatura Digital</Text>
          {ficha.assinaturaUrl ? (
            <>
              <View style={s.sigBox}>
                <Image src={ficha.assinaturaUrl} style={s.sigImage} />
              </View>
              <Text style={s.sigCaption}>
                Assinado por {ficha.assinanteNome} · {formatCpf(ficha.assinanteCpf)} · {formatDate(ficha.assinadoEm)}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 8, color: "#9ca3af" }}>
              Assinatura nao coletada.
            </Text>
          )}
        </View>

        {/* ── Termo LGPD ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Termo de Responsabilidade e Consentimento LGPD</Text>
          <View style={s.termoBox}>
            <Text style={s.termoText}>{termoTexto}</Text>
            <Text style={[s.termoText, { marginTop: 6, fontWeight: "bold", color: "#374151" }]}>
              {ficha.consentimentoLgpd ? "Consentimento LGPD: ACEITO" : "Consentimento LGPD: NAO ACEITO"}
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <View style={s.footerRow}>
            <Text style={s.footerText}>
              {academiaName} · Documento PAR-Q
              {ficha.ip ? ` · IP: ${ficha.ip}` : ""}
            </Text>
            <Text
              style={s.pageNum}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            />
          </View>
          <Text style={s.footerHash}>
            SHA-256: {ficha.termoHash ?? "—"}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

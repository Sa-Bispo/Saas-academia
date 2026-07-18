import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export type ReciboData = {
  cobrancaId: string;
  alunoNome: string;
  valorCents: number;
  descricao: string | null;
  dataPagamento: Date;
  academiaName: string;
};

let cachedFontRegular: ArrayBuffer | null = null;
let cachedFontSemibold: ArrayBuffer | null = null;

async function loadGoogleFont(weight: 400 | 600): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`,
    { headers: { "User-Agent": "Mozilla/5.0" } }
  ).then((r) => r.text());

  const url = css.match(/url\((.+?)\)/)?.[1];
  if (!url) throw new Error("Font URL não encontrada na resposta do Google Fonts");

  return fetch(url).then((r) => r.arrayBuffer());
}

async function getFonts() {
  if (!cachedFontRegular) cachedFontRegular = await loadGoogleFont(400);
  if (!cachedFontSemibold) cachedFontSemibold = await loadGoogleFont(600);
  return [
    { name: "Inter", data: cachedFontRegular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: cachedFontSemibold, weight: 600 as const, style: "normal" as const },
  ];
}

function fmtCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function gerarReciboImagemBase64(data: ReciboData): Promise<string> {
  const fonts = await getFonts();

  const { cobrancaId, alunoNome, valorCents, descricao, dataPagamento, academiaName } = data;
  const valorFmt = fmtCents(valorCents);
  const dataFmt = fmtDate(dataPagamento);
  const reciboId = `#${cobrancaId.slice(0, 8).toUpperCase()}`;

  const W = 800;
  const H = 460;
  const PAD = 48;

  const rows: { label: string; value: string; green?: boolean }[] = [
    { label: "Aluno", value: alunoNome },
    { label: "Valor pago", value: valorFmt, green: true },
    { label: "Forma", value: "Dinheiro" },
    { label: "Data / hora", value: dataFmt },
    ...(descricao ? [{ label: "Referencia", value: descricao }] : []),
    { label: "No. do recibo", value: reciboId },
  ];

  const svg = await satori(
    <div
      style={{
        width: W,
        height: H,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0f0f11",
        padding: PAD,
        fontFamily: "Inter",
      }}
    >
      {/* ── Header ─────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#6366f1",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {academiaName}
          </div>
          <div style={{ color: "#ffffff", fontSize: 26, fontWeight: 600, marginTop: 6 }}>
            Recibo de Pagamento
          </div>
        </div>

        {/* Check badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: "#16a34a18",
            border: "1.5px solid #16a34a35",
          }}
        >
          <div style={{ color: "#22c55e", fontSize: 26, fontWeight: 600 }}>✓</div>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────── */}
      <div style={{ height: 1, backgroundColor: "#ffffff12", marginTop: 24, marginBottom: 28 }} />

      {/* ── Rows ────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", marginBottom: 13 }}>
            <div style={{ color: "#6b7280", fontSize: 13, width: 160, flexShrink: 0 }}>
              {row.label}
            </div>
            <div
              style={{
                color: row.green ? "#22c55e" : "#e5e7eb",
                fontSize: 13,
                fontWeight: row.green ? 600 : 400,
              }}
            >
              {row.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────── */}
      <div style={{ height: 1, backgroundColor: "#ffffff12", marginBottom: 20 }} />

      {/* ── Footer ──────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
          Pagamento confirmado e registrado com sucesso
        </div>
        <div style={{ color: "#ffffff25", fontSize: 11 }}>{academiaName}</div>
      </div>
    </div>,
    { width: W, height: H, fonts }
  );

  const resvg = new Resvg(svg, { background: "#0f0f11" });
  const png = resvg.render().asPng();
  return Buffer.from(png).toString("base64");
}

"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { ParqPdfDocument } from "./parq-pdf";

type Pergunta = { id: number; texto: string };
type Ficha = {
  id: string;
  assinanteNome: string;
  assinanteCpf: string;
  respostas: Record<string, string>;
  precisaLiberacaoMedica: boolean;
  assinaturaUrl: string | null;
  assinaturaBase64: string | null;
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

async function urlToBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ParqPdfButton({ ficha, perguntas, academiaName, termoTexto }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      // Usa base64 salvo no banco (prioritário, sem CORS),
      // senão tenta buscar via URL como fallback
      let sigBase64 = ficha.assinaturaBase64 ?? null;
      if (!sigBase64 && ficha.assinaturaUrl) {
        sigBase64 = await urlToBase64(ficha.assinaturaUrl);
      }

      const fichaComSig = { ...ficha, assinaturaUrl: sigBase64 };

      const blob = await pdf(
        <ParqPdfDocument
          ficha={fichaComSig}
          perguntas={perguntas}
          academiaName={academiaName}
          termoTexto={termoTexto}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parq-${ficha.assinanteNome.replace(/\s+/g, "_").toLowerCase()}-${ficha.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Nao foi possivel gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors disabled:opacity-50"
      style={{
        borderColor: "var(--border-color)",
        color: "var(--text-secondary)",
      }}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {loading ? "Gerando..." : "PDF"}
    </button>
  );
}

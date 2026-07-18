import type { Metadata } from "next";
import { Archivo, Barlow, Space_Mono } from "next/font/google";
import "./globals.css";

// Display — grotesco industrial, energia de placa de academia (usado com contenção)
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

// Corpo — humanista "esportivo"
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

// Números — mono, "dado de sistema" (mensalidade, datas, %, Pix)
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://academia.pyralabs.com.br"),
  title: "PyraLabs · Gestão de academia no automático",
  description:
    "Bot de WhatsApp que atende 24h, cobrança automática via Pix e um painel único para matrícula, frequência e financeiro. A gestão da sua academia rodando sozinha.",
  keywords: [
    "software para academia",
    "gestão de academia",
    "cobrança automática academia",
    "bot whatsapp academia",
    "sistema de academia",
  ],
  openGraph: {
    title: "PyraLabs · Gestão de academia no automático",
    description:
      "Bot de WhatsApp 24h, cobrança automática via Pix e painel único de gestão para a sua academia.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${barlow.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

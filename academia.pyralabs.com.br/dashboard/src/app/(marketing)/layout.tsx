import { Archivo, Barlow, Space_Mono } from "next/font/google";
import "./landing.css";

// Display — grotesco industrial (usado com contenção)
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

// Números — mono ("dado de sistema")
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`landing-scope ${archivo.variable} ${barlow.variable} ${spaceMono.variable}`}
    >
      {children}
    </div>
  );
}

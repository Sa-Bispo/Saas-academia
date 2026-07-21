import type { Metadata } from "next";
import { Archivo, Barlow, Space_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

// Display — grotesco industrial (títulos), alinhado à landing
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

// Corpo — humanista "esportivo"
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Números — mono ("dado de sistema")
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pyralabs.com.br"),
  title: "WhatsApp SaaS",
  description: "Painel e landing page para um SaaS de chatbot para WhatsApp.",
  openGraph: {
    title: "WhatsApp SaaS",
    description: "Painel e landing page para um SaaS de chatbot para WhatsApp.",
    images: ["/py_transparent.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${archivo.variable} ${barlow.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

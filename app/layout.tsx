import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEED — Calculadora de Previsão de Resultados",
  description:
    "Ferramenta comercial da SEED (marketing de performance para o agro) — projeta resultado e investimento por cenário durante a call.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Mozilla+Text:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

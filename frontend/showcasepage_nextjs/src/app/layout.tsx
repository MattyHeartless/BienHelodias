import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Onest } from "next/font/google";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-sans",
});

const hyperwave = localFont({
  src: "../../public/brand/Hyperwave.otf",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "BienHelodias | Licorerías al tiro, pedidos bien fríos",
  description:
    "BienHelodias ayuda a licorerías y negocios de bebidas a vender, coordinar y entregar en corto, sin perder el ritmo.",
};

export const viewport: Viewport = {
  themeColor: "#060807",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${onest.variable} ${hyperwave.variable}`}>
      <body>{children}</body>
    </html>
  );
}

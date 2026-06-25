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
  title: "Bien Helodias | Infraestructura digital para licorerías",
  description:
    "Bien Helodias es la infraestructura digital especializada para licorerías y negocios de bebidas que quieren vender, coordinar y entregar mejor.",
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

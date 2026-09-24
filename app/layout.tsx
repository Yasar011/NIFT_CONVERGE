import type { Metadata } from "next";
import { Archivo, Instrument_Serif, Tiro_Devanagari_Hindi } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const tiro = Tiro_Devanagari_Hindi({
  variable: "--font-tiro",
  subsets: ["devanagari"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "NIFT Jodhpur × Converge 2026 | Rang Regalia",
  description:
    "NIFT Jodhpur's official student registration and selection portal for CONVERGE 2026 — explore events, understand the selection process, and register your interest.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${instrument.variable} ${tiro.variable} paper-grain`}>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
const sans = Manrope({ variable: "--font-sans", subsets: ["latin", "cyrillic"] });
const serif = Playfair_Display({ variable: "--font-serif", subsets: ["latin", "cyrillic"] });
export const metadata: Metadata = { title: "Lingva — язык становится своим", description: "Интерактивная платформа для изучения английского, русского и казахского языков." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="ru"><body className={`${sans.variable} ${serif.variable}`}>{children}</body></html>; }

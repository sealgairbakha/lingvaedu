import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ variable: "--font-sans", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "LingvaEdu — управление корпоративным обучением",
  description: "Курсы, пользователи, группы, отчёты, видеовстречи и календарь в единой образовательной платформе.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body className={sans.variable}>{children}</body></html>;
}

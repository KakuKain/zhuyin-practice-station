import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "一年級注音練習站｜注音小練習",
  description: "給一年級孩子與家長的注音默寫、直式注音格與聽寫練習站。",
  icons: { icon: "/favicon.svg?v=0.1", shortcut: "/favicon.svg?v=0.1" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}

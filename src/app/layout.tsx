import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "사니양 연구 보고서 열람실",
  description: "사니양 연구실 연구 보고서를 모아놓은 열람실입니다.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col bg-white text-slate-900">
        <Providers>
          <Navbar />
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-7">
            {children}
          </main>
          <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-400">
            사니양 연구 보고서 열람실 ·{" "}
            <a href="/rules" className="underline hover:text-indigo-600 transition-colors">
              이용규정
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

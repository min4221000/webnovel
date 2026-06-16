import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "웹소설 연재소 — 자유 연재 커뮤니티",
  description: "누구나 자유롭게 웹소설을 연재하는 글쓰기 전용 커뮤니티",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* no-flash: dark class 초기 적용 (hydration 전) */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs text-gray-500">
            웹소설 연재소 · 글쓰기 전용 커뮤니티 ·{" "}
            <a href="/rules" className="underline">
              이용규정
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

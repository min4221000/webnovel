"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="border-b border-black/10 dark:border-white/10 sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* 로고 */}
        <Link href="/" className="font-bold text-base sm:text-lg shrink-0 mr-1" onClick={close}>
          <span className="hidden sm:inline">사니양 연구 보고서 열람실</span>
          <span className="sm:hidden">사니양 열람실</span>
        </Link>

        {/* 가이드 — 로그인 여부 무관 항상 표시 */}
        <Link href="/guide" className="hidden sm:block text-sm text-gray-500 hover:underline">가이드</Link>

        {/* 데스크톱 전용 링크 — 로그인 후에만 */}
        {status !== "loading" && user && (
          <>
            <Link href="/search" className="hidden sm:block text-sm text-gray-500 hover:underline">검색</Link>
            <Link href="/drafts" className="hidden sm:block text-sm text-gray-500 hover:underline">비밀글</Link>
            <Link href="/bookmarks" className="hidden sm:block text-sm text-gray-500 hover:underline">북마크</Link>
          </>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {status === "loading" ? null : user ? (
            <>
              {/* 글쓰기 — 항상 표시 */}
              <Link
                href="/write"
                className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={close}
              >
                글쓰기
              </Link>

              {/* 데스크톱 전용 */}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="hidden sm:block text-sm text-red-500 hover:underline">관리자</Link>
              )}
              <a href="/profile" className="hidden sm:flex text-sm items-center gap-1.5 hover:underline" onClick={close}>
                {user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                )}
                <span className="max-w-[80px] truncate">{user.name}</span>
              </a>
              <button onClick={() => signOut()} className="hidden sm:block text-sm text-gray-500 hover:underline">
                로그아웃
              </button>

              {/* 모바일 아바타 (햄버거 열기) */}
              <button
                onClick={() => setOpen((o) => !o)}
                className="sm:hidden flex items-center gap-1"
                aria-label="메뉴"
              >
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="w-7 h-7 rounded-full border border-black/10" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-xs">☰</span>
                )}
              </button>
            </>
          ) : null}
        </div>
      </nav>

      {/* 모바일 드롭다운 메뉴 */}
      {open && (
        <div className="sm:hidden border-t border-black/10 bg-[var(--background)] px-4 py-3 space-y-3">
          <Link href="/guide" className="block text-sm text-gray-700 dark:text-gray-300 py-1" onClick={close}>📖 가이드</Link>
          <Link href="/search" className="block text-sm text-gray-700 dark:text-gray-300 py-1" onClick={close}>🔍 검색</Link>
          {user && (
            <>
              <Link href="/drafts" className="block text-sm text-gray-700 dark:text-gray-300 py-1" onClick={close}>📝 비밀글</Link>
              <Link href="/bookmarks" className="block text-sm text-gray-700 dark:text-gray-300 py-1" onClick={close}>★ 북마크</Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="block text-sm text-red-500 py-1" onClick={close}>🔧 관리자</Link>
              )}
              <div className="border-t border-black/10 pt-2 flex items-center justify-between">
                <a href="/profile" className="flex items-center gap-2 text-sm" onClick={close}>
                  {user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  <span className="truncate max-w-[160px]">{user.name}</span>
                </a>
                <button onClick={() => { signOut(); close(); }} className="text-sm text-gray-400 hover:underline">
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}

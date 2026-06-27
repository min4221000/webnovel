"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

const NAV_LINK = "px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors";

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 mr-1" onClick={close}>
          <span className="font-bold tracking-tight text-[15px] sm:text-base">
            <span className="hidden sm:inline">사니양 연구 보고서 열람실</span>
            <span className="sm:hidden">사니양 열람실</span>
          </span>
        </Link>

        {/* 데스크톱 링크 */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          <Link href="/guide" className={NAV_LINK}>가이드</Link>
          {status !== "loading" && user && (
            <>
              <Link href="/search" className={NAV_LINK}>검색</Link>
              <Link href="/drafts" className={NAV_LINK}>비밀글</Link>
              <Link href="/bookmarks" className={NAV_LINK}>북마크</Link>
            </>
          )}
        </div>

        {/* 우측 액션 */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {status === "loading" ? null : user ? (
            <>
              <Link
                href="/write"
                onClick={close}
                className="text-sm font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition"
              >
                글쓰기
              </Link>

              {user.role === "ADMIN" && (
                <Link href="/admin" className="hidden sm:block text-sm text-rose-500 hover:text-rose-600 px-1.5">
                  관리자
                </Link>
              )}

              <Link href="/profile" className="hidden sm:flex items-center gap-2 group" onClick={close}>
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                    {user.name?.charAt(0) ?? "?"}
                  </span>
                )}
                <span className="text-sm text-slate-700 group-hover:text-indigo-600 max-w-[90px] truncate transition-colors">
                  {user.name}
                </span>
              </Link>

              <button
                onClick={() => signOut()}
                className="hidden sm:block text-sm text-slate-400 hover:text-slate-700 transition-colors"
              >
                로그아웃
              </button>

              {/* 모바일 햄버거 */}
              <button
                onClick={() => setOpen((o) => !o)}
                className="md:hidden w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="메뉴"
              >
                {open ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </button>
            </>
          ) : null}
        </div>
      </nav>

      {/* 모바일 드롭다운 메뉴 */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <Link href="/guide" className="block text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-2" onClick={close}>가이드</Link>
          <Link href="/search" className="block text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-2" onClick={close}>검색</Link>
          {user && (
            <>
              <Link href="/drafts" className="block text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-2" onClick={close}>비밀글</Link>
              <Link href="/bookmarks" className="block text-sm text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 py-2" onClick={close}>북마크</Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="block text-sm text-rose-500 hover:bg-rose-50 rounded-lg px-3 py-2" onClick={close}>관리자</Link>
              )}
              <div className="border-t border-slate-100 mt-2 pt-2 flex items-center justify-between px-3">
                <Link href="/profile" className="flex items-center gap-2 text-sm" onClick={close}>
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-xs font-bold">
                      {user.name?.charAt(0) ?? "?"}
                    </span>
                  )}
                  <span className="truncate max-w-[160px] text-slate-700">{user.name}</span>
                </Link>
                <button onClick={() => { signOut(); close(); }} className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
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

"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;

  return (
    <header className="border-b border-black/10 dark:border-white/10 sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link href="/" className="font-bold text-lg shrink-0">
          웹소설 연재소
        </Link>

        <Link href="/search" className="text-sm text-gray-500 hover:underline">
          검색
        </Link>
        <Link href="/rules" className="text-sm text-gray-500 hover:underline">
          이용규정
        </Link>
        <Link href="/adult" className="text-sm text-gray-500 hover:underline">
          🔞
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {status === "loading" ? null : user ? (
            <>
              <Link
                href="/write"
                className="text-sm px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                글쓰기
              </Link>
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="text-sm text-red-500 hover:underline"
                >
                  관리자
                </Link>
              )}
              <span className="text-sm flex items-center gap-1.5">
                {user.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                )}
                {user.name}
              </span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:underline"
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("discord")}
              className="text-sm px-3 py-1.5 rounded-md bg-[#5865F2] text-white hover:bg-[#4752c4]"
            >
              Discord 로그인
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}

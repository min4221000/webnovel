"use client";

import { signIn } from "next-auth/react";

function LoginInner() {
  // 로그인 후 항상 메인으로 (이전 페이지로 안 돌아감)
  return (
    <div className="max-w-sm mx-auto mt-20 text-center space-y-5">
      <div className="text-5xl">📖</div>
      <h1 className="text-xl font-bold">멤버 전용 연재 공간</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        지정된 Discord 서버 멤버만 이용할 수 있습니다.
        <br />
        Discord로 로그인해 주세요.
      </p>
      <button
        onClick={() => signIn("discord", { callbackUrl: "/" })}
        className="px-5 py-2.5 rounded-md bg-[#5865F2] text-white font-medium hover:opacity-90"
      >
        Discord로 로그인
      </button>
    </div>
  );
}

export default function LoginPage() {
  return <LoginInner />;
}

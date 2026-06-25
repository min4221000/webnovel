"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 콘솔에만 기록, 화면엔 기술적 내용 노출 안 함
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-sm mx-auto mt-24 text-center space-y-5">
      <div className="text-5xl">⚠️</div>
      <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        일시적인 오류로 페이지를 불러오지 못했습니다.
        <br />
        잠시 후 다시 시도해 주세요.
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={reset}
          className="text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="text-sm px-4 py-2 rounded-md border border-black/15 hover:border-indigo-400"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}

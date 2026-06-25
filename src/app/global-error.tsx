"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif",
          color: "#1a1a1a",
          background: "#ffffff",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "20rem" }}>
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            문제가 발생했습니다
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.7 }}>
            일시적인 오류로 페이지를 불러오지 못했습니다.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            style={{
              fontSize: "0.875rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}

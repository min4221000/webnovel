"use client";

import { useEffect, useState } from "react";

// 가이드 스크린샷 — 본문에선 높이를 제한해 작게 보이고, 클릭하면 전체 화면으로 확대.
export default function GuideImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);

  // 확대 모달 열렸을 때 Esc로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <figure className="my-4 rounded-lg border border-black/10 dark:border-white/15 overflow-hidden bg-black/[0.02] dark:bg-white/[0.03]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onClick={() => setOpen(true)}
          className="block w-full max-h-[460px] object-contain object-top cursor-zoom-in hover:opacity-90 transition-opacity"
        />
        {caption && (
          <figcaption className="px-3 py-2 text-xs text-gray-500 border-t border-black/10 dark:border-white/10">
            {caption} <span className="text-gray-400">· 클릭하면 크게</span>
          </figcaption>
        )}
      </figure>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            type="button"
            aria-label="닫기"
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

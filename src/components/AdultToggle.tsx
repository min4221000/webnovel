"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdultToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [adult, setAdult] = useState(initial);
  const [busy, setBusy] = useState(false);

  const set = async (next: boolean) => {
    if (next) {
      if (!confirm("본인은 만 19세 이상이며, 성인(18+) 콘텐츠 열람에 동의합니다.")) return;
    }
    setBusy(true);
    const res = await fetch("/api/me/adult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adult: next }),
    });
    setBusy(false);
    if (res.ok) {
      setAdult(next);
      router.refresh();
    } else {
      alert(await res.text());
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">
        현재 상태:{" "}
        <strong className={adult ? "text-red-500" : "text-gray-500"}>
          {adult ? "18+ 열람 ON" : "OFF (성인 작품 숨김)"}
        </strong>
      </span>
      {adult ? (
        <button
          onClick={() => set(false)}
          disabled={busy}
          className="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50"
        >
          끄기
        </button>
      ) : (
        <button
          onClick={() => set(true)}
          disabled={busy}
          className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm disabled:opacity-50"
        >
          만 19세 이상 — 18+ 켜기
        </button>
      )}
    </div>
  );
}

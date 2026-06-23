"use client";

import { useState } from "react";

/** 신작 알림(모든 새 소설) 수신 on/off — 프로필의 notifyNewNovels와 같은 글로벌 설정 */
export default function NewNovelAlertToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const next = !on;
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyNewNovels: next }),
      });
      if (res.ok) {
        setOn(next);
        setMsg(next ? "신작 알림 켜짐 — 웹후크 설정돼 있어야 도착해요" : "신작 알림 꺼짐");
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg("설정 저장 실패");
      }
    } catch {
      setMsg("네트워크 오류 — 다시 시도하세요");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={on}
        title="모든 새 소설 등록 시 내 Discord 웹후크로 알림을 받습니다 (프로필에서도 설정 가능)"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors disabled:opacity-50 ${
          on
            ? "bg-emerald-600 text-white border-emerald-600"
            : "bg-transparent border-black/20 dark:border-white/20 hover:border-emerald-400"
        }`}
      >
        {on ? "📚 신작 알림 켜짐" : "🔔 신작 알림 받기"}
      </button>
      {msg && <span className="text-xs text-gray-400">{msg}</span>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export default function FollowButton({
  authorId,
  initialFollowing,
}: {
  authorId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await apiFetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId }),
      });
      const d = await res.json();
      setFollowing(d.following);
      setMsg(d.following ? "팔로우 — 새 회차 알림이 옵니다 (웹후크 설정 시)" : "팔로우 해제");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        title="이 작가를 팔로우하면 새 회차가 올라올 때 내 Discord 웹후크로 알림이 옵니다"
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all active:scale-95 disabled:opacity-50 ${
          following
            ? "bg-slate-100 text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-500"
            : "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
        }`}
      >
        {following ? "✓ 팔로잉" : "+ 팔로우"}
      </button>
      {msg && (
        <span className="absolute top-full right-0 mt-1 text-xs text-slate-400 whitespace-nowrap">
          {msg}
        </span>
      )}
    </div>
  );
}

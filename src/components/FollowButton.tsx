"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

/** 작가 팔로우 토글 — 팔로우하면 그 작가의 새 회차가 내 웹후크로 알림 (작가 페이지용) */
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
    <div className="flex flex-col items-end gap-0.5">
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        title="이 작가를 팔로우하면 새 회차가 올라올 때 내 Discord 웹후크로 알림이 옵니다"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors disabled:opacity-50 ${
          following
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-transparent border-black/20 dark:border-white/20 hover:border-indigo-400"
        }`}
      >
        {following ? "✓ 팔로잉" : "+ 팔로우"}
      </button>
      {msg && <span className="text-xs text-gray-400">{msg}</span>}
    </div>
  );
}

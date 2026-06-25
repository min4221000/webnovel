"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { apiFetch } from "@/lib/apiFetch";

export default function ReportButton({
  targetType,
  targetId,
  className = "text-xs text-gray-400 hover:text-red-500",
}: {
  targetType: "chapter" | "comment";
  targetId: string;
  className?: string;
}) {
  const { data: session } = useSession();
  const [done, setDone] = useState(false);

  const onClick = async () => {
    if (!session?.user) {
      signIn("discord");
      return;
    }
    const reason = window.prompt("신고 사유를 입력하세요. (도배/욕설/저작권/기타)");
    if (!reason || !reason.trim()) return;
    try {
      await apiFetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason }),
      });
      setDone(true);
      alert("신고가 접수되었습니다. 관리자가 검토합니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "신고 실패");
    }
  };

  return (
    <button type="button" onClick={onClick} className={className} disabled={done}>
      {done ? "신고됨" : "🚩 신고"}
    </button>
  );
}

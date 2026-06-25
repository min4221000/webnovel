"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

export default function DeleteButton({
  url,
  redirectTo,
  label = "삭제",
  confirmMsg = "삭제할까요?",
  className = "text-xs text-gray-400 hover:text-red-500",
}: {
  url: string;
  redirectTo?: string;
  label?: string;
  confirmMsg?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    try {
      await apiFetch(url, { method: "DELETE" });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 실패");
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={onClick} disabled={busy} className={className}>
      {busy ? "처리 중…" : label}
    </button>
  );
}

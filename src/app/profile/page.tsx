"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status !== "authenticated") return;
    fetch("/api/me").then(r => r.json()).then((d) => {
      setOrigin(d.nickname ?? null);
      setNickname(d.nickname ?? "");
    });
  }, [status, router]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setOrigin(d.nickname);
      setMsg("저장됨. 다음 로그인 시 적용됩니다.");
    } else {
      setMsg("저장 실패");
    }
  };

  if (status === "loading") return <p className="text-sm text-gray-500">로딩 중…</p>;

  return (
    <div className="max-w-md mx-auto py-10 space-y-6">
      <h1 className="text-xl font-bold">프로필 설정</h1>

      <div className="space-y-1">
        <p className="text-sm text-gray-500">Discord 이름: <span className="font-medium">{session?.user?.name}</span></p>
        {process.env.NEXT_PUBLIC_GUILD_NAME && (
          <p className="text-xs text-indigo-500">서버 닉네임 자동 적용 중 ({process.env.NEXT_PUBLIC_GUILD_NAME})</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium block">커스텀 닉네임 (최대 30자)</label>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value.slice(0, 30))}
          placeholder="비워두면 Discord 이름 사용"
          className="w-full border border-black/20 dark:border-white/20 rounded-md px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {origin && (
          <button
            type="button"
            onClick={() => setNickname("")}
            className="text-xs text-gray-400 hover:underline"
          >
            닉네임 초기화 (Discord 이름으로 되돌리기)
          </button>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>

      {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
    </div>
  );
}

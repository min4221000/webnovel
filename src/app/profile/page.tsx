"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdultToggle from "@/components/AdultToggle";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [adult, setAdult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status !== "authenticated") return;
    fetch("/api/me").then(r => r.json()).then((d) => {
      setOrigin(d.nickname ?? null);
      setNickname(d.nickname ?? "");
      setWebhookUrl(d.webhookUrl ?? "");
      setAdult(d.adult ?? false);
    });
  }, [status, router]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    setErr("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, webhookUrl }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setOrigin(d.nickname);
      setWebhookUrl(d.webhookUrl ?? "");
      setMsg("저장됨. 닉네임은 다음 로그인 시 적용됩니다.");
    } else {
      setErr(await res.text().catch(() => "저장 실패"));
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

      <div className="space-y-2 border-t border-black/10 dark:border-white/15 pt-5">
        <label className="text-sm font-medium block">북마크 새 회차 알림 웹후크 (선택)</label>
        <p className="text-xs text-gray-400 leading-relaxed">
          내가 북마크한 소설에 새 회차가 올라오면 지정한 Discord 채널로 자동 알림이 갑니다.
          <br />
          채널 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사 후 붙여넣기.
          <br />
          <span className="text-amber-500">⚠ 웹후크 URL은 비밀입니다. 노출 시 누구나 그 채널에 글을 쓸 수 있습니다.</span>
        </p>
        <input
          value={webhookUrl}
          onChange={e => setWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="w-full border border-black/20 dark:border-white/20 rounded-md px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {webhookUrl && (
          <button
            type="button"
            onClick={() => setWebhookUrl("")}
            className="text-xs text-gray-400 hover:underline"
          >
            웹후크 제거 (알림 끄기)
          </button>
        )}
      </div>

      {adult !== null && (
        <div className="space-y-2 border-t border-black/10 dark:border-white/15 pt-5">
          <p className="text-sm font-medium">🔞 시크릿 플러스</p>
          <AdultToggle initial={adult} />
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>

      {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
      {err && <p className="text-sm text-red-500">{err}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdultToggle from "@/components/AdultToggle";
import { apiFetch } from "@/lib/apiFetch";

// 알림 토글 한 줄 (카드형)
function ToggleRow({
  checked,
  onChange,
  icon,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: string;
  title: string;
  desc: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-black/10 dark:border-white/10 p-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 mt-0.5 shrink-0"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{icon} {title}</span>
        <span className="block text-xs text-gray-400 leading-relaxed mt-0.5">{desc}</span>
      </span>
    </label>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [origin, setOrigin] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyAllChapters, setNotifyAllChapters] = useState(false);
  const [previewBookmarkBody, setPreviewBookmarkBody] = useState(false);
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
      setNotifyAllChapters(d.notifyAllChapters ?? false);
      setPreviewBookmarkBody(d.previewBookmarkBody ?? false);
      setAdult(d.adult ?? false);
    });
  }, [status, router]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await apiFetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, webhookUrl, notifyAllChapters, previewBookmarkBody }),
      });
      const d = await res.json();
      setOrigin(d.nickname);
      setWebhookUrl(d.webhookUrl ?? "");
      setMsg("저장됨. 모든 작품·댓글에 즉시 반영됩니다 (본인 네비바 표시는 다음 로그인 후).");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
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

      {/* ── 알림 설정 ── */}
      <div className="border-t border-black/10 dark:border-white/15 pt-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold">🔔 알림 설정</h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            모든 알림은 Discord 웹후크로 받습니다. 먼저 채널을 연결하고, 받고 싶은 알림을 고르세요.
          </p>
        </div>

        {/* 1단계: 채널 연결 */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">① 알림 받을 Discord 채널</label>
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full border border-black/20 dark:border-white/20 rounded-md px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 leading-relaxed">
            Discord에서 <strong>채널 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사</strong> 후 붙여넣기.
            <br />
            <span className="text-amber-500">⚠ 이 URL은 비밀입니다. 노출되면 누구나 그 채널에 글을 쓸 수 있어요.</span>
          </p>
          {webhookUrl && (
            <button
              type="button"
              onClick={() => setWebhookUrl("")}
              className="text-xs text-gray-400 hover:underline"
            >
              웹후크 제거 (알림 전부 끄기)
            </button>
          )}
        </div>

        {/* 2단계: 받을 알림 종류 */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">② 어떤 알림을 받을지</label>
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-1">
            <p>☆ <strong>북마크한 작품</strong>의 새 회차는 위 채널만 연결돼 있으면 <strong>항상</strong> 옵니다. (작품 페이지의 ☆ 버튼)</p>
            <p>＋ <strong>팔로우한 작가</strong>의 새 회차도 항상 옵니다. (작가 페이지의 <strong>팔로우</strong> 버튼 → 그 작가의 모든 작품)</p>
          </div>
          <ToggleRow
            checked={notifyAllChapters}
            onChange={setNotifyAllChapters}
            icon="📖"
            title="모든 작품의 새 회차"
            desc="북마크·팔로우와 무관하게, 누군가 새 회차를 올리면 전부 알림이 옵니다."
          />
        </div>

        {/* 3단계: 상세 */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">③ 알림 상세</label>
          <ToggleRow
            checked={previewBookmarkBody}
            onChange={setPreviewBookmarkBody}
            icon="📝"
            title="회차 알림에 본문 미리보기 포함"
            desc={<>켜면 회차 본문·이미지가 함께 옵니다. 끄면 제목+링크만. <span className="text-amber-500">스포일러가 싫으면 꺼두세요.</span> (기본: 꺼짐)</>}
          />
        </div>
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

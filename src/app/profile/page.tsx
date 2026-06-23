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
  const [notifyNewNovels, setNotifyNewNovels] = useState(false);
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
      setNotifyNewNovels(d.notifyNewNovels ?? false);
      setPreviewBookmarkBody(d.previewBookmarkBody ?? false);
      setAdult(d.adult ?? false);
    });
  }, [status, router]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, webhookUrl, notifyNewNovels, previewBookmarkBody }),
      });
      if (res.ok) {
        const d = await res.json();
        setOrigin(d.nickname);
        setWebhookUrl(d.webhookUrl ?? "");
        setMsg("저장됨. 모든 작품·댓글에 즉시 반영됩니다 (본인 네비바 표시는 다음 로그인 후).");
      } else {
        setErr(await res.text().catch(() => "저장 실패"));
      }
    } catch {
      setErr("네트워크 오류 — 다시 시도하세요");
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

      <div className="space-y-2 border-t border-black/10 dark:border-white/15 pt-5">
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={notifyNewNovels && previewBookmarkBody}
            onChange={(e) => {
              setNotifyNewNovels(e.target.checked);
              setPreviewBookmarkBody(e.target.checked);
            }}
            className="w-4 h-4 mt-0.5"
          />
          <span>
            <strong>📢 전체 알림 켜기</strong>
          </span>
        </label>
        <p className="text-xs text-gray-400 leading-relaxed pl-6">
          한 번에 <strong>신작 알림 + 본문 미리보기</strong>를 모두 켭니다. 아래에서 개별로 다시 끌 수 있어요.
          <br />
          (북마크한 소설의 새 회차 알림은 ☆ 북마크 + 위 웹후크만 설정하면 자동으로 옵니다.)
        </p>
      </div>

      <div className="space-y-2 border-t border-black/10 dark:border-white/15 pt-5">
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={previewBookmarkBody}
            onChange={(e) => setPreviewBookmarkBody(e.target.checked)}
            className="w-4 h-4 mt-0.5"
          />
          <span>
            <strong>📖 북마크 새 회차 알림에 본문 미리보기 포함</strong>
          </span>
        </label>
        <p className="text-xs text-gray-400 leading-relaxed pl-6">
          켜면, 내가 북마크한 소설의 새 회차 알림에 <strong>본문 내용</strong>이 함께 옵니다 (디코 한도까지).
          <br />
          끄면 <strong>제목 + 바로가기 링크만</strong> 옵니다. <span className="text-amber-500">스포일러가 싫으면 꺼두세요.</span>
          <br />
          (기본값: 꺼짐)
        </p>
      </div>

      <div className="space-y-2 border-t border-black/10 dark:border-white/15 pt-5">
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={notifyNewNovels}
            onChange={(e) => setNotifyNewNovels(e.target.checked)}
            className="w-4 h-4 mt-0.5"
          />
          <span>
            <strong>📚 신작 알림 받기</strong>
          </span>
        </label>
        <p className="text-xs text-gray-400 leading-relaxed pl-6">
          켜면, 작가가 <strong>새 소설</strong>을 등록하면서 &ldquo;신작 알림 보내기&rdquo;를 체크해 저장할 때
          위 웹후크 채널로 <strong>새 소설 등록 알림</strong>이 갑니다.
          <br />
          (북마크 알림은 &ldquo;내가 북마크한 소설의 새 회차&rdquo;만 — 신작 알림은 별개입니다.)
          <br />
          <span className="text-amber-500">⚠ 위 웹후크가 설정돼 있어야 알림이 옵니다.</span> 19+ 신작은
          시크릿 플러스를 켠 경우에만 알림이 갑니다.
        </p>
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

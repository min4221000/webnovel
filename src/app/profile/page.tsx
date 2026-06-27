"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdultToggle from "@/components/AdultToggle";
import { apiFetch } from "@/lib/apiFetch";

function Toggle({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: ReactNode;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm text-slate-700">
        {title}
        <span className="block text-xs text-slate-400 font-normal mt-0.5">{desc}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-block w-11 h-6 shrink-0 rounded-full transition-colors ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "right-0.5" : "left-0.5"}`} />
      </button>
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

  if (status === "loading") return <p className="text-sm text-slate-400">로딩 중…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">내 정보</h1>

      {/* 프로필 카드 */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 h-20" />
        <div className="px-5 sm:px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4 pt-5">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="w-20 h-20 shrink-0 rounded-2xl ring-4 ring-white shadow-md object-cover" />
            ) : (
              <span className="w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-2xl font-black ring-4 ring-white shadow-md">
                {session?.user?.name?.charAt(0) ?? "?"}
              </span>
            )}
            <div className="pb-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{session?.user?.name}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#5865F2]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5865F2]">
                  Discord 연결됨
                </span>
              </div>
              {process.env.NEXT_PUBLIC_GUILD_NAME && (
                <p className="text-xs text-slate-400 mt-0.5">서버 닉네임 자동 적용 중 ({process.env.NEXT_PUBLIC_GUILD_NAME})</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 닉네임 */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card p-5 sm:p-6 space-y-3">
        <h2 className="font-bold text-slate-900">커스텀 닉네임 (최대 30자)</h2>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value.slice(0, 30))}
          placeholder="비워두면 Discord 이름 사용"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 bg-white text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
        {origin && (
          <button
            type="button"
            onClick={() => setNickname("")}
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
          >
            닉네임 초기화 (Discord 이름으로 되돌리기)
          </button>
        )}
      </section>

      {/* 알림 (웹후크) 설정 */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-card p-5 sm:p-6">
        <h2 className="font-bold text-slate-900">알림 (웹후크) 설정</h2>
        <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
          북마크·팔로우한 작품의 새 회차를 <strong className="font-semibold text-slate-700">내 Discord 채널</strong>로 받습니다.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            ① 알림 받을 Discord 채널 (웹후크 URL)
          </label>
          <input
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-mono text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />
          {webhookUrl ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              채널이 연결되어 있습니다.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Discord에서 <strong>채널 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사</strong> 후 붙여넣기.
              <br /><span className="text-amber-500">이 URL은 비밀입니다. 노출되면 누구나 그 채널에 글을 쓸 수 있어요.</span>
            </p>
          )}
          {webhookUrl && (
            <button
              type="button"
              onClick={() => setWebhookUrl("")}
              className="text-xs text-slate-400 hover:text-rose-500 transition-colors mt-1"
            >
              웹후크 제거 (알림 전부 끄기)
            </button>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          <p className="text-sm font-semibold text-slate-700">② 받을 알림 고르기</p>
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-xs text-slate-600 leading-relaxed space-y-1">
            <p>★ <strong>북마크한 작품</strong>의 새 회차는 채널만 연결돼 있으면 <strong>항상</strong> 옵니다.</p>
            <p>+ <strong>팔로우한 작가</strong>의 새 회차도 항상 옵니다.</p>
          </div>
          <Toggle
            checked={notifyAllChapters}
            onChange={setNotifyAllChapters}
            title="모든 작품의 새 회차"
            desc="북마크·팔로우와 무관하게, 누군가 새 회차를 올리면 전부 알림이 옵니다."
          />
          <Toggle
            checked={previewBookmarkBody}
            onChange={setPreviewBookmarkBody}
            title="본문 미리보기 포함"
            desc={<>알림에 본문·이미지를 함께 표시합니다. <span className="text-amber-500">스포일러가 싫으면 꺼두세요.</span></>}
          />
        </div>
      </section>

      {/* 시크릿 플러스 */}
      {adult !== null && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-card p-5 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-3">시크릿 플러스</h2>
          <AdultToggle initial={adult} />
        </section>
      )}

      {/* 저장 */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        {err && <p className="text-sm text-rose-500">{err}</p>}
      </div>
    </div>
  );
}

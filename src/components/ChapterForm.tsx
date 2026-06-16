"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Editor from "@/components/editor/Editor";
import { MAX_CHARS, MAX_IMAGES_PER_CHAPTER } from "@/lib/constants";

type Props = {
  novelId: string;
  chapterId?: string; // 있으면 수정 모드
  redirectNum?: number; // 수정 후 이동할 회차 번호
  initialTitle?: string;
  initialContent?: string;
};

export default function ChapterForm({
  novelId,
  chapterId,
  redirectNum,
  initialTitle = "",
  initialContent = "",
}: Props) {
  const editing = !!chapterId;
  const { data: session, status } = useSession();
  const router = useRouter();
  const draftKey = editing ? `draft:chapter:edit:${chapterId}` : `draft:chapter:${novelId}`;

  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [draftInfo, setDraftInfo] = useState<{ title: string; content: string } | null>(null);

  // 드래프트 존재 확인 (마운트 1회) — 자동 덮어쓰기 대신 배너로 안내
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as { title?: string; content?: string };
        if ((d.content && d.content.length > 10) || d.title) {
          setDraftInfo({ title: d.title ?? "", content: d.content ?? "" });
        }
      }
    } catch {
      /* ignore */
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDraft = () => {
    if (!draftInfo) return;
    setTitle(draftInfo.title);
    setContent(draftInfo.content);
    setDraftInfo(null);
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    setDraftInfo(null);
  };

  // 30초마다 자동 임시저장
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      if (title || content) {
        localStorage.setItem(draftKey, JSON.stringify({ title, content }));
        setSavedAt(new Date().toLocaleTimeString());
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [ready, title, content, draftKey]);

  if (status === "loading" || !ready)
    return <p className="text-sm text-gray-400">불러오는 중…</p>;
  if (!session?.user) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-500">글쓰기는 Discord 로그인이 필요합니다.</p>
        <button onClick={() => signIn("discord")} className="px-4 py-2 rounded-md bg-[#5865F2] text-white">
          Discord 로그인
        </button>
      </div>
    );
  }

  const submit = async () => {
    setErr(null);
    if (!title.trim()) return setErr("회차 제목을 입력하세요.");
    setBusy(true);
    try {
      const url = editing ? `/api/chapters/${chapterId}` : `/api/novels/${novelId}/chapters`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) throw new Error(await res.text());
      localStorage.removeItem(draftKey);
      if (editing) {
        router.push(`/novel/${novelId}/chapter/${redirectNum}`);
        router.refresh();
      } else {
        const { chapterNum } = await res.json();
        router.push(`/novel/${novelId}/chapter/${chapterNum}`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{editing ? "회차 수정" : "회차 작성"}</h1>
        {savedAt && <span className="text-xs text-gray-400">임시저장됨 {savedAt}</span>}
      </div>

      {/* 임시저장 불러오기 배너 (이 브라우저에만 저장됨 — 나만 보임) */}
      {draftInfo && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-sm">
          <span className="flex-1">
            💾 임시저장된 글이 있습니다.{" "}
            {draftInfo.title && <strong>“{draftInfo.title}”</strong>}
          </span>
          <button onClick={loadDraft} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">
            불러오기
          </button>
          <button onClick={discardDraft} className="px-2 py-1 rounded border text-xs text-gray-500">
            버리기
          </button>
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="w-full border rounded-md px-3 py-2 bg-transparent text-lg font-semibold"
        placeholder="회차 제목"
      />

      <Editor content={content} onChange={setContent} />

      {err && <p className="text-sm text-red-500 whitespace-pre-wrap">{err}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50"
        >
          {busy ? "저장 중…" : editing ? "저장" : "발행"}
        </button>
        <button
          onClick={() => {
            localStorage.setItem(draftKey, JSON.stringify({ title, content }));
            setSavedAt(new Date().toLocaleTimeString());
          }}
          className="px-4 py-2 rounded-md border"
        >
          임시저장
        </button>
        <span className="ml-auto self-center text-xs text-gray-400">
          최대 {MAX_CHARS.toLocaleString()}자 · 이미지 {MAX_IMAGES_PER_CHAPTER}장 · 임시저장은 이 브라우저에만(나만 보임)
        </span>
      </div>
    </div>
  );
}

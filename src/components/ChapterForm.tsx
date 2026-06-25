"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Editor from "@/components/editor/Editor";
import ChapterReader from "@/components/ChapterReader";
import { MAX_CHARS, MAX_IMAGES_PER_CHAPTER } from "@/lib/constants";
import { apiFetch } from "@/lib/apiFetch";

type Props = {
  novelId: string;
  chapterId?: string;
  redirectNum?: number;
  initialTitle?: string;
  initialContent?: string;
  initialHidden?: boolean;
};

export default function ChapterForm({
  novelId,
  chapterId,
  redirectNum,
  initialTitle = "",
  initialContent = "",
  initialHidden = false,
}: Props) {
  const editing = !!chapterId;
  const { data: session, status } = useSession();
  const router = useRouter();
  const draftKey = editing ? `draft:chapter:edit:${chapterId}` : `draft:chapter:${novelId}`;

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [editorKey, setEditorKey] = useState(0);
  const [customNum, setCustomNum] = useState("");
  const [hidden, setHidden] = useState(initialHidden);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [draftInfo, setDraftInfo] = useState<{ title: string; content: string } | null>(null);

  // ref로 최신 값 유지 — 클로저 버그 방지 (interval이 stale 값 읽는 문제)
  const latestTitle = useRef(title);
  const latestContent = useRef(content);
  const isDirtyRef = useRef(false);   // 새로고침 방지용
  const mountedRef = useRef(false);   // onCreate 호출 무시용 (에디터 초기화 시 onChange 발화)

  // 드래프트 존재 확인 (마운트 1회)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as { title?: string; content?: string };
        if ((d.content && d.content.length > 10) || d.title) {
          setDraftInfo({ title: d.title ?? "", content: d.content ?? "" });
        }
      }
    } catch { /* ignore */ }
    setReady(true);
    // 마운트 직후 약간의 딜레이 후 dirty 추적 시작 (에디터 onCreate 무시)
    const t = setTimeout(() => { mountedRef.current = true; }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새로고침/탭 닫기 방지 — 마운트 시 한 번만 등록, ref로 최신 dirty 읽음
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // 30초 자동 임시저장 — deps에 title/content 없음, ref로 최신값 읽음 → 타이핑해도 리셋 안 됨
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      const t = latestTitle.current;
      const c = latestContent.current;
      if (t || c) {
        localStorage.setItem(draftKey, JSON.stringify({ title: t, content: c }));
        setSavedAt(new Date().toLocaleTimeString());
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [ready, draftKey]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitle(v);
    latestTitle.current = v;
    if (mountedRef.current) isDirtyRef.current = true;
  };

  const handleContentChange = (html: string) => {
    setContent(html);
    latestContent.current = html;
    if (mountedRef.current) isDirtyRef.current = true;
  };

  const loadDraft = () => {
    if (!draftInfo) return;
    setTitle(draftInfo.title);
    setContent(draftInfo.content);
    latestTitle.current = draftInfo.title;
    latestContent.current = draftInfo.content;
    setEditorKey((k) => k + 1); // Tiptap은 content prop 변경 무시 → remount 강제
    setDraftInfo(null);
    isDirtyRef.current = true;
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    setDraftInfo(null);
  };

  const saveDraftManual = () => {
    localStorage.setItem(draftKey, JSON.stringify({ title: latestTitle.current, content: latestContent.current }));
    setSavedAt(new Date().toLocaleTimeString());
  };

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
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, hidden, ...(customNum ? { chapterNum: Number(customNum) } : {}) }),
      });
      isDirtyRef.current = false;
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

  // 비공개 회차 → 공개 전환 + 북마커 디코 알림 (수정 페이지 전용)
  const publishAndNotify = async () => {
    setErr(null);
    if (!title.trim()) return setErr("회차 제목을 입력하세요.");
    if (!confirm("이 회차를 공개하고, 북마크한 사람에게 디코 알림을 보냅니다. 진행할까요?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true, title, content }),
      });
      isDirtyRef.current = false;
      localStorage.removeItem(draftKey);
      router.push(`/novel/${novelId}/chapter/${redirectNum}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "발행 실패");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{editing ? "회차 수정" : "회차 작성"}</h1>
        {savedAt && <span className="text-xs text-gray-400">임시저장됨 {savedAt}</span>}
      </div>

      {/* 임시저장 불러오기 배너 */}
      {draftInfo && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-sm">
          <span className="flex-1">
            💾 임시저장된 글이 있습니다.
            {draftInfo.title && <strong> &ldquo;{draftInfo.title}&rdquo;</strong>}
          </span>
          <button onClick={loadDraft} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">
            불러오기
          </button>
          <button onClick={discardDraft} className="px-2 py-1 rounded border text-xs text-gray-500">
            버리기
          </button>
        </div>
      )}

      {!editing && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={customNum}
            onChange={(e) => setCustomNum(e.target.value.replace(/\D/g, ""))}
            className="w-24 border rounded-md px-3 py-2 bg-transparent text-sm"
            placeholder="회차 (자동)"
          />
          <span className="text-xs text-gray-400">비워두면 자동 번호 부여</span>
        </div>
      )}

      <input
        value={title}
        onChange={handleTitleChange}
        maxLength={120}
        className="w-full border rounded-md px-3 py-2 bg-transparent text-lg font-semibold"
        placeholder="회차 제목"
      />

      {/* 쓰기 / 미리보기 탭 */}
      <div className="flex gap-1 border-b border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={() => setTab("write")}
          className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
            tab === "write"
              ? "border-indigo-600 text-indigo-600 font-medium"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          쓰기
        </button>
        <button
          type="button"
          onClick={() => setTab("preview")}
          className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
            tab === "preview"
              ? "border-indigo-600 text-indigo-600 font-medium"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          미리보기 (독자 화면)
        </button>
      </div>

      {tab === "write" ? (
        <Editor
          key={editorKey}
          content={content}
          onChange={handleContentChange}
        />
      ) : (
        <div className="border border-black/15 dark:border-white/20 rounded-lg min-h-[420px] bg-[var(--background)] px-4">
          {content ? (
            <ChapterReader html={content} />
          ) : (
            <p className="text-gray-400 text-sm p-4">아직 내용이 없습니다.</p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
          className="w-4 h-4"
        />
        <span><strong>비공개</strong> — 나만 볼 수 있습니다. 회차 수정에서 공개로 바꿀 수 있습니다.</span>
      </label>

      {/* 비공개 회차 발행: 공개 전환 + 북마커 디코 알림 (수정 페이지 전용) */}
      {editing && initialHidden && (
        <div className="rounded-lg border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-3 space-y-2">
          <p className="text-sm">
            🔒 <strong>비공개 회차</strong>입니다. 아래 버튼을 누르면 <strong>공개로 전환</strong>되고,{" "}
            이 소설을 <strong>북마크한 사람에게 디코 알림</strong>이 발송됩니다.
          </p>
          <p className="text-xs text-gray-400">
            본문 미리보기 포함 여부는 받는 사람이 각자 프로필에서 설정합니다.
          </p>
          <button
            onClick={publishAndNotify}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm disabled:opacity-50"
          >
            {busy ? "발행 중…" : "📢 공개 + 알림 발송"}
          </button>
        </div>
      )}

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
          onClick={saveDraftManual}
          className="px-4 py-2 rounded-md border"
        >
          임시저장
        </button>
        <span className="ml-auto self-center text-xs text-gray-400">
          최대 {MAX_CHARS.toLocaleString()}자 · 이미지 {MAX_IMAGES_PER_CHAPTER}장 · 임시저장은 이 브라우저에만
        </span>
      </div>
    </div>
  );
}

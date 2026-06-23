"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { compressAndUpload } from "@/lib/uploadImage";

const TAG_GROUPS = [
  ["사니", "나모", "키위", "학부생", "손님", "주인공"],
  ["일반", "유머", "피폐", "달달"],
  ["장편", "단편"],
  ["시크릿 플러스"],
];
const EXCLUSIVE = ["장편", "단편"];

type Props = {
  novelId?: string;
  initial?: {
    title: string;
    description: string;
    tags: string;
    coverImage: string | null;
    isAdult?: boolean;
    hidden?: boolean;
    status?: string;
    newNovelNotified?: boolean;
  };
};

const STATUS_OPTIONS = [
  { value: "ongoing", label: "연재중" },
  { value: "completed", label: "완결" },
  { value: "hiatus", label: "휴재" },
];

export default function NovelForm({ novelId, initial }: Props) {
  const editing = !!novelId;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initial?.tags ? initial.tags.split(",").map((t) => t.trim()).filter(Boolean) : []
  );
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);
  const [isAdult, setIsAdult] = useState<boolean>(initial?.isAdult ?? false);
  const [hidden, setHidden] = useState<boolean>(initial?.hidden ?? false);
  const [statusVal, setStatusVal] = useState<string>(initial?.status ?? "ongoing");
  const alreadyAnnounced = initial?.newNovelNotified ?? false;
  const [sendAlert, setSendAlert] = useState(false); // 신작 알림 보내기 (저장 시 발송)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    if (tag === "시크릿 플러스") {
      const next = !selectedTags.includes(tag);
      setIsAdult(next);
      setSelectedTags((prev) =>
        next ? [...prev.filter((t) => t !== tag), tag] : prev.filter((t) => t !== tag)
      );
      return;
    }
    if (EXCLUSIVE.includes(tag)) {
      const active = selectedTags.includes(tag);
      setSelectedTags((prev) => {
        const without = prev.filter((t) => !EXCLUSIVE.includes(t));
        return active ? without : [...without, tag];
      });
      return;
    }
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const setAdult = (next: boolean) => {
    setIsAdult(next);
    if (next && !selectedTags.includes("시크릿 플러스")) {
      setSelectedTags((prev) => [...prev, "시크릿 플러스"]);
    } else if (!next) {
      setSelectedTags((prev) => prev.filter((t) => t !== "시크릿 플러스"));
    }
  };

  if (status === "loading") return <p className="text-sm text-gray-400">불러오는 중…</p>;
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

  const onCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setBusy(true);
      setCoverImage(await compressAndUpload(file));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setErr(null);
    if (!title.trim()) return setErr("제목을 입력하세요.");
    setBusy(true);
    try {
      const url = editing ? `/api/novels/${novelId}` : "/api/novels";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, coverImage, isAdult, hidden, status: statusVal, tags: selectedTags, announce: sendAlert && !hidden }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (editing) {
        router.push(`/novel/${novelId}`);
        router.refresh();
      } else {
        const { id } = await res.json();
        router.push(`/write/${id}/chapter/new`);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">{editing ? "소설 정보 수정" : "새 소설 등록"}</h1>

      <div className="space-y-1">
        <label className="text-sm font-medium flex justify-between">
          <span>제목 *</span>
          <span className="text-xs text-gray-400">{title.length}/30</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 30))}
          maxLength={30}
          className="w-full border rounded-md px-3 py-2 bg-transparent"
          placeholder="작품 제목"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium flex justify-between">
          <span>설명</span>
          <span className="text-xs text-gray-400">{description.length}/200</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 200))}
          maxLength={200}
          rows={3}
          className="w-full border rounded-md px-3 py-2 bg-transparent resize-none"
          placeholder="작품 소개 (200자 이내)"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">태그</label>
        <div className="space-y-2">
          {TAG_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-wrap gap-2">
              {group.map((tag) => {
                const active = selectedTags.includes(tag);
                const isSecret = tag === "시크릿 플러스";
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      active
                        ? isSecret
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-indigo-600 text-white border-indigo-600"
                        : "bg-transparent border-black/20 dark:border-white/20 hover:border-indigo-400"
                    }`}
                  >
                    {isSecret ? "🔞 " : ""}{tag}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">연재 상태</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatusVal(s.value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                statusVal === s.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-transparent border-black/20 dark:border-white/20 hover:border-indigo-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">커버 이미지</label>
        <p className="text-xs text-gray-400">
          권장 크기: <strong>300 × 400px</strong> (세로형 3:4 비율) · 최대 <strong>2MB</strong> · JPG/PNG/WebP
          <br />업로드 시 자동으로 1920px 이하 / WebP 변환됩니다.
        </p>
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={onCover} className="text-sm" />
          {coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="h-20 rounded border" />
          )}
          {coverImage && (
            <button onClick={() => setCoverImage(null)} className="text-xs text-gray-400 hover:text-red-500">
              제거
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isAdult}
            onChange={(e) => setAdult(e.target.checked)}
            className="w-4 h-4"
          />
          <span>
            <strong className="text-red-500">🔞시크릿 플러스 작품</strong> — 시크릿 플러스를 켠
            이용자에게만 노출됩니다.
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => setHidden(e.target.checked)}
            className="w-4 h-4"
          />
          <span>
            <strong>비공개</strong> — 나만 볼 수 있습니다. 나중에 수정에서 공개로 바꿀 수 있습니다.
          </span>
        </label>

        {/* 신작 알림 — 비공개·시플처럼 체크하면 저장 시 발송. 이미 보냈으면 숨김. */}
        {!alreadyAnnounced && (
          <label className={`flex items-start gap-2 text-sm ${hidden ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={sendAlert && !hidden}
              disabled={hidden}
              onChange={(e) => setSendAlert(e.target.checked)}
              className="w-4 h-4 mt-0.5"
            />
            <span>
              <strong className="text-emerald-600">📚 신작 알림 보내기</strong> — 저장 시{" "}
              &ldquo;신작 알림 받기&rdquo;를 켠 이용자에게 발송됩니다. <strong>1회만</strong> 가능.
              {hidden && <span className="text-amber-500"> (공개 상태에서만)</span>}
            </span>
          </label>
        )}
        {alreadyAnnounced && (
          <p className="text-xs text-gray-400">📚 이 소설의 신작 알림은 이미 발송되었습니다.</p>
        )}
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="px-4 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50"
      >
        {busy ? "처리 중…" : editing ? "저장" : "등록하고 1화 쓰기 →"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { compressAndUpload } from "@/lib/uploadImage";
import { apiFetch } from "@/lib/apiFetch";

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
  };
};

const STATUS_OPTIONS = [
  { value: "ongoing", label: "연재중" },
  { value: "completed", label: "완결" },
  { value: "hiatus", label: "휴재" },
];

const tagBtnClass = (active: boolean, isSecret: boolean) =>
  `rounded-full px-3 py-1.5 text-[13px] font-medium border transition-colors ${
    active
      ? isSecret
        ? "bg-rose-500 border-rose-500 text-white hover:bg-rose-600"
        : "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
  }`;

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
  const [viewerAdult, setViewerAdult] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    if (tag === "시크릿 플러스") {
      const next = !selectedTags.includes(tag);
      if (next && !viewerAdult) {
        alert("시크릿 플러스를 먼저 켜야 합니다. 프로필 → 시크릿 플러스에서 설정하세요.");
        return;
      }
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
    if (next && !viewerAdult) {
      alert("시크릿 플러스를 먼저 켜야 합니다. 프로필 → 시크릿 플러스에서 설정하세요.");
      return;
    }
    setIsAdult(next);
    if (next && !selectedTags.includes("시크릿 플러스")) {
      setSelectedTags((prev) => [...prev, "시크릿 플러스"]);
    } else if (!next) {
      setSelectedTags((prev) => prev.filter((t) => t !== "시크릿 플러스"));
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/me").then(r => r.json()).then(d => setViewerAdult(d.adult ?? false)).catch(() => {});
    }
  }, [status]);

  if (status === "loading") return <p className="text-sm text-slate-400">불러오는 중…</p>;
  if (!session?.user) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-500">글쓰기는 Discord 로그인이 필요합니다.</p>
        <button onClick={() => signIn("discord")} className="px-4 py-2 rounded-lg bg-[#5865F2] text-white font-semibold hover:bg-[#4752c4] active:scale-95 transition">
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
      const res = await apiFetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, coverImage, isAdult, hidden, status: statusVal, tags: selectedTags }),
      });
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
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{editing ? "소설 정보 수정" : "새 소설 등록"}</h1>
        {!editing && <p className="mt-1 text-sm text-slate-500">작품 정보를 입력하고 첫 회차를 작성하세요.</p>}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* 커버 */}
          <div className="shrink-0">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">커버</label>
            {coverImage ? (
              <div className="relative w-28 h-40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="" className="w-28 h-40 object-cover rounded-xl shadow-sm" />
                <button
                  onClick={() => setCoverImage(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 text-white text-xs grid place-items-center hover:bg-rose-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="w-28 h-40 rounded-xl border-2 border-dashed border-slate-200 grid place-items-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors">
                <div className="text-slate-400">
                  <div className="text-2xl">+</div>
                  <p className="text-[11px] mt-1">300x400px<br />권장</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onCover} />
              </label>
            )}
            <p className="text-[10px] text-slate-400 mt-1.5 w-28 leading-tight">최대 15MB · JPG/PNG/WebP · 자동 압축</p>
          </div>

          <div className="flex-1 space-y-4">
            {/* 제목 */}
            <div>
              <label className="text-sm font-semibold text-slate-700 flex justify-between mb-1.5">
                <span>제목 *</span>
                <span className="text-xs text-slate-400 font-normal">{title.length}/30</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                maxLength={30}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                placeholder="작품 제목"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="text-sm font-semibold text-slate-700 flex justify-between mb-1.5">
                <span>설명</span>
                <span className="text-xs text-slate-400 font-normal">{description.length}/200</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm resize-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                placeholder="짧은 소개글"
              />
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">태그</label>
              <div className="space-y-1.5">
                {TAG_GROUPS.map((group, gi) => (
                  <div key={gi} className="flex flex-wrap gap-1.5">
                    {group.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={tagBtnClass(selectedTags.includes(tag), tag === "시크릿 플러스")}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 연재 상태 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">연재 상태</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatusVal(s.value)}
                    className={`rounded-full px-4 py-1.5 text-[13px] font-medium border transition-colors ${
                      statusVal === s.value
                        ? "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 옵션 토글 */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-slate-700">시크릿 플러스 (19+) — 켠 이용자에게만 노출</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAdult}
                  onClick={() => setAdult(!isAdult)}
                  className={`relative inline-block w-11 h-6 shrink-0 rounded-full transition-colors ${isAdult ? "bg-rose-500" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isAdult ? "right-0.5" : "left-0.5"}`} />
                </button>
              </label>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-sm text-slate-700">비공개로 저장 — 나만 볼 수 있음</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hidden}
                  onClick={() => setHidden(!hidden)}
                  className={`relative inline-block w-11 h-6 shrink-0 rounded-full transition-colors ${hidden ? "bg-indigo-600" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${hidden ? "right-0.5" : "left-0.5"}`} />
                </button>
              </label>
            </div>
          </div>
        </div>
      </section>

      {err && <p className="text-sm text-rose-500">{err}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
      >
        {busy ? "처리 중…" : editing ? "저장" : "등록하고 1화 쓰기 →"}
      </button>
    </div>
  );
}

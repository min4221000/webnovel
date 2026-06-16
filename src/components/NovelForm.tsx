"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { compressAndUpload } from "@/lib/uploadImage";

type Props = {
  novelId?: string;
  initial?: {
    title: string;
    description: string;
    tags: string;
    coverImage: string | null;
    isAdult?: boolean;
  };
};

export default function NovelForm({ novelId, initial }: Props) {
  const editing = !!novelId;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);
  const [isAdult, setIsAdult] = useState<boolean>(initial?.isAdult ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
        body: JSON.stringify({
          title,
          description,
          coverImage,
          isAdult,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
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
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">{editing ? "소설 정보 수정" : "새 소설 등록"}</h1>

      <div className="space-y-1">
        <label className="text-sm font-medium">제목 *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="w-full border rounded-md px-3 py-2 bg-transparent"
          placeholder="작품 제목"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">설명</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full border rounded-md px-3 py-2 bg-transparent"
          placeholder="작품 소개"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">태그 (쉼표로 구분)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border rounded-md px-3 py-2 bg-transparent"
          placeholder="판타지, 로맨스, 무협"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">커버 이미지</label>
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

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={isAdult}
          onChange={(e) => setIsAdult(e.target.checked)}
          className="w-4 h-4"
        />
        <span>
          <strong className="text-red-500">성인(18+) 작품</strong> — 18+ 열람을 켠
          이용자에게만 노출됩니다.
        </span>
      </label>

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

"use client";

import { useState } from "react";
import Link from "next/link";
import { displayName } from "@/lib/displayName";

type Tab = "unified" | "title" | "author";

type NovelResult = {
  novelId: string;
  title: string;
  coverImage: string | null;
  author: { id: string; username: string; nickname: string | null };
  chapterCount: number;
  snippetHtml: string | null;
  matchedChapter?: { num: number; title: string } | null;
};

type AuthorResult = {
  id: string;
  username: string;
  nickname: string | null;
  avatarUrl: string | null;
  novels: { id: string; title: string; coverImage: string | null; _count: { chapters: number } }[];
};

const TABS: { key: Tab; label: string }[] = [
  { key: "unified", label: "통합" },
  { key: "title", label: "제목" },
  { key: "author", label: "글쓴이" },
];

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>("unified");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [novels, setNovels] = useState<NovelResult[]>([]);
  const [authors, setAuthors] = useState<AuthorResult[]>([]);

  const run = async (t: Tab = tab) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?type=${t}&q=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    if (t === "author") {
      setAuthors(data.authors ?? []);
      setNovels([]);
    } else {
      setNovels(data.results ?? []);
      setAuthors([]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">검색</h1>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-black/10 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              if (q.trim()) run(t.key);
            }}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              tab === t.key
                ? "border-indigo-600 font-semibold"
                : "border-transparent text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 입력 */}
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder={
            tab === "author" ? "글쓴이 닉네임" : tab === "title" ? "작품 제목" : "제목·내용·태그·작가"
          }
          className="flex-1 border rounded-md px-3 py-2 bg-transparent"
        />
        <button
          onClick={() => run()}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white"
        >
          검색
        </button>
      </div>

      {/* 결과 */}
      {loading ? (
        <p className="text-sm text-gray-400">검색 중…</p>
      ) : !searched ? (
        <p className="text-sm text-gray-400">검색어를 입력하세요.</p>
      ) : tab === "author" ? (
        authors.length === 0 ? (
          <p className="text-sm text-gray-400">일치하는 글쓴이가 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {authors.map((a) => (
              <div key={a.id} className="border rounded-lg p-3">
                <Link href={`/author/${a.id}`} className="flex items-center gap-2 font-semibold">
                  {a.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  )}
                  {displayName(a)}
                </Link>
                <ul className="mt-2 pl-2 text-sm space-y-1">
                  {a.novels.map((n) => (
                    <li key={n.id}>
                      <Link href={`/novel/${n.id}`} className="hover:underline">
                        {n.title}{" "}
                        <span className="text-gray-400 text-xs">({n._count.chapters}화)</span>
                      </Link>
                    </li>
                  ))}
                  {a.novels.length === 0 && (
                    <li className="text-gray-400 text-xs">등록된 작품 없음</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : novels.length === 0 ? (
        <p className="text-sm text-gray-400">검색 결과가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {novels.map((n) => (
            <li key={n.novelId} className="border rounded-lg p-3 hover:border-indigo-400">
              <Link href={`/novel/${n.novelId}`} className="flex gap-3">
                {n.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.coverImage} alt="" className="w-14 h-18 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-14 h-[72px] rounded bg-black/5 dark:bg-white/10 shrink-0" />
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">{n.title}</h2>
                  <p className="text-xs text-gray-500">
                    {displayName(n.author)} · {n.chapterCount}화
                    {n.matchedChapter && ` · ${n.matchedChapter.num}화 "${n.matchedChapter.title}"`}
                  </p>
                  {n.snippetHtml && (
                    <p
                      className="text-xs text-gray-500 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: n.snippetHtml }}
                    />
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

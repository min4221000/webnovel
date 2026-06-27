"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { displayName } from "@/lib/displayName";
import { coverGradientFor } from "@/lib/coverGradient";

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
  return (
    <Suspense fallback={<p className="text-sm text-slate-400">로딩 중…</p>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("type") as Tab) || "unified");
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [novels, setNovels] = useState<NovelResult[]>([]);
  const [authors, setAuthors] = useState<AuthorResult[]>([]);

  const run = useCallback(async (t: Tab = tab, query: string = q) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/search?type=${t}&q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    if (t === "author") {
      setAuthors(data.authors ?? []);
      setNovels([]);
    } else {
      setNovels(data.results ?? []);
      setAuthors([]);
    }
    setLoading(false);
  }, [tab, q]);

  // URL 쿼리 파라미터로 들어왔으면 자동 검색
  useEffect(() => {
    const urlQ = searchParams.get("q");
    const urlType = searchParams.get("type") as Tab | null;
    if (urlQ) {
      const t = urlType || "unified";
      setTab(t);
      setQ(urlQ);
      run(t, urlQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-extrabold tracking-tight">검색</h1>

      {/* 검색 바: 드롭다운 + 입력 + 버튼 */}
      <div className="flex gap-2">
        <select
          value={tab}
          onChange={(e) => setTab(e.target.value as Tab)}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        >
          {TABS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4-4" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder={
              tab === "author" ? "글쓴이 닉네임" : tab === "title" ? "작품 제목" : "제목·내용·태그·작가"
            }
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />
        </div>
        <button
          onClick={() => run()}
          className="shrink-0 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition"
        >
          검색
        </button>
      </div>

      {/* 결과 */}
      {loading ? (
        <p className="text-sm text-slate-400">검색 중…</p>
      ) : !searched ? (
        <p className="text-sm text-slate-400">검색어를 입력하세요.</p>
      ) : tab === "author" ? (
        authors.length === 0 ? (
          <p className="text-sm text-slate-400">일치하는 글쓴이가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {authors.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
                <Link href={`/author/${a.id}`} className="flex items-center gap-2.5 font-semibold text-slate-900 hover:text-indigo-600 transition-colors">
                  {a.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-xs font-bold">
                      {displayName(a).charAt(0)}
                    </span>
                  )}
                  {displayName(a)}
                </Link>
                <ul className="mt-2.5 space-y-1">
                  {a.novels.map((n) => (
                    <li key={n.id}>
                      <Link href={`/novel/${n.id}`} className="text-sm text-slate-600 hover:text-indigo-600 transition-colors">
                        {n.title}{" "}
                        <span className="text-slate-400 text-xs">({n._count.chapters}화)</span>
                      </Link>
                    </li>
                  ))}
                  {a.novels.length === 0 && (
                    <li className="text-slate-400 text-xs">등록된 작품 없음</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : novels.length === 0 ? (
        <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
      ) : (
        <>
          <p className="text-xs text-slate-400">
            검색 결과 <strong className="font-semibold text-slate-600">{novels.length}건</strong>
          </p>
          <ul className="space-y-3">
            {novels.map((n) => (
              <li key={n.novelId}>
                <Link
                  href={`/novel/${n.novelId}`}
                  className="group flex gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:shadow-cardHover hover:border-indigo-300 transition-all"
                >
                  {n.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.coverImage} alt="" className="w-14 h-[72px] object-cover rounded-lg shrink-0 shadow-sm" />
                  ) : (
                    <div className={`${coverGradientFor(n.title)} relative w-14 h-[72px] shrink-0 rounded-lg overflow-hidden grid place-items-center shadow-sm`}>
                      <span className="text-white text-lg font-black drop-shadow">{n.title.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-[15px] text-slate-900 group-hover:text-indigo-700 truncate transition-colors">
                      {n.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {displayName(n.author)} · {n.chapterCount}화
                      {n.matchedChapter && (
                        <span className="text-slate-400"> · {n.matchedChapter.num}화 &ldquo;{n.matchedChapter.title}&rdquo;</span>
                      )}
                    </p>
                    {n.snippetHtml && (
                      <p
                        className="text-[13px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: n.snippetHtml }}
                      />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

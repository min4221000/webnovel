import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const hiddenWhere = { authorId: user.id, deletedAt: null, hidden: true } as const;
  const publicHiddenWhere = {
    authorId: user.id,
    deletedAt: null,
    hidden: false,
    chapters: { some: { hidden: true, deletedAt: null } },
  } as const;

  const [novels, publicNovelsWithHiddenChapters, hiddenCount, publicHiddenCount] = await Promise.all([
    prisma.novel.findMany({
      where: hiddenWhere,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        isAdult: true,
        updatedAt: true,
        chapters: {
          where: { deletedAt: null },
          orderBy: { chapterNum: "desc" },
          select: { id: true, chapterNum: true, title: true, hidden: true },
        },
      },
    }),
    prisma.novel.findMany({
      where: publicHiddenWhere,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        isAdult: true,
        updatedAt: true,
        chapters: {
          where: { deletedAt: null, hidden: true },
          orderBy: { chapterNum: "asc" },
          select: { id: true, chapterNum: true, title: true, hidden: true },
        },
      },
    }),
    prisma.novel.count({ where: hiddenWhere }),
    prisma.novel.count({ where: publicHiddenWhere }),
  ]);

  const totalItems = Math.max(hiddenCount, publicHiddenCount);
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const isEmpty = novels.length === 0 && publicNovelsWithHiddenChapters.length === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">비밀글</h1>
      <p className="text-sm text-slate-500">나만 볼 수 있는 비공개 소설·회차입니다. 수정에서 공개로 바꿀 수 있습니다.</p>

      {isEmpty && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
          비공개로 설정된 소설·회차가 없습니다.
        </div>
      )}

      {novels.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">비공개 소설</h2>
          {novels.map((n) => (
            <Link
              key={n.id}
              href={`/novel/${n.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:shadow-cardHover hover:border-indigo-300 transition-all"
            >
              <h3 className="font-bold text-[15px] text-slate-900">
                {n.isAdult && <span className="text-rose-500 mr-1 text-sm">[SP]</span>}
                {n.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {n.chapters.length}화 · 수정 {new Date(n.updatedAt).toLocaleDateString()} · 클릭해서 회차 목록·수정·삭제
              </p>
            </Link>
          ))}
        </section>
      )}

      {publicNovelsWithHiddenChapters.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500">공개 소설의 비공개 회차</h2>
          {publicNovelsWithHiddenChapters.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card space-y-2">
              <Link href={`/novel/${n.id}`} className="font-bold text-[15px] text-slate-900 hover:text-indigo-600 transition-colors">
                {n.isAdult && <span className="text-rose-500 mr-1 text-sm">[SP]</span>}
                {n.title}
              </Link>
              <ul className="divide-y divide-slate-100 text-sm">
                {n.chapters.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <Link href={`/novel/${n.id}/chapter/${c.chapterNum}`} className="text-slate-700 hover:text-indigo-600 truncate transition-colors">
                      <span className="text-slate-400 mr-1.5">{c.chapterNum}화</span>
                      {c.title}
                    </Link>
                    <Link
                      href={`/write/${n.id}/chapter/${c.id}/edit`}
                      className="text-xs text-slate-300 hover:text-indigo-500 shrink-0 ml-2 transition-colors"
                    >
                      수정
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <nav className="flex justify-center gap-1.5 pt-6">
          {page > 1 && (
            <Link
              href={`/drafts?page=${page - 1}`}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              ← 이전
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/drafts?page=${p}`}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                p === page
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20"
                  : "border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link
              href={`/drafts?page=${page + 1}`}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              다음 →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

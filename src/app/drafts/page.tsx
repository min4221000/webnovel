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
      <h1 className="text-2xl font-bold">비밀글</h1>
      <p className="text-sm text-gray-500">나만 볼 수 있는 비공개 소설·회차입니다. 수정에서 공개로 바꿀 수 있습니다.</p>

      {isEmpty && (
        <p className="text-sm text-gray-400 border border-dashed rounded-lg p-8 text-center">
          비공개로 설정된 소설·회차가 없습니다.
        </p>
      )}

      {novels.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-500">비공개 소설</h2>
          {novels.map((n) => (
            <Link
              key={n.id}
              href={`/novel/${n.id}`}
              className="block border rounded-lg p-4 hover:border-indigo-400 transition-colors"
            >
              <h3 className="font-semibold">
                {n.isAdult && <span className="text-red-500 mr-1 text-sm">[🔞]</span>}
                {n.title}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                {n.chapters.length}화 · 수정 {new Date(n.updatedAt).toLocaleDateString()} · 클릭해서 회차 목록·수정·삭제
              </p>
            </Link>
          ))}
        </section>
      )}

      {publicNovelsWithHiddenChapters.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-500">공개 소설의 비공개 회차</h2>
          {publicNovelsWithHiddenChapters.map((n) => (
            <div key={n.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/novel/${n.id}`} className="font-semibold hover:underline">
                  {n.isAdult && <span className="text-red-500 mr-1 text-sm">[🔞]</span>}
                  {n.title}
                </Link>
              </div>
              <ul className="divide-y divide-black/5 dark:divide-white/5 text-sm">
                {n.chapters.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-1.5">
                    <Link href={`/novel/${n.id}/chapter/${c.chapterNum}`} className="hover:underline truncate">
                      <span className="text-gray-400 mr-1">{c.chapterNum}화</span>
                      {c.title}
                    </Link>
                    <Link
                      href={`/write/${n.id}/chapter/${c.id}/edit`}
                      className="text-xs text-gray-400 hover:text-indigo-500 shrink-0 ml-2"
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
        <nav className="flex justify-center gap-2 pt-4">
          {page > 1 && (
            <Link
              href={`/drafts?page=${page - 1}`}
              className="px-3 py-1 rounded border text-sm hover:border-indigo-400"
            >
              ← 이전
            </Link>
          )}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/drafts?page=${p}`}
              className={`px-3 py-1 rounded border text-sm ${
                p === page
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "hover:border-indigo-400"
              }`}
            >
              {p}
            </Link>
          ))}
          {page < totalPages && (
            <Link
              href={`/drafts?page=${page + 1}`}
              className="px-3 py-1 rounded border text-sm hover:border-indigo-400"
            >
              다음 →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

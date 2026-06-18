import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const novels = await prisma.novel.findMany({
    where: { authorId: user.id, deletedAt: null, hidden: true },
    orderBy: { updatedAt: "desc" },
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
  });

  // 공개 소설 중 비공개 회차가 있는 것도 포함
  const publicNovelsWithHiddenChapters = await prisma.novel.findMany({
    where: {
      authorId: user.id,
      deletedAt: null,
      hidden: false,
      chapters: { some: { hidden: true, deletedAt: null } },
    },
    orderBy: { updatedAt: "desc" },
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
  });

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
            <div key={n.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {n.isAdult && <span className="text-red-500 mr-1 text-sm">[🔞]</span>}
                    {n.title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {n.chapters.length}화 · 수정 {new Date(n.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/write/${n.id}/edit`}
                    className="text-xs px-2 py-1 rounded border hover:border-indigo-400"
                  >
                    정보 수정
                  </Link>
                  <Link
                    href={`/write/${n.id}/chapter/new`}
                    className="text-xs px-2 py-1 rounded bg-indigo-600 text-white"
                  >
                    + 회차 쓰기
                  </Link>
                </div>
              </div>
              {n.chapters.length > 0 && (
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
              )}
            </div>
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
    </div>
  );
}

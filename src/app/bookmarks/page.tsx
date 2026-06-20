import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      lastReadChapter: true,
      novel: {
        select: {
          id: true,
          title: true,
          coverImage: true,
          isAdult: true,
          deletedAt: true,
          author: { select: { id: true, username: true, nickname: true } },
          _count: { select: { chapters: { where: { deletedAt: null, hidden: false } } } },
        },
      },
    },
  });

  const active = bookmarks.filter((b) => !b.novel.deletedAt);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">북마크</h1>

      {active.length === 0 ? (
        <p className="text-sm text-gray-400 border border-dashed rounded-lg p-8 text-center">
          북마크한 작품이 없습니다. 소설 페이지에서 ☆ 북마크 버튼을 눌러 추가하세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {active.map(({ novel: n, lastReadChapter }) => {
            const total = n._count.chapters;
            const read = lastReadChapter ?? 0;
            const pct = total > 0 ? Math.round((read / total) * 100) : 0;

            return (
              <li key={n.id} className="border rounded-lg p-4 space-y-2 hover:border-indigo-400 transition-colors">
                <Link href={`/novel/${n.id}`} className="flex gap-3">
                  {n.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.coverImage} alt="" className="w-14 h-[72px] object-cover rounded shrink-0" />
                  ) : (
                    <div className="w-14 h-[72px] rounded bg-black/5 dark:bg-white/10 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold truncate">
                      {n.isAdult && <span className="text-red-500 mr-1">[🔞]</span>}
                      {n.title}
                    </h2>
                    <p className="text-xs text-gray-500">{n.author.nickname || n.author.username} · 전체 {total}화</p>

                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>
                          {read > 0 ? `${read}화까지 읽음` : "아직 안 읽음"}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>

                {read > 0 && read < total && (
                  <Link
                    href={`/novel/${n.id}/chapter/${read + 1}`}
                    className="block text-center text-xs py-1.5 rounded border hover:border-indigo-400 hover:text-indigo-500"
                  >
                    이어 읽기 → {read + 1}화
                  </Link>
                )}
                {read === 0 && total > 0 && (
                  <Link
                    href={`/novel/${n.id}/chapter/1`}
                    className="block text-center text-xs py-1.5 rounded border hover:border-indigo-400 hover:text-indigo-500"
                  >
                    1화부터 읽기 →
                  </Link>
                )}
                {read >= total && total > 0 && (
                  <p className="text-center text-xs text-gray-400 py-1">✓ 완독</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

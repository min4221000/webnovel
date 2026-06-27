import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { displayName } from "@/lib/displayName";
import { coverGradientFor } from "@/lib/coverGradient";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [bookmarks, follows] = await Promise.all([
    prisma.bookmark.findMany({
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
    }),
    prisma.follow.findMany({
      where: { followerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  const active = bookmarks.filter((b) => !b.novel.deletedAt);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">북마크</h1>

      {/* 팔로잉 작가 */}
      {follows.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3">팔로잉 작가 ({follows.length})</h2>
          <div className="flex flex-wrap gap-2">
            {follows.map(({ author: a }) => (
              <Link
                key={a.id}
                href={`/author/${a.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600 shadow-card transition-all"
              >
                {a.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-[10px] font-bold">
                    {displayName(a).charAt(0)}
                  </span>
                )}
                <span className="truncate max-w-[120px]">{displayName(a)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {active.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
          북마크한 작품이 없습니다. 소설 페이지에서 ★ 버튼을 눌러 추가하세요.
        </div>
      ) : (
        <ul className="space-y-3">
          {active.map(({ novel: n, lastReadChapter }) => {
            const total = n._count.chapters;
            const read = lastReadChapter ?? 0;
            const pct = total > 0 ? Math.round((read / total) * 100) : 0;

            return (
              <li key={n.id} className="rounded-xl border border-slate-200 bg-white shadow-card p-4 hover:border-indigo-300 hover:shadow-cardHover transition-all">
                <Link href={`/novel/${n.id}`} className="flex gap-3.5 group">
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
                      {n.isAdult && <span className="text-rose-500 mr-1">[SP]</span>}
                      {n.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">{displayName(n.author)} · 전체 {total}화</p>

                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{read > 0 ? `${read}화까지 읽음` : "아직 안 읽음"}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
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
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
                  >
                    이어 읽기 → {read + 1}화
                  </Link>
                )}
                {read === 0 && total > 0 && (
                  <Link
                    href={`/novel/${n.id}/chapter/1`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-[13px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-colors"
                  >
                    처음부터 읽기 →
                  </Link>
                )}
                {read >= total && total > 0 && (
                  <p className="mt-3 text-center text-xs text-slate-400 py-1">✓ 완독</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

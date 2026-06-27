import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewerAdult, getCurrentUser } from "@/lib/session";
import { displayName } from "@/lib/displayName";
import { coverGradientFor } from "@/lib/coverGradient";
import FollowButton from "@/components/FollowButton";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AuthorPage({
  params,
}: {
  params: { id: string };
}) {
  const adult = await getViewerAdult();
  const viewer = await getCurrentUser();
  const isSelf = viewer?.id === params.id;
  const following = viewer && !isSelf
    ? !!(await prisma.follow.findUnique({
        where: { followerId_authorId: { followerId: viewer.id, authorId: params.id } },
        select: { id: true },
      }))
    : false;
  const author = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      username: true,
      nickname: true,
      avatarUrl: true,
      _count: { select: { followers: true } },
      novels: {
        where: { deletedAt: null, hidden: false, ...(adult ? {} : { isAdult: false }) },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          coverImage: true,
          isAdult: true,
          status: true,
          views: true,
          _count: { select: { chapters: { where: { deletedAt: null, hidden: false } } } },
        },
      },
    },
  });

  if (!author) notFound();

  const name = displayName(author);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        돌아가기
      </Link>

      {/* 프로필 헤더 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="bg-gradient-to-br from-rose-500 to-violet-600 h-20" />
        <div className="px-5 sm:px-6 pb-6 -mt-10">
          <div className="flex items-end gap-4">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatarUrl} alt="" className="w-20 h-20 shrink-0 rounded-2xl ring-4 ring-white shadow-md object-cover" />
            ) : (
              <span className="w-20 h-20 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-2xl font-black ring-4 ring-white shadow-md">
                {name.charAt(0)}
              </span>
            )}
            <div className="pb-1 min-w-0 flex-1">
              <p className="text-[11px] text-slate-400">글쓴이</p>
              <h2 className="text-lg font-bold leading-tight truncate">{name}</h2>
            </div>
            {viewer && !isSelf && (
              <div className="ml-auto shrink-0 self-end pb-1">
                <FollowButton authorId={params.id} initialFollowing={following} />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-5 text-sm text-slate-500">
            <span><strong className="font-bold text-slate-800">{author.novels.length}</strong> 작품</span>
            <span><strong className="font-bold text-slate-800">{author._count.followers}</strong> 팔로워</span>
          </div>
        </div>
      </div>

      {/* 등록 작품 */}
      <section>
        <h2 className="font-bold text-base mb-3">등록 작품</h2>
        {author.novels.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            등록된 작품이 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {author.novels.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/novel/${n.id}`}
                  className="group flex gap-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:shadow-cardHover hover:border-indigo-300 transition-all"
                >
                  {n.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.coverImage} alt="" className="w-12 h-16 object-cover rounded-lg shrink-0 shadow-sm" />
                  ) : (
                    <div className={`${coverGradientFor(n.title)} relative w-12 h-16 shrink-0 rounded-lg overflow-hidden grid place-items-center shadow-sm`}>
                      <span className="text-white text-base font-black">{n.title.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {n.isAdult && (
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-500 ring-1 ring-inset ring-rose-500/20">SP</span>
                      )}
                      <StatusBadge status={n.status} />
                    </div>
                    <h3 className="font-bold text-[15px] text-slate-900 group-hover:text-indigo-700 truncate transition-colors mt-0.5">
                      {n.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {n._count.chapters}화 · {n.views.toLocaleString()} 조회
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getViewerAdult } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import DeleteButton from "@/components/DeleteButton";
import BookmarkButton from "@/components/BookmarkButton";
import StatusBadge from "@/components/StatusBadge";
import { displayName } from "@/lib/displayName";
import { coverGradientFor } from "@/lib/coverGradient";

export const dynamic = "force-dynamic";

export default async function NovelPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const novel = await prisma.novel.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      tags: true,
      isAdult: true,
      hidden: true,
      status: true,
      views: true,
      author: { select: { id: true, username: true, nickname: true } },
      chapters: {
        where: { deletedAt: null },
        orderBy: { chapterNum: "asc" },
        select: { id: true, chapterNum: true, title: true, createdAt: true, hidden: true },
      },
    },
  });

  if (!novel) notFound();

  const isAuthor = !!user && user.id === novel.author.id;
  const canModerate = !!user && user.role === "ADMIN";
  const isOwner = isAuthor || canModerate;

  const bookmark = user ? await prisma.bookmark.findUnique({
    where: { userId_novelId: { userId: user.id, novelId: params.id } },
    select: { lastReadChapter: true },
  }) : null;

  if (novel.hidden && !isOwner) notFound();

  const adult = await getViewerAdult();
  if (novel.isAdult && !adult && !isOwner) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-5xl">🔞</p>
        <h1 className="text-xl font-bold">시크릿 플러스 작품입니다</h1>
        <p className="text-sm text-slate-500">
          이 작품을 보려면 만 19세 이상 시크릿 플러스 설정이 필요합니다.
        </p>
        <Link href="/adult" className="inline-block px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition">
          시크릿 플러스 설정하러 가기
        </Link>
      </div>
    );
  }

  if (!isOwner && !novel.hidden) {
    const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    if (await rateLimit(`view:${ip}:${params.id}`, 1, 3600)) {
      await prisma.novel.update({
        where: { id: params.id },
        data: { views: { increment: 1 } },
      });
    }
  }

  const visibleChapters = novel.chapters.filter(c => isOwner || !c.hidden);
  const lastRead = bookmark?.lastReadChapter;

  return (
    <div className="space-y-8">
      {/* 플로팅 북마크 */}
      {user && (
        <BookmarkButton novelId={novel.id} initialBookmarked={!!bookmark} />
      )}

      {/* 뒤로 */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        목록으로
      </Link>

      {/* 헤더 카드 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className={`${novel.coverImage ? "bg-gradient-to-br from-slate-200 to-slate-300" : coverGradientFor(novel.title)} h-24 sm:h-28`} />
        <div className="px-5 sm:px-7 pb-6 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* 커버 */}
            {novel.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={novel.coverImage}
                alt=""
                className="w-28 h-40 object-cover rounded-xl shrink-0 shadow-lg ring-4 ring-white"
              />
            ) : (
              <div className={`${coverGradientFor(novel.title)} relative w-28 h-40 shrink-0 rounded-xl overflow-hidden grid place-items-center shadow-lg ring-4 ring-white`}>
                <span className="text-white text-4xl font-black drop-shadow">{novel.title.charAt(0)}</span>
                <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
              </div>
            )}

            <div className="min-w-0 flex-1 sm:pt-16">
              <div className="flex items-center gap-2 flex-wrap mt-2 sm:mt-3">
                {novel.isAdult && (
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 ring-1 ring-inset ring-rose-600/20">
                    시크릿 플러스
                  </span>
                )}
                {novel.hidden && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-400/20">
                    비공개
                  </span>
                )}
                <StatusBadge status={novel.status} />
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {novel.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  글쓴이{" "}
                  <Link
                    href={`/author/${novel.author.id}`}
                    className="font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    {displayName(novel.author)}
                  </Link>
                </span>
                <span className="text-slate-300">·</span>
                <span>{visibleChapters.length}화</span>
                <span className="text-slate-300">·</span>
                <span>{novel.views.toLocaleString()} 조회</span>
              </p>
              {lastRead != null && (
                <p className="mt-1.5 text-xs font-medium text-amber-600">★ {lastRead}화까지 읽음</p>
              )}
            </div>
          </div>

          {/* 태그 */}
          {novel.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {novel.tags.map((t) => (
                <span key={t} className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* 설명 */}
          {novel.description && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
              {novel.description}
            </p>
          )}

          {/* 작가/관리자 액션 */}
          {isOwner && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {isAuthor && (
                <>
                  <Link
                    href={`/write/${novel.id}/chapter/new`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                    새 회차
                  </Link>
                  <Link
                    href={`/write/${novel.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    정보 수정
                  </Link>
                </>
              )}
              <DeleteButton
                url={`/api/novels/${novel.id}`}
                redirectTo="/"
                label={isAuthor ? "소설 삭제" : "관리자 삭제"}
                confirmMsg="이 소설을 삭제할까요? 복구가 필요하면 관리자에게 문의하세요."
                className="ml-auto text-sm text-slate-400 hover:text-rose-500 transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* 회차 목록 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">회차 목록</h2>
          <span className="text-xs text-slate-400">총 {visibleChapters.length}화</span>
        </div>
        {visibleChapters.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400 text-sm">
            아직 등록된 회차가 없습니다.
          </div>
        ) : (
          <ul className="rounded-xl border border-slate-200 bg-white shadow-card divide-y divide-slate-100 overflow-hidden">
            {visibleChapters.map((c) => {
              const isCurrentRead = lastRead != null && c.chapterNum === lastRead;
              const isRead = lastRead != null && c.chapterNum <= lastRead;
              return (
                <li
                  key={c.id}
                  className={`group flex items-center gap-3 px-4 py-3.5 transition-colors ${
                    isCurrentRead ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-indigo-50/50"
                  }`}
                >
                  <span className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold ${
                    isCurrentRead
                      ? "bg-indigo-600 text-white shadow-sm"
                      : isRead
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {c.chapterNum}
                  </span>
                  <Link href={`/novel/${novel.id}/chapter/${c.chapterNum}`} className="flex-1 min-w-0">
                    <p className={`font-medium truncate transition-colors ${
                      isCurrentRead ? "text-indigo-700 font-semibold" : "text-slate-800 group-hover:text-indigo-700"
                    }`}>
                      {c.title}
                      {c.hidden && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">비공개</span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${isCurrentRead ? "text-indigo-400" : "text-slate-400"}`}>
                      {new Date(c.createdAt).toLocaleDateString()}
                      {isCurrentRead && " · 이어 읽기"}
                    </p>
                  </Link>
                  {isRead && !isCurrentRead && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">읽음</span>
                  )}
                  {isCurrentRead && (
                    <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {isOwner && (
                    <span className="flex items-center gap-2 shrink-0">
                      {isAuthor && (
                        <Link
                          href={`/write/${novel.id}/chapter/${c.id}/edit`}
                          className="text-xs text-slate-300 hover:text-indigo-500 transition-colors"
                        >
                          수정
                        </Link>
                      )}
                      <DeleteButton
                        url={`/api/chapters/${c.id}`}
                        confirmMsg="이 회차를 삭제할까요?"
                        label="삭제"
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

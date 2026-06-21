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

  const isOwner = !!user && (user.id === novel.author.id || user.role === "ADMIN");

  const bookmark = user ? await prisma.bookmark.findUnique({
    where: { userId_novelId: { userId: user.id, novelId: params.id } },
    select: { lastReadChapter: true },
  }) : null;

  // 비공개 소설은 작가/어드민만 접근
  if (novel.hidden && !isOwner) notFound();

  // 18+ 작품은 성인 열람 ON 인 본인/관리자만 접근
  const adult = await getViewerAdult();
  if (novel.isAdult && !adult && !isOwner) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <p className="text-5xl">🔞</p>
        <h1 className="text-xl font-bold">🔞시크릿 플러스 작품입니다</h1>
        <p className="text-sm text-gray-500">
          이 작품을 보려면 만 19세 이상 시크릿 플러스 설정이 필요합니다.
        </p>
        <Link href="/adult" className="inline-block px-4 py-2 rounded-md bg-red-600 text-white text-sm">
          🔞시크릿 플러스 설정하러 가기
        </Link>
      </div>
    );
  }

  // 조회수 +1 (작가/어드민 본인·비공개·19+ 비열람자는 제외 — 게이트 통과 후 카운트)
  // IP+소설당 1시간 1회만 카운트 → 새로고침 스팸 write/조회수 조작 방지 (RU 절약)
  if (!isOwner && !novel.hidden) {
    const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
    if (await rateLimit(`view:${ip}:${params.id}`, 1, 3600)) {
      await prisma.novel.update({
        where: { id: params.id },
        data: { views: { increment: 1 } },
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* 플로팅 북마크 버튼 — 로그인 시 누구나 */}
      {user && (
        <BookmarkButton novelId={novel.id} initialBookmarked={!!bookmark} />
      )}

      <div className="flex gap-4">
        {novel.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={novel.coverImage}
            alt=""
            className="w-28 h-36 object-cover rounded border shrink-0"
          />
        ) : (
          <div className="w-28 h-36 rounded bg-black/5 dark:bg-white/10 shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">
            {novel.isAdult && <span className="text-red-500 mr-1">[🔞]</span>}
            {novel.hidden && <span className="text-gray-400 mr-1 text-sm font-normal">[비공개]</span>}
            {novel.title}
            <StatusBadge status={novel.status} />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            글쓴이{" "}
            <Link href={`/author/${novel.author.id}`} className="underline">
              {displayName(novel.author)}
            </Link>{" "}
            · {novel.chapters.filter((c) => isOwner || !c.hidden).length}화 · 👁 {novel.views.toLocaleString()}
          </p>
          {bookmark?.lastReadChapter != null && (
            <p className="text-xs text-amber-600 mt-1">★ {bookmark.lastReadChapter}화까지 읽음</p>
          )}
          {novel.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {novel.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          {novel.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-wrap">
              {novel.description}
            </p>
          )}

          {isOwner && (
            <div className="flex items-center gap-3 mt-3">
              <Link
                href={`/write/${novel.id}/chapter/new`}
                className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white"
              >
                + 새 회차
              </Link>
              <Link href={`/write/${novel.id}/edit`} className="text-sm underline">
                정보 수정
              </Link>
              <DeleteButton
                url={`/api/novels/${novel.id}`}
                redirectTo="/"
                label="소설 삭제"
                confirmMsg="이 소설을 삭제할까요? 복구가 필요하면 관리자에게 문의하세요."
                className="text-sm text-gray-400 hover:text-red-500"
              />
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">회차 목록</h2>
        {novel.chapters.length === 0 ? (
          <p className="text-sm text-gray-400">아직 등록된 회차가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10 border rounded-lg">
            {novel.chapters.filter(c => isOwner || !c.hidden).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Link
                  href={`/novel/${novel.id}/chapter/${c.chapterNum}`}
                  className="flex-1 min-w-0 flex items-center justify-between"
                >
                  <span className="truncate">
                    <span className="text-gray-400 mr-2">{c.chapterNum}화</span>
                    {c.hidden && <span className="text-gray-400 text-xs mr-1">[비공개]</span>}
                    {c.title}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </Link>
                {isOwner && (
                  <span className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/write/${novel.id}/chapter/${c.id}/edit`}
                      className="text-xs text-gray-400 hover:text-indigo-500"
                    >
                      수정
                    </Link>
                    <DeleteButton
                      url={`/api/chapters/${c.id}`}
                      confirmMsg="이 회차를 삭제할까요?"
                      label="삭제"
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

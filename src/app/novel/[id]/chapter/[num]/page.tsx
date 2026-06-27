import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Comments from "@/components/Comments";
import ReportButton from "@/components/ReportButton";
import ChapterReader from "@/components/ChapterReader";
import DeleteButton from "@/components/DeleteButton";
import { getCurrentUser, getViewerAdult } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChapterPage({
  params,
}: {
  params: { id: string; num: string };
}) {
  const chapterNum = parseInt(params.num, 10);
  if (Number.isNaN(chapterNum)) notFound();

  const user = await getCurrentUser();
  const novel = await prisma.novel.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, title: true, authorId: true, isAdult: true, hidden: true },
  });
  if (!novel) notFound();

  const isAuthor = !!user && user.id === novel.authorId;
  const canModerate = !!user && user.role === "ADMIN";
  const isOwner = isAuthor || canModerate;

  if (novel.hidden && !isOwner) notFound();

  if (novel.isAdult && !isOwner) {
    const adult = await getViewerAdult();
    if (!adult) {
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
  }

  const chapter = await prisma.chapter.findFirst({
    where: { novelId: params.id, chapterNum, deletedAt: null },
    select: { id: true, title: true, content: true, chapterNum: true, createdAt: true, hidden: true },
  });
  if (!chapter) notFound();

  if (chapter.hidden && !isOwner) notFound();

  if (user) {
    await prisma.bookmark.updateMany({
      where: {
        userId: user.id,
        novelId: params.id,
        OR: [{ lastReadChapter: null }, { lastReadChapter: { lt: chapterNum } }],
      },
      data: { lastReadChapter: chapterNum },
    });
  }

  const navFilter = { novelId: params.id, deletedAt: null, ...(isOwner ? {} : { hidden: false }) };
  const [prev, next] = await Promise.all([
    prisma.chapter.findFirst({
      where: { ...navFilter, chapterNum: { lt: chapterNum } },
      orderBy: { chapterNum: "desc" },
      select: { chapterNum: true },
    }),
    prisma.chapter.findFirst({
      where: { ...navFilter, chapterNum: { gt: chapterNum } },
      orderBy: { chapterNum: "asc" },
      select: { chapterNum: true },
    }),
  ]);

  const hasPrev = !!prev;
  const hasNext = !!next;

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      {/* 상단 네비 */}
      <div className="flex items-center justify-between">
        <Link
          href={`/novel/${novel.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          목록으로
        </Link>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {hasPrev && (
            <Link href={`/novel/${novel.id}/chapter/${prev!.chapterNum}`} className="hover:text-indigo-600 transition-colors">
              ← 이전화
            </Link>
          )}
          {hasPrev && hasNext && <span className="text-slate-200">|</span>}
          {hasNext && (
            <Link href={`/novel/${novel.id}/chapter/${next!.chapterNum}`} className="hover:text-indigo-600 transition-colors">
              다음화 →
            </Link>
          )}
        </div>
      </div>

      {/* 회차 제목 */}
      <div>
        <p className="text-xs text-slate-400 mb-1">{novel.title} · {chapter.chapterNum}화</p>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{chapter.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
          <span>{new Date(chapter.createdAt).toLocaleString()}</span>
          <ReportButton targetType="chapter" targetId={chapter.id} />
          {isAuthor && (
            <Link
              href={`/write/${novel.id}/chapter/${chapter.id}/edit`}
              className="hover:text-indigo-500 transition-colors"
            >
              수정
            </Link>
          )}
          {(isAuthor || canModerate) && (
            <DeleteButton
              url={`/api/chapters/${chapter.id}`}
              redirectTo={`/novel/${novel.id}`}
              label={isAuthor ? "삭제" : "관리자 삭제"}
              confirmMsg="이 회차를 삭제할까요?"
            />
          )}
        </div>
      </div>

      {/* ⚠️ 본문 — 컨테이너 CSS 추가 금지. 에디터 인라인 스타일만 렌더링. */}
      <ChapterReader html={chapter.content} />

      {/* 하단 네비 */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
        {hasPrev ? (
          <Link
            href={`/novel/${novel.id}/chapter/${prev!.chapterNum}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            ← 이전화
          </Link>
        ) : (
          <span />
        )}
        <Link href={`/novel/${novel.id}`} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          목록
        </Link>
        {hasNext ? (
          <Link
            href={`/novel/${novel.id}/chapter/${next!.chapterNum}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
          >
            다음화 →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {/* 댓글 */}
      <section className="border-t border-slate-100 pt-5">
        <h2 className="font-bold text-sm text-slate-500 mb-3">댓글</h2>
        <Comments chapterId={chapter.id} />
      </section>
    </article>
  );
}

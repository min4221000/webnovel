import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Comments from "@/components/Comments";
import ReportButton from "@/components/ReportButton";
import ChapterReader from "@/components/ChapterReader";
import DeleteButton from "@/components/DeleteButton";
import { getCurrentUser } from "@/lib/session";

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
    select: { id: true, title: true, authorId: true },
  });
  if (!novel) notFound();

  const isOwner = !!user && (user.id === novel.authorId || user.role === "ADMIN");

  const chapter = await prisma.chapter.findFirst({
    where: { novelId: params.id, chapterNum, deletedAt: null },
    select: { id: true, title: true, content: true, chapterNum: true, createdAt: true },
  });
  if (!chapter) notFound();

  const [prev, next] = await Promise.all([
    prisma.chapter.findFirst({
      where: { novelId: params.id, deletedAt: null, chapterNum: { lt: chapterNum } },
      orderBy: { chapterNum: "desc" },
      select: { chapterNum: true },
    }),
    prisma.chapter.findFirst({
      where: { novelId: params.id, deletedAt: null, chapterNum: { gt: chapterNum } },
      orderBy: { chapterNum: "asc" },
      select: { chapterNum: true },
    }),
  ]);

  return (
    <article className="space-y-5">
      <div>
        <Link href={`/novel/${novel.id}`} className="text-sm text-gray-400 hover:underline">
          ← {novel.title}
        </Link>
        <h1 className="text-2xl font-bold mt-1">
          <span className="text-gray-400 mr-2">{chapter.chapterNum}화</span>
          {chapter.title}
        </h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-400">
            {new Date(chapter.createdAt).toLocaleString()}
          </p>
          <ReportButton targetType="chapter" targetId={chapter.id} />
          {isOwner && (
            <>
              <Link
                href={`/write/${novel.id}/chapter/${chapter.id}/edit`}
                className="text-xs text-gray-400 hover:text-indigo-500"
              >
                ✎ 수정
              </Link>
              <DeleteButton
                url={`/api/chapters/${chapter.id}`}
                redirectTo={`/novel/${novel.id}`}
                label="삭제"
                confirmMsg="이 회차를 삭제할까요?"
              />
            </>
          )}
        </div>
      </div>

      {/* 본문 (저장 시 새니타이즈 완료) + Ctrl+F 커스텀 검색 */}
      <ChapterReader html={chapter.content} />

      <nav className="flex justify-between border-t border-black/10 dark:border-white/10 pt-4 text-sm">
        {prev ? (
          <Link href={`/novel/${novel.id}/chapter/${prev.chapterNum}`} className="hover:underline">
            ← 이전화
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/novel/${novel.id}/chapter/${next.chapterNum}`} className="hover:underline">
            다음화 →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* 댓글 */}
      <section className="border-t border-black/10 dark:border-white/10 pt-4">
        <h2 className="font-semibold mb-3 text-sm text-gray-500">댓글</h2>
        <Comments chapterId={chapter.id} />
      </section>
    </article>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 신고 목록 + 대상 미리보기 (ADMIN)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return authErrorResponse(e);
  }

  const status = req.nextUrl.searchParams.get("status") || "pending";
  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      status: true,
      createdAt: true,
      reporter: { select: { id: true, username: true } },
    },
  });

  // 대상 미리보기 배치 로드
  const chapterIds = reports.filter((r) => r.targetType === "chapter").map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === "comment").map((r) => r.targetId);

  const [chapters, comments] = await Promise.all([
    chapterIds.length
      ? prisma.chapter.findMany({
          where: { id: { in: chapterIds } },
          select: {
            id: true,
            title: true,
            chapterNum: true,
            deletedAt: true,
            novel: {
              select: {
                id: true,
                title: true,
                author: { select: { id: true, username: true } },
              },
            },
          },
        })
      : [],
    commentIds.length
      ? prisma.comment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            deletedAt: true,
            chapterId: true,
            author: { select: { id: true, username: true } },
            chapter: { select: { novelId: true, chapterNum: true } },
          },
        })
      : [],
  ]);

  const chapterMap = new Map(chapters.map((c) => [c.id, c]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  // 각 대상의 신고 건수
  const allTargetIds = reports.map((r) => `${r.targetType}:${r.targetId}`);
  const uniqueTargets = Array.from(new Set(allTargetIds));
  const countMap = new Map<string, number>();
  for (const key of uniqueTargets) {
    const [tt, tid] = key.split(":");
    const c = await prisma.report.count({ where: { targetType: tt, targetId: tid, status: "pending" } });
    countMap.set(key, c);
  }

  const enriched = reports.map((r) => {
    if (r.targetType === "chapter") {
      const c = chapterMap.get(r.targetId);
      return {
        ...r,
        target: c
          ? {
              kind: "chapter" as const,
              preview: `${c.novel.title} ${c.chapterNum}화 - ${c.title}`,
              link: `/novel/${c.novel.id}/chapter/${c.chapterNum}`,
              deleted: !!c.deletedAt,
              offender: c.novel.author,
            }
          : { kind: "chapter" as const, preview: "(삭제됨/없음)", link: null, deleted: true, offender: null },
      };
    }
    const c = commentMap.get(r.targetId);
    return {
      ...r,
      target: c
        ? {
            kind: "comment" as const,
            preview: `${c.author.username}: ${c.content.slice(0, 80)}`,
            link: `/novel/${c.chapter.novelId}/chapter/${c.chapter.chapterNum}`,
            deleted: !!c.deletedAt,
            offender: c.author,
          }
        : { kind: "comment" as const, preview: "(삭제됨/없음)", link: null, deleted: true, offender: null },
    };
  });

  const withCounts = enriched.map((r) => ({
    ...r,
    reportCount: countMap.get(`${r.targetType}:${r.targetId}`) ?? 0,
  }));

  return NextResponse.json({ reports: withCounts });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 전체 DB를 JSON으로 덤프 (논리 백업).
 * pg_dump가 CockroachDB와 비호환(pg_extension.tableoid)이라 Prisma로 직접 추출.
 * CRON_SECRET Bearer 필수. 소프트삭제 포함 전부 덤프 → 무손실 복구용.
 *
 * 복구: 이 JSON을 역순(User→Novel→Chapter→Comment→Bookmark→Upload→Report)으로
 *       prisma.createMany 하면 됨. 스키마 변경 없으면 그대로 import 가능.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new NextResponse("CRON_SECRET not configured", { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 의존성 순서대로 추출 (복구 시 이 순서 유지)
  const [users, novels, chapters, comments, bookmarks, uploads, reports] =
    await Promise.all([
      prisma.user.findMany(),
      prisma.novel.findMany(),
      prisma.chapter.findMany(),
      prisma.comment.findMany(),
      prisma.bookmark.findMany(),
      prisma.upload.findMany(),
      prisma.report.findMany(),
    ]);

  const dump = {
    meta: {
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        novels: novels.length,
        chapters: chapters.length,
        comments: comments.length,
        bookmarks: bookmarks.length,
        uploads: uploads.length,
        reports: reports.length,
      },
    },
    users,
    novels,
    chapters,
    comments,
    bookmarks,
    uploads,
    reports,
  };

  return new NextResponse(JSON.stringify(dump), {
    headers: { "content-type": "application/json" },
  });
}

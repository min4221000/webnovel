import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractR2Keys, deleteR2Keys } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RETENTION_DAYS = 7;

/**
 * 소프트 삭제 후 7일 지난 소설/회차/댓글을 영구 삭제 (이미지 포함).
 * Vercel Cron 또는 외부 스케줄러가 호출. CRON_SECRET 헤더로 보호.
 */
export async function GET(req: NextRequest) {
  // 인증: Authorization: Bearer <CRON_SECRET> (Vercel Cron이 자동 첨부)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const allKeys: string[] = [];

  // 1) 삭제된 소설 (소속 회차 이미지 전부 수집 → cascade 영구삭제)
  const novels = await prisma.novel.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, chapters: { select: { content: true } } },
  });
  for (const n of novels) {
    for (const c of n.chapters) allKeys.push(...extractR2Keys(c.content ?? ""));
  }

  // 2) 삭제된 회차 (소설은 살아있고 회차만 삭제된 경우)
  const chapters = await prisma.chapter.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, content: true },
  });
  for (const c of chapters) allKeys.push(...extractR2Keys(c.content ?? ""));

  // 3) 삭제된 댓글
  const comments = await prisma.comment.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });

  // R2 이미지 영구 삭제 (배치 1000개 단위)
  const uniqueKeys = Array.from(new Set(allKeys));
  for (let i = 0; i < uniqueKeys.length; i += 1000) {
    await deleteR2Keys(uniqueKeys.slice(i, i + 1000)).catch(() => {});
  }
  if (uniqueKeys.length) {
    const urls = uniqueKeys.map((k) => `${process.env.R2_PUBLIC_URL}/${k}`);
    await prisma.upload.deleteMany({ where: { url: { in: urls } } });
  }

  // DB 영구 삭제 (소설은 cascade로 회차도 함께 제거)
  const novelIds = novels.map((n) => n.id);
  const chapterIds = chapters.map((c) => c.id);
  const commentIds = comments.map((c) => c.id);

  if (novelIds.length) await prisma.novel.deleteMany({ where: { id: { in: novelIds } } });
  if (chapterIds.length) await prisma.chapter.deleteMany({ where: { id: { in: chapterIds } } });
  if (commentIds.length) await prisma.comment.deleteMany({ where: { id: { in: commentIds } } });

  return NextResponse.json({
    ok: true,
    deleted: { novels: novelIds.length, chapters: chapterIds.length, comments: commentIds.length, images: uniqueKeys.length },
  });
}

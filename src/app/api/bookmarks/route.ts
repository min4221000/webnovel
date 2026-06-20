import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/bookmarks — 내 북마크 목록
export async function GET() {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      novelId: true,
      lastReadChapter: true,
      createdAt: true,
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

  return NextResponse.json({ bookmarks: bookmarks.filter(b => !b.novel.deletedAt) });
}

// POST /api/bookmarks — 북마크 토글
export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }

  const body = await req.json().catch(() => null);
  const novelId = body?.novelId?.toString().trim();
  if (!novelId) return new NextResponse("novelId 필요", { status: 400 });

  const existing = await prisma.bookmark.findUnique({
    where: { userId_novelId: { userId: user.id, novelId } },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { userId_novelId: { userId: user.id, novelId } } });
    return NextResponse.json({ bookmarked: false });
  } else {
    await prisma.bookmark.create({ data: { userId: user.id, novelId } });
    return NextResponse.json({ bookmarked: true });
  }
}

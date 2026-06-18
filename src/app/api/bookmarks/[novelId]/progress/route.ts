import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/bookmarks/[novelId]/progress — 읽은 위치 업데이트
export async function POST(req: NextRequest, { params }: { params: { novelId: string } }) {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }

  const body = await req.json().catch(() => null);
  const chapterNum = Number(body?.chapterNum);
  if (!Number.isFinite(chapterNum) || chapterNum < 1)
    return new NextResponse("chapterNum 필요", { status: 400 });

  await prisma.bookmark.updateMany({
    where: {
      userId: user.id,
      novelId: params.novelId,
      OR: [{ lastReadChapter: null }, { lastReadChapter: { lt: chapterNum } }],
    },
    data: { lastReadChapter: chapterNum },
  });

  return NextResponse.json({ ok: true });
}

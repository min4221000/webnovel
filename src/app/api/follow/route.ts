import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/follow — 작가 팔로우 토글 (팔로우하면 그 작가의 새 회차 알림 수신)
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await rateLimit(`follow:${user.id}`, 20, 10))) {
    return new NextResponse("요청이 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const authorId = body?.authorId?.toString().trim();
  if (!authorId) return new NextResponse("authorId 필요", { status: 400 });
  if (authorId === user.id)
    return new NextResponse("자기 자신은 팔로우할 수 없습니다.", { status: 400 });

  // 대상 작가 존재 확인
  const author = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true } });
  if (!author) return authErrorResponse(new Error("NOT_FOUND"));

  const key = { followerId_authorId: { followerId: user.id, authorId } };
  const existing = await prisma.follow.findUnique({ where: key });

  if (existing) {
    await prisma.follow.delete({ where: key });
    return NextResponse.json({ following: false });
  }
  await prisma.follow.create({ data: { followerId: user.id, authorId } });
  return NextResponse.json({ following: true });
}

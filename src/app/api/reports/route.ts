import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TARGETS = ["chapter", "comment"] as const;

// 신고 접수 (로그인 필요)
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await rateLimit(`report:${user.id}`, 5, 60))) {
    return new NextResponse("신고가 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const targetType = String(body?.targetType ?? "");
  const targetId = String(body?.targetId ?? "");
  const reason = String(body?.reason ?? "").trim();

  if (!(VALID_TARGETS as readonly string[]).includes(targetType))
    return new NextResponse("잘못된 신고 대상입니다.", { status: 400 });
  if (!targetId) return new NextResponse("대상이 없습니다.", { status: 400 });
  if (!reason) return new NextResponse("신고 사유를 입력하세요.", { status: 400 });
  if (reason.length > 500)
    return new NextResponse("사유는 500자 이하여야 합니다.", { status: 400 });

  // 대상 존재 확인
  const exists =
    targetType === "chapter"
      ? await prisma.chapter.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })
      : await prisma.comment.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } });
  if (!exists) return authErrorResponse(new Error("NOT_FOUND"));

  // 중복 신고 방지 (같은 유저가 같은 대상 pending 중복)
  const dup = await prisma.report.findFirst({
    where: { reporterId: user.id, targetType, targetId, status: "pending" },
    select: { id: true },
  });
  if (dup) return new NextResponse("이미 신고한 대상입니다.", { status: 409 });

  await prisma.report.create({
    data: { reporterId: user.id, targetType, targetId, reason },
  });

  return NextResponse.json({ ok: true });
}

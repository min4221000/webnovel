import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 성인 열람 동의 상태
export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { adult: true },
  });
  return NextResponse.json({ adult: !!db?.adult });
}

// 성인(18+) 열람 동의 설정/해제 — 만 19세 이상 자가인증
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }
  const body = await req.json().catch(() => null);
  const adult = body?.adult === true;

  await prisma.user.update({
    where: { id: user.id },
    data: { adult },
  });
  return NextResponse.json({ adult });
}

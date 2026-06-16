import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 사용자 차단/해제 (ADMIN)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (params.id === admin.id)
    return new NextResponse("본인은 차단할 수 없습니다.", { status: 400 });

  const body = await req.json().catch(() => null);
  const banned = Boolean(body?.banned);
  const banReason = banned ? String(body?.banReason ?? "").slice(0, 200) || null : null;

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!target) return authErrorResponse(new Error("NOT_FOUND"));
  if (target.role === "ADMIN")
    return new NextResponse("관리자는 차단할 수 없습니다.", { status: 400 });

  await prisma.user.update({
    where: { id: params.id },
    data: { banned, banReason },
  });
  return NextResponse.json({ ok: true, banned });
}

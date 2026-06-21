import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { invalidateNovels } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["pending", "resolved", "rejected"];

// 신고 상태 변경 (ADMIN)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();
  } catch (e) {
    return authErrorResponse(e);
  }

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!VALID.includes(status))
    return new NextResponse("잘못된 상태값입니다.", { status: 400 });

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    select: { id: true, targetType: true, targetId: true },
  });
  if (!report) return authErrorResponse(new Error("NOT_FOUND"));

  await prisma.report.update({
    where: { id: params.id },
    data: { status },
  });

  // 반려 = 무고 판정 → 자동숨김/소프트삭제된 대상 즉시 복구
  if (status === "rejected") {
    if (report.targetType === "chapter") {
      await prisma.chapter.updateMany({
        where: { id: report.targetId },
        data: { hidden: false },
      });
      invalidateNovels();
    } else if (report.targetType === "comment") {
      await prisma.comment.updateMany({
        where: { id: report.targetId },
        data: { deletedAt: null },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

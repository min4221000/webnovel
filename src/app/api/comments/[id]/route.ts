import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 댓글 소프트 삭제 (본인 또는 ADMIN)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
    select: { authorId: true, deletedAt: true },
  });
  if (!comment || comment.deletedAt)
    return authErrorResponse(new Error("NOT_FOUND"));
  if (comment.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));

  await prisma.comment.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

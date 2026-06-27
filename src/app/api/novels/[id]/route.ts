import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { invalidateNovels } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 소설 정보 수정 (본인만 — ADMIN도 남의 글 수정 불가)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  const novel = await prisma.novel.findUnique({
    where: { id: params.id },
    select: { authorId: true, deletedAt: true },
  });
  if (!novel || novel.deletedAt)
    return authErrorResponse(new Error("NOT_FOUND"));
  if (novel.authorId !== user.id)
    return authErrorResponse(new Error("FORBIDDEN"));

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  const description = (body?.description ?? "").toString().trim() || null;
  const coverImage = (body?.coverImage ?? "").toString().trim() || null;
  const isAdult = body?.isAdult === true;
  const hidden = body?.hidden === true;
  const status = ["ongoing", "completed", "hiatus"].includes(body?.status) ? body.status : "ongoing";
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 10)
    : [];

  if (!title) return new NextResponse("제목을 입력하세요.", { status: 400 });
  if (title.length > 30)
    return new NextResponse("제목은 30자 이하여야 합니다.", { status: 400 });
  if (description && description.length > 200)
    return new NextResponse("설명은 200자 이하여야 합니다.", { status: 400 });
  if (isAdult && !user.adult)
    return new NextResponse("시크릿 플러스를 먼저 켜야 시크릿 플러스 작품을 등록할 수 있습니다. (프로필 → 시크릿 플러스)", { status: 403 });

  await prisma.novel.update({
    where: { id: params.id },
    data: { title, description, coverImage, isAdult, hidden, status, tags },
  });
  invalidateNovels();
  return NextResponse.json({ ok: true });
}

// 소설 소프트 삭제 (본인 또는 ADMIN)
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

  const novel = await prisma.novel.findUnique({
    where: { id: params.id },
    select: { authorId: true, deletedAt: true },
  });
  if (!novel || novel.deletedAt)
    return authErrorResponse(new Error("NOT_FOUND"));
  if (novel.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));

  await prisma.novel.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  invalidateNovels();
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { sanitizeContent, countText, countImages } from "@/lib/sanitize";
import { MAX_CHARS, MAX_IMAGES_PER_CHAPTER } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadChapterOwner(id: string) {
  return prisma.chapter.findUnique({
    where: { id },
    select: { id: true, deletedAt: true, novel: { select: { authorId: true } } },
  });
}

// 회차 수정 (본인 또는 ADMIN)
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

  const ch = await loadChapterOwner(params.id);
  if (!ch) return authErrorResponse(new Error("NOT_FOUND"));

  const body = await req.json().catch(() => null);

  // 재게시 (ADMIN)
  if (body?.restore === true) {
    if (user.role !== "ADMIN") return authErrorResponse(new Error("FORBIDDEN"));
    await prisma.chapter.update({ where: { id: params.id }, data: { deletedAt: null } });
    return NextResponse.json({ ok: true });
  }

  if (ch.deletedAt) return authErrorResponse(new Error("NOT_FOUND"));
  if (ch.novel.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));

  const title = (body?.title ?? "").toString().trim();
  const content = sanitizeContent((body?.content ?? "").toString());
  const charCount = countText(content);
  const imageCount = countImages(content);

  if (!title) return new NextResponse("제목을 입력하세요.", { status: 400 });
  if (charCount === 0)
    return new NextResponse("본문이 비어 있습니다.", { status: 400 });
  if (charCount > MAX_CHARS)
    return new NextResponse(`본문은 ${MAX_CHARS.toLocaleString()}자 초과 불가.`, { status: 400 });
  if (imageCount > MAX_IMAGES_PER_CHAPTER)
    return new NextResponse(`이미지는 회차당 최대 ${MAX_IMAGES_PER_CHAPTER}장입니다.`, { status: 400 });

  await prisma.chapter.update({
    where: { id: params.id },
    data: { title, content, charCount, imageCount },
  });
  return NextResponse.json({ ok: true });
}

// 회차 소프트 삭제 (본인 또는 ADMIN)
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

  const ch = await loadChapterOwner(params.id);
  if (!ch || ch.deletedAt) return authErrorResponse(new Error("NOT_FOUND"));
  if (ch.novel.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));

  await prisma.chapter.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

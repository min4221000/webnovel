import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { sanitizeContent, countText, countImages } from "@/lib/sanitize";
import { MAX_CHARS, MAX_IMAGES_PER_CHAPTER } from "@/lib/constants";
import { deleteR2Keys, removedKeys } from "@/lib/r2";
import { invalidateNovels } from "@/lib/queries";
import { notifyNewChapter } from "@/lib/discordNotify";
import { displayName } from "@/lib/displayName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadChapterOwner(id: string) {
  return prisma.chapter.findUnique({
    where: { id },
    select: {
      id: true,
      deletedAt: true,
      content: true,
      chapterNum: true,
      novel: {
        select: {
          id: true,
          title: true,
          isAdult: true,
          authorId: true,
          author: { select: { username: true, nickname: true } },
        },
      },
    },
  });
}

// 비공개 회차 발행 시 북마커에게 디코 알림 (includeBody=false면 제목+링크만 — 스포 방지)
async function notifyBookmarkers(
  ch: NonNullable<Awaited<ReturnType<typeof loadChapterOwner>>>,
  title: string,
  content: string,
  includeBody: boolean,
) {
  const bookmarkers = await prisma.bookmark.findMany({
    where: { novelId: ch.novel.id, user: { webhookUrl: { not: null } } },
    select: { user: { select: { webhookUrl: true } } },
  });
  const webhookUrls = bookmarkers.map((b) => b.user.webhookUrl).filter(Boolean) as string[];
  if (webhookUrls.length === 0) return;
  await notifyNewChapter({
    webhookUrls,
    novelTitle: ch.novel.title,
    novelId: ch.novel.id,
    chapterNum: ch.chapterNum,
    chapterTitle: title,
    authorName: displayName(ch.novel.author),
    isAdult: ch.novel.isAdult,
    contentHtml: includeBody ? content : undefined,
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
    invalidateNovels();
    return NextResponse.json({ ok: true });
  }

  if (ch.deletedAt) return authErrorResponse(new Error("NOT_FOUND"));
  if (ch.novel.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));

  const title = (body?.title ?? "").toString().trim();
  const content = sanitizeContent((body?.content ?? "").toString());
  const charCount = countText(content);
  const imageCount = countImages(content);
  // publish=true: 비공개→공개 전환 + 북마커 알림. hidden 강제 false.
  const publish = body?.publish === true;
  const hidden = publish ? false : typeof body?.hidden === "boolean" ? body.hidden : undefined;

  if (!title) return new NextResponse("제목을 입력하세요.", { status: 400 });
  if (title.length > 100)
    return new NextResponse("회차 제목은 100자 이하여야 합니다.", { status: 400 });
  if (charCount === 0)
    return new NextResponse("본문이 비어 있습니다.", { status: 400 });
  if (charCount > MAX_CHARS)
    return new NextResponse(`본문은 ${MAX_CHARS.toLocaleString()}자 초과 불가.`, { status: 400 });
  if (imageCount > MAX_IMAGES_PER_CHAPTER)
    return new NextResponse(`이미지는 회차당 최대 ${MAX_IMAGES_PER_CHAPTER}장입니다.`, { status: 400 });

  const oldContent = ch.content ?? "";
  await prisma.chapter.update({
    where: { id: params.id },
    data: { title, content, charCount, imageCount, ...(hidden !== undefined ? { hidden } : {}) },
  });

  // 교체된 이미지 R2에서 삭제
  const gone = removedKeys(oldContent, content);
  if (gone.length) {
    await deleteR2Keys(gone).catch(() => {});
    await prisma.upload.deleteMany({ where: { url: { in: gone.map((k) => `${process.env.R2_PUBLIC_URL}/${k}`) } } });
  }

  invalidateNovels(); // hidden 토글 시 회차수 변동 → 목록 갱신

  // 발행 요청이면 북마커에게 디코 알림 (최신 title/content 기준)
  if (publish) {
    await notifyBookmarkers(ch, title, content, body?.notifyBody !== false);
    return NextResponse.json({ ok: true, published: true });
  }
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

  // 소프트 삭제만 (이미지는 보존 → 관리자 복구 시 깨지지 않음)
  await prisma.chapter.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  invalidateNovels(); // 회차수 변동 → 목록 갱신
  return NextResponse.json({ ok: true });
}

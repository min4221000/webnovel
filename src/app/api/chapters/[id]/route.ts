import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { sanitizeContent, countText, countImages } from "@/lib/sanitize";
import { MAX_CHARS, MAX_IMAGES_PER_CHAPTER } from "@/lib/constants";
import { deleteR2Keys, removedKeys, extractR2Keys } from "@/lib/r2";
import { invalidateNovels } from "@/lib/queries";
import { notifyChapterToSubscribers } from "@/lib/notifyChapter";
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

// 회차 수정 (본인만 — ADMIN은 재게시/삭제만, 수정 불가)
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
  if (ch.novel.authorId !== user.id)
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

  // 회차 번호 변경: 입력값이 현재와 다르면 그 번호로. 활성 회차와 충돌 시 거부(자동 재정렬 X).
  let newNum = ch.chapterNum;
  const reqNum = body?.chapterNum != null ? Number(body.chapterNum) : null;
  if (reqNum !== null && Number.isInteger(reqNum) && reqNum > 0 && reqNum !== ch.chapterNum) {
    const dup = await prisma.chapter.findFirst({
      where: { novelId: ch.novel.id, chapterNum: reqNum, id: { not: ch.id } },
      select: { id: true, deletedAt: true, content: true },
    });
    if (dup && !dup.deletedAt) {
      return new NextResponse(`${reqNum}화는 이미 존재합니다. 다른 번호를 입력하세요.`, { status: 409 });
    }
    if (dup && dup.deletedAt) {
      // 삭제된 회차 번호 재사용: 고아 R2 이미지 정리 후 제거
      const keys = extractR2Keys(dup.content ?? "");
      if (keys.length) {
        await deleteR2Keys(keys).catch(() => {});
        await prisma.upload.deleteMany({
          where: { url: { in: keys.map((k) => `${process.env.R2_PUBLIC_URL}/${k}`) } },
        });
      }
      await prisma.chapter.delete({ where: { id: dup.id } });
    }
    newNum = reqNum;
  }

  const oldContent = ch.content ?? "";
  await prisma.chapter.update({
    where: { id: params.id },
    data: { title, content, charCount, imageCount, chapterNum: newNum, ...(hidden !== undefined ? { hidden } : {}) },
  });

  // 교체된 이미지 R2에서 삭제
  const gone = removedKeys(oldContent, content);
  if (gone.length) {
    await deleteR2Keys(gone).catch(() => {});
    await prisma.upload.deleteMany({ where: { url: { in: gone.map((k) => `${process.env.R2_PUBLIC_URL}/${k}`) } } });
  }

  invalidateNovels(); // hidden 토글 시 회차수 변동 → 목록 갱신

  // 발행 요청이면 북마커에게 디코 알림 (본문 포함 여부는 수신자별 설정)
  // best-effort: 알림 실패해도 공개 전환(이미 완료)은 성공 처리.
  if (publish) {
    try {
      await notifyChapterToSubscribers({
        novelId: ch.novel.id,
        authorId: ch.novel.authorId,
        novelTitle: ch.novel.title,
        chapterNum: newNum,
        chapterTitle: title,
        authorName: displayName(ch.novel.author),
        isAdult: ch.novel.isAdult,
        content,
      });
    } catch (e) {
      console.error("발행 알림 실패:", e);
    }
    return NextResponse.json({ ok: true, published: true, chapterNum: newNum });
  }
  return NextResponse.json({ ok: true, chapterNum: newNum });
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

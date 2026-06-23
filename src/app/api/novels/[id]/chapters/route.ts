import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { sanitizeContent, countText, countImages } from "@/lib/sanitize";
import { rateLimit } from "@/lib/ratelimit";
import { MAX_CHARS, MAX_IMAGES_PER_CHAPTER } from "@/lib/constants";
import { notifyChapterToSubscribers } from "@/lib/notifyChapter";
import { displayName } from "@/lib/displayName";
import { invalidateNovels } from "@/lib/queries";
import { extractR2Keys, deleteR2Keys } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 회차 작성
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await rateLimit(`chapter:${user.id}`, 30, 60))) {
    return new NextResponse("회차 작성이 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const novel = await prisma.novel.findUnique({
    where: { id: params.id },
    select: {
      authorId: true,
      deletedAt: true,
      title: true,
      isAdult: true,
      author: { select: { username: true, nickname: true } },
    },
  });
  if (!novel || novel.deletedAt)
    return authErrorResponse(new Error("NOT_FOUND"));
  if (novel.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  const rawContent = (body?.content ?? "").toString();
  if (!title) return new NextResponse("회차 제목을 입력하세요.", { status: 400 });
  if (title.length > 100)
    return new NextResponse("회차 제목은 100자 이하여야 합니다.", { status: 400 });

  // 서버측 새니타이즈 + 검증 (클라이언트 우회 방어)
  const content = sanitizeContent(rawContent);
  const charCount = countText(content);
  const imageCount = countImages(content);

  if (charCount === 0)
    return new NextResponse("본문이 비어 있습니다.", { status: 400 });
  if (charCount > MAX_CHARS)
    return new NextResponse(
      `본문은 ${MAX_CHARS.toLocaleString()}자를 초과할 수 없습니다. (현재 ${charCount.toLocaleString()}자)`,
      { status: 400 },
    );
  if (imageCount > MAX_IMAGES_PER_CHAPTER)
    return new NextResponse(
      `이미지는 회차당 최대 ${MAX_IMAGES_PER_CHAPTER}장입니다.`,
      { status: 400 },
    );

  // 회차 번호: 직접 지정 or 자동
  const requestedNum = body?.chapterNum ? Number(body.chapterNum) : null;
  let chapterNum: number;

  if (requestedNum && Number.isInteger(requestedNum) && requestedNum > 0) {
    const dup = await prisma.chapter.findFirst({
      where: { novelId: params.id, chapterNum: requestedNum },
      select: { id: true, deletedAt: true, content: true },
    });
    if (dup && !dup.deletedAt) {
      return new NextResponse(`${requestedNum}화는 이미 존재합니다. 다른 번호를 입력하세요.`, { status: 409 });
    }
    if (dup && dup.deletedAt) {
      // 삭제된 회차 번호 재사용: 기존 삭제 레코드의 R2 이미지 먼저 정리 후 제거 (고아 이미지 방지)
      const keys = extractR2Keys(dup.content ?? "");
      if (keys.length) {
        await deleteR2Keys(keys).catch(() => {});
        await prisma.upload.deleteMany({
          where: { url: { in: keys.map((k) => `${process.env.R2_PUBLIC_URL}/${k}`) } },
        });
      }
      await prisma.chapter.delete({ where: { id: dup.id } });
    }
    chapterNum = requestedNum;
  } else {
    const last = await prisma.chapter.findFirst({
      where: { novelId: params.id },
      orderBy: { chapterNum: "desc" },
      select: { chapterNum: true },
    });
    chapterNum = (last?.chapterNum ?? 0) + 1;
  }

  const hidden = body?.hidden === true;

  const chapter = await prisma.chapter.create({
    data: {
      novelId: params.id,
      chapterNum,
      title,
      content,
      charCount,
      imageCount,
      hidden,
    },
    select: { chapterNum: true },
  });

  await prisma.novel.update({
    where: { id: params.id },
    data: { updatedAt: new Date() },
  });
  invalidateNovels(); // 회차수·최신순 변동 → 목록 갱신

  // 디스코드 새 회차 알림: 북마크한 유저에게 (공개 회차만).
  // 본문 포함 여부는 수신자별 previewBookmarkBody 설정에 따름.
  // best-effort: 알림 실패가 회차 저장(이미 성공)을 깨지 않도록 try/catch.
  if (!hidden) {
    try {
      await notifyChapterToSubscribers({
        novelId: params.id,
        novelTitle: novel.title,
        chapterNum: chapter.chapterNum,
        chapterTitle: title,
        authorName: displayName(novel.author), // 별명/서버닉 우선
        isAdult: novel.isAdult,
        content,
      });
    } catch (e) {
      console.error("새 회차 알림 실패:", e);
    }
  }

  return NextResponse.json({ chapterNum: chapter.chapterNum, hidden });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";
import { notifyNewNovel } from "@/lib/discordNotify";
import { displayName } from "@/lib/displayName";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 신작 알림 발송 (작가 본인 또는 ADMIN). "신작 알림 받기" 켠 유저에게만 1회 발송.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await rateLimit(`announce:${user.id}`, 5, 60))) {
    return new NextResponse("요청이 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const novel = await prisma.novel.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      isAdult: true,
      hidden: true,
      deletedAt: true,
      authorId: true,
      newNovelNotified: true,
      author: { select: { username: true, nickname: true } },
    },
  });
  if (!novel || novel.deletedAt) return authErrorResponse(new Error("NOT_FOUND"));
  if (novel.authorId !== user.id && user.role !== "ADMIN")
    return authErrorResponse(new Error("FORBIDDEN"));
  if (novel.hidden)
    return new NextResponse("비공개 소설은 신작 알림을 보낼 수 없습니다. 먼저 공개로 전환하세요.", { status: 400 });
  if (novel.newNovelNotified)
    return new NextResponse("이미 신작 알림을 보낸 소설입니다.", { status: 409 });

  // 중복 발송 방지 플래그 먼저 세팅 (동시요청 방어)
  await prisma.novel.update({ where: { id: params.id }, data: { newNovelNotified: true } });

  // 수신자: 신작 알림 opt-in + 웹훅 등록자. 19+ 작품은 성인 열람 켠 사람만.
  const recipients = await prisma.user.findMany({
    where: {
      notifyNewNovels: true,
      webhookUrl: { not: null },
      ...(novel.isAdult ? { adult: true } : {}),
    },
    select: { webhookUrl: true },
  });
  const urls = recipients.map((r) => r.webhookUrl).filter(Boolean) as string[];

  await notifyNewNovel({
    webhookUrls: urls,
    novelId: novel.id,
    novelTitle: novel.title,
    description: novel.description,
    authorName: displayName(novel.author),
    isAdult: novel.isAdult,
  });

  return NextResponse.json({ ok: true, sent: urls.length });
}

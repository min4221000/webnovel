import { prisma } from "@/lib/prisma";
import { notifyNewNovel } from "@/lib/discordNotify";
import { displayName } from "@/lib/displayName";

/**
 * 신작 알림 발송 (조건 충족 시 1회만). 소설 저장 시 announce 체크된 경우 호출.
 * 공개 + 미발송 상태에서만 동작. 중복 방지 위해 플래그를 전송 전에 세팅.
 * @returns 보낸 수, 조건 미충족이면 null
 */
export async function announceNewNovel(novelId: string): Promise<number | null> {
  const novel = await prisma.novel.findUnique({
    where: { id: novelId },
    select: {
      id: true,
      title: true,
      description: true,
      isAdult: true,
      hidden: true,
      deletedAt: true,
      newNovelNotified: true,
      author: { select: { username: true, nickname: true } },
    },
  });
  if (!novel || novel.deletedAt || novel.hidden || novel.newNovelNotified) return null;

  // 중복 발송 방지 플래그 먼저 세팅 (동시요청 방어)
  await prisma.novel.update({ where: { id: novelId }, data: { newNovelNotified: true } });

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
  return urls.length;
}

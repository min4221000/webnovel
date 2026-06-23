import { prisma } from "@/lib/prisma";
import { notifyNewChapter } from "@/lib/discordNotify";

/**
 * 새 회차 알림을 북마커에게 발송.
 * 수신자별 previewBookmarkBody 설정에 따라 본문 포함/링크만 분기.
 * (본문 미리보기는 받는 사람이 프로필에서 켠 경우에만 — 기본 OFF)
 */
export async function notifyChapterToBookmarkers(opts: {
  novelId: string;
  novelTitle: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string;
  isAdult: boolean;
  content: string;
}): Promise<void> {
  const bookmarkers = await prisma.bookmark.findMany({
    where: { novelId: opts.novelId, user: { webhookUrl: { not: null } } },
    select: { user: { select: { webhookUrl: true, previewBookmarkBody: true } } },
  });

  const withBody: string[] = [];
  const linkOnly: string[] = [];
  for (const b of bookmarkers) {
    const u = b.user;
    if (!u.webhookUrl) continue;
    (u.previewBookmarkBody ? withBody : linkOnly).push(u.webhookUrl);
  }
  if (withBody.length === 0 && linkOnly.length === 0) return;

  const common = {
    novelTitle: opts.novelTitle,
    novelId: opts.novelId,
    chapterNum: opts.chapterNum,
    chapterTitle: opts.chapterTitle,
    authorName: opts.authorName,
    isAdult: opts.isAdult,
  };

  await Promise.all([
    withBody.length
      ? notifyNewChapter({ ...common, webhookUrls: withBody, contentHtml: opts.content })
      : Promise.resolve(),
    linkOnly.length
      ? notifyNewChapter({ ...common, webhookUrls: linkOnly, contentHtml: undefined })
      : Promise.resolve(),
  ]);
}

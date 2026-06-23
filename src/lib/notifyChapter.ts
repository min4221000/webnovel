import { prisma } from "@/lib/prisma";
import { notifyNewChapter } from "@/lib/discordNotify";

/**
 * 새 회차 알림 발송 대상 =
 *   (이 소설을 북마크한 사람) ∪ (모든 새 회차 알림 켠 사람) ∪ (이 작가를 팔로우한 사람).
 * 웹후크 등록자만, 19+ 회차는 성인 열람 켠 사람만. 한 유저는 1회만(자동 dedup).
 * 본문 포함 여부는 수신자별 previewBookmarkBody 설정에 따라 분기.
 */
export async function notifyChapterToSubscribers(opts: {
  novelId: string;
  authorId: string;
  novelTitle: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string;
  isAdult: boolean;
  content: string;
}): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      webhookUrl: { not: null },
      ...(opts.isAdult ? { adult: true } : {}),
      OR: [
        { bookmarks: { some: { novelId: opts.novelId } } },
        { notifyAllChapters: true },
        { following: { some: { authorId: opts.authorId } } },
      ],
    },
    select: { webhookUrl: true, previewBookmarkBody: true },
  });

  const withBody: string[] = [];
  const linkOnly: string[] = [];
  for (const u of users) {
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

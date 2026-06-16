/**
 * 디스코드 웹훅으로 새 회차 알림 전송.
 * DISCORD_WEBHOOK_URL 미설정 시 조용히 무시.
 */
export async function notifyNewChapter(opts: {
  novelTitle: string;
  novelId: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string;
  isAdult: boolean;
}): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const link = base ? `${base}/novel/${opts.novelId}` : undefined;

  const embed = {
    title: `📖 ${opts.novelTitle} — ${opts.chapterNum}화`,
    description: opts.chapterTitle,
    url: link,
    color: opts.isAdult ? 0xef4444 : 0x6366f1,
    fields: [{ name: "작가", value: opts.authorName, inline: true }],
    footer: { text: opts.isAdult ? "🔞 성인 작품" : "새 회차 연재" },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `**${opts.novelTitle}** 새 회차가 올라왔습니다!`,
        embeds: [embed],
      }),
    });
  } catch {
    /* 알림 실패는 회차 작성에 영향 주지 않음 */
  }
}

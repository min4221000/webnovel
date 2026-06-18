const WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//;

export async function notifyNewChapter(opts: {
  webhookUrls: string[];
  novelTitle: string;
  novelId: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string;
  isAdult: boolean;
}): Promise<void> {
  const valid = opts.webhookUrls.filter((u) => WEBHOOK_RE.test(u));
  if (valid.length === 0) return;

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const link = base ? `${base}/novel/${opts.novelId}/chapter/${opts.chapterNum}` : undefined;

  const payload = JSON.stringify({
    content: `**${opts.novelTitle}** 새 회차가 올라왔습니다!`,
    embeds: [
      {
        title: `📖 ${opts.novelTitle} — ${opts.chapterNum}화`,
        description: opts.chapterTitle,
        url: link,
        color: opts.isAdult ? 0xef4444 : 0x6366f1,
        fields: [{ name: "작가", value: opts.authorName, inline: true }],
        footer: { text: opts.isAdult ? "🔞 시크릿 플러스" : "새 회차 연재" },
        timestamp: new Date().toISOString(),
      },
    ],
  });

  await Promise.allSettled(
    valid.map((url) =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload })
    )
  );
}

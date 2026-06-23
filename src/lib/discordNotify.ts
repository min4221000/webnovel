const WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//;

// 에디터 HTML 본문 → 디스코드 텍스트. 폰트/크기/색은 디코가 지원 안 하므로
// "줄바꿈·문단 간격"만 보존 (요청사항). 블록 끝=빈 줄, <br>=줄바꿈.
function htmlToDiscordText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n") // 빈 줄 과다 정리
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export async function notifyNewChapter(opts: {
  webhookUrls: string[];
  novelTitle: string;
  novelId: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string;
  isAdult: boolean;
  contentHtml?: string; // 있으면 본문 통째로 첨부 (Discord 한도까지)
}): Promise<void> {
  const valid = opts.webhookUrls.filter((u) => WEBHOOK_RE.test(u));
  if (valid.length === 0) return;

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const link = base ? `${base}/novel/${opts.novelId}/chapter/${opts.chapterNum}` : undefined;

  // 본문 전체를 줄바꿈·문단간격 보존해 첨부.
  // Discord embed 합산 한도 6000자 → 제목/푸터/링크 여유 빼고 본문 예산 ~5500.
  // 초과분만 잘림(이건 Discord 구조적 한계 — 한 메시지엔 더 못 넣음).
  const titleLine = `**${opts.chapterTitle}**`;
  const linkLine = link ? `\n\n**[▶ ${opts.chapterNum}화 이어 읽기](${link})**` : "";
  const budget = 5500 - titleLine.length - linkLine.length;

  let body = opts.contentHtml ? htmlToDiscordText(opts.contentHtml) : "";
  let cut = false;
  if (body.length > budget) {
    const sliced = body.slice(0, budget);
    const br = sliced.lastIndexOf("\n\n");
    body = (br > budget * 0.5 ? sliced.slice(0, br) : sliced).trimEnd();
    cut = true;
  }

  const description =
    titleLine +
    (body ? `\n\n${body}` : "") +
    (cut ? "\n\n…(이어서는 사이트에서 ↓)" : "") +
    linkLine;

  const payload = JSON.stringify({
    content: `**${opts.novelTitle}** 새 회차가 올라왔습니다!`,
    embeds: [
      {
        title: `📖 ${opts.novelTitle} — ${opts.chapterNum}화`,
        description: description.slice(0, 4096), // 디코 embed description 상한
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

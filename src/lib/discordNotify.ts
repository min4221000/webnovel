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

// 글자수 제한 대응: 전체 본문 X → 문단 경계에서 자른 미리보기 + "계속은 사이트에서"
function previewFor(html: string, max = 1200): string {
  const text = htmlToDiscordText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastBreak = cut.lastIndexOf("\n\n");
  const body = lastBreak > max * 0.5 ? cut.slice(0, lastBreak) : cut;
  return body.trimEnd() + "\n\n…(계속은 사이트에서 ↓)";
}

export async function notifyNewChapter(opts: {
  webhookUrls: string[];
  novelTitle: string;
  novelId: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string;
  isAdult: boolean;
  contentHtml?: string; // 있으면 미리보기 첨부 (19+는 생략)
}): Promise<void> {
  const valid = opts.webhookUrls.filter((u) => WEBHOOK_RE.test(u));
  if (valid.length === 0) return;

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const link = base ? `${base}/novel/${opts.novelId}/chapter/${opts.chapterNum}` : undefined;

  // 19+ 미리보기는 공개 채널 노출 위험 → 제목/링크만. 일반작은 본문 미리보기 첨부.
  const preview = !opts.isAdult && opts.contentHtml ? previewFor(opts.contentHtml) : "";

  // embed description: 제목 + (미리보기) + 바로가기 링크. 마스킹 링크가 "버튼" 역할.
  // (웹훅은 진짜 버튼 컴포넌트 불가 → 굵은 마스킹 링크가 차선)
  const description =
    `**${opts.chapterTitle}**` +
    (preview ? `\n\n${preview}` : "") +
    (link ? `\n\n**[▶ ${opts.chapterNum}화 바로 읽기](${link})**` : "");

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

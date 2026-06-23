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

// 본문을 문단/줄 경계에서 size 단위로 분할. maxParts 초과분은 잘림(truncated=true).
function chunkText(text: string, size: number, maxParts: number): { parts: string[]; truncated: boolean } {
  const parts: string[] = [];
  let i = 0;
  while (i < text.length && parts.length < maxParts) {
    let end = Math.min(i + size, text.length);
    if (end < text.length) {
      const slice = text.slice(i, end);
      const br = slice.lastIndexOf("\n\n");
      const nl = slice.lastIndexOf("\n");
      const at = br > size * 0.5 ? br : nl > size * 0.5 ? nl : -1;
      if (at > 0) end = i + at;
    }
    parts.push(text.slice(i, end).trim());
    i = end;
  }
  return { parts: parts.filter(Boolean), truncated: i < text.length };
}

type Embed = {
  title: string;
  description: string;
  color: number;
  url?: string;
  image?: { url: string };
  fields?: { name: string; value: string; inline: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

// 본문 HTML에서 첫 이미지 URL 추출 (Discord embed에 표시용). 절대 http(s) URL만.
function firstImageUrl(html: string): string | undefined {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const url = m?.[1];
  return url && /^https?:\/\//.test(url) ? url : undefined;
}
type Message = { content?: string; embeds: Embed[] };

const PART_SIZE = 4000; // embed description 한도 4096 여유
const MAX_PARTS = 8; // 너무 긴 회차 도배 방지 (≈32k자), 초과분은 링크 유도

export async function notifyNewChapter(opts: {
  webhookUrls: string[];
  novelTitle: string;
  novelId: string;
  chapterNum: number;
  chapterTitle: string;
  authorName: string; // 별명/서버닉 우선 (호출부에서 displayName 처리)
  isAdult: boolean;
  contentHtml?: string;
}): Promise<void> {
  const valid = opts.webhookUrls.filter((u) => WEBHOOK_RE.test(u));
  if (valid.length === 0) return;

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const link = base ? `${base}/novel/${opts.novelId}/chapter/${opts.chapterNum}` : undefined;

  const full = opts.contentHtml ? htmlToDiscordText(opts.contentHtml) : "";
  const { parts, truncated } = full
    ? chunkText(full, PART_SIZE, MAX_PARTS)
    : { parts: [] as string[], truncated: false };

  const headerTitle = `📖 ${opts.novelTitle} — ${opts.chapterNum}화`;
  const color = opts.isAdult ? 0xef4444 : 0x6366f1;
  const footerText = opts.isAdult ? "🔞 시크릿 플러스" : "새 회차 연재";
  const linkLine = link
    ? `\n\n**[▶ ${opts.chapterNum}화 ${parts.length > 1 ? "전체 보기" : "바로 읽기"}](${link})**`
    : "";

  // 메시지(=POST) 배열. 본문이 길면 여러 메시지로 "이어서" 연속 전송.
  // 작가/푸터/링크는 마지막 메시지에만 (글 끝에 표시).
  const total = Math.max(parts.length, 1);
  const messages: Message[] = [];
  for (let idx = 0; idx < total; idx++) {
    const isFirst = idx === 0;
    const isLast = idx === total - 1;
    const chunk = parts[idx] ?? "";

    let desc = isFirst ? `**${opts.chapterTitle}**\n\n` : "";
    desc += chunk;
    if (isLast) desc += (truncated ? "\n\n…(이어서는 사이트에서 ↓)" : "") + linkLine;

    const embed: Embed = {
      title: isFirst ? headerTitle : `${headerTitle} (이어서 ${idx + 1}/${total})`,
      description: desc.slice(0, 4096),
      color,
    };
    if (isFirst && link) embed.url = link;
    if (isLast) {
      embed.fields = [{ name: "작가", value: opts.authorName, inline: true }];
      embed.footer = { text: footerText };
      embed.timestamp = new Date().toISOString();
    }

    const msg: Message = { embeds: [embed] };
    if (isFirst) msg.content = `**${opts.novelTitle}** 새 회차가 올라왔습니다!`;
    messages.push(msg);
  }

  // 본문에 이미지 있으면 첫 메시지 embed에 표시 (본문 미리보기 켠 수신자만 — contentHtml 있을 때)
  const imageUrl = opts.contentHtml ? firstImageUrl(opts.contentHtml) : undefined;
  if (imageUrl && messages[0]) messages[0].embeds[0].image = { url: imageUrl };

  // 웹훅별로 순서 보장하며 전송(파트 순서 중요), 웹훅 간엔 병렬. rate limit 여유 딜레이.
  async function sendTo(url: string) {
    for (let k = 0; k < messages.length; k++) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages[k]),
      }).catch(() => {});
      if (k < messages.length - 1) await new Promise((r) => setTimeout(r, 400));
    }
  }
  await Promise.allSettled(valid.map(sendTo));
}

/** 신작(새 소설) 알림 — "신작 알림 받기" opt-in한 유저에게 발송 */
export async function notifyNewNovel(opts: {
  webhookUrls: string[];
  novelId: string;
  novelTitle: string;
  description?: string | null;
  authorName: string;
  isAdult: boolean;
}): Promise<void> {
  const valid = opts.webhookUrls.filter((u) => WEBHOOK_RE.test(u));
  if (valid.length === 0) return;

  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");
  const link = base ? `${base}/novel/${opts.novelId}` : undefined;

  const desc = (opts.description || "").trim();
  const descPart = desc ? `${desc.slice(0, 500)}${desc.length > 500 ? "…" : ""}\n\n` : "";
  const linkLine = link ? `**[▶ 소설 보러가기](${link})**` : "";

  const embed: Embed = {
    title: `📚 ${opts.novelTitle}`,
    description: (descPart + linkLine).slice(0, 4096),
    color: opts.isAdult ? 0xef4444 : 0x10b981,
    fields: [{ name: "작가", value: opts.authorName, inline: true }],
    footer: { text: opts.isAdult ? "🔞 새 시크릿 플러스 작품" : "새 소설 연재 시작" },
    timestamp: new Date().toISOString(),
  };
  if (link) embed.url = link;

  const body = JSON.stringify({ content: "📚 새 소설이 연재됐습니다!", embeds: [embed] });
  await Promise.allSettled(
    valid.map((url) =>
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(() => {}),
    ),
  );
}

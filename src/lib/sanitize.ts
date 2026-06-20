import sanitizeHtml from "sanitize-html";
import { YOUTUBE_HOSTS } from "./constants";

/**
 * 에디터에서 받은 HTML을 저장 전 새니타이즈.
 * - script/on* 속성 제거
 * - iframe 은 유튜브 호스트만 허용
 * - img src 는 http/https 만 (data: URI 금지 → 인라인 거대 이미지 차단)
 */
export function sanitizeContent(dirty: string): string {
  let html = sanitizeHtml(dirty, {
    allowedTags: [
      "p", "br", "span", "div", "strong", "b", "em", "i", "u", "s",
      "blockquote", "ul", "ol", "li", "a", "img",
      "h1", "h2", "h3", "h4", "mark", "hr",
      "table", "thead", "tbody", "tr", "th", "td",
      "iframe",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "style", "class"],
      span: ["style", "class"],
      p: ["style", "class"],
      div: ["style", "class", "data-youtube-video", "data-wn-effect", "data-wn-color", "data-wn-text-color", "data-wn-hide-styles"],
      h1: ["style"], h2: ["style"], h3: ["style"], h4: ["style"],
      mark: ["style", "class", "data-color"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
      table: ["style", "class"],
      iframe: ["src", "width", "height", "allow", "allowfullscreen", "frameborder", "referrerpolicy"],
    },
    allowedStyles: {
      "*": {
        color: [/^#(0x)?[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s,.%]+\)$/],
        "background-color": [/^#(0x)?[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s,.%]+\)$/],
        "text-align": [/^(left|right|center|justify)$/],
        "line-height": [/^\d+(\.\d+)?$/],
        "font-family": [/^[\w\s,'"\-가-힣]+$/],
        "font-size": [/^\d{1,3}(px|em|rem|%)$/],
        width: [/^\d{1,4}(px|%)$/],
        height: [/^\d{1,4}(px|%)$/],
        float: [/^(left|right|none)$/],
      },
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https"], a: ["http", "https", "mailto"] },
    allowedIframeHostnames: YOUTUBE_HOSTS,
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
    },
  });
  // TipTap이 기본값도 명시 → 불필요한 HTML 크기 증가 제거
  html = html.replace(/\btext-align:\s*left\s*;?\s*/gi, "");
  html = html.replace(/\s?style=""/gi, "");
  return html;
}

/** HTML에서 태그를 제거한 순수 텍스트 글자수 (10만자 제한 검증용) */
export function countText(html: string): number {
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
  return Array.from(text.replace(/\s+/g, " ").trim()).length;
}

/** content 내 <img> 개수 (회차당 3장 제한 검증용) */
export function countImages(html: string): number {
  const matches = html.match(/<img\b/gi);
  return matches ? matches.length : 0;
}

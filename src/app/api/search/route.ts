import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewerAdult } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 검색어 주변 텍스트를 잘라 <mark>로 강조한 snippet HTML 생성 (escape 후 mark 삽입 → XSS 안전) */
function makeSnippet(text: string, q: string, win = 60): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) {
    return escapeHtml(text.slice(0, 140)) + (text.length > 140 ? "…" : "");
  }
  const start = Math.max(0, idx - win);
  const end = Math.min(text.length, idx + q.length + win);
  const before = escapeHtml(text.slice(start, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length, end));
  return (
    (start > 0 ? "…" : "") +
    before +
    `<mark class="wn-hl">${match}</mark>` +
    after +
    (end < text.length ? "…" : "")
  );
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const type = sp.get("type") || "unified";
  if (!q) return NextResponse.json({ type, results: [] });

  // 성인 열람 OFF면 18+ 작품 제외
  const adult = await getViewerAdult();
  const adultFilter = adult ? {} : { isAdult: false };

  // ----- 글쓴이 검색 -----
  if (type === "author") {
    const authors = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { nickname: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        novels: {
          where: { deletedAt: null, hidden: false, ...adultFilter },
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            coverImage: true,
            _count: { select: { chapters: { where: { deletedAt: null } } } },
          },
        },
      },
    });
    return NextResponse.json({ type, authors });
  }

  // ----- 제목 검색 -----
  if (type === "title") {
    const novels = await prisma.novel.findMany({
      where: { deletedAt: null, hidden: false, ...adultFilter, title: { contains: q, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        coverImage: true,
        description: true,
        author: { select: { id: true, username: true, nickname: true } },
        _count: { select: { chapters: { where: { deletedAt: null } } } },
      },
    });
    const results = novels.map((n) => ({
      novelId: n.id,
      title: n.title,
      coverImage: n.coverImage,
      author: n.author,
      chapterCount: n._count.chapters,
      snippetHtml: n.description ? makeSnippet(n.description, q) : null,
    }));
    return NextResponse.json({ type, results });
  }

  // ----- 통합 검색 (제목 + 설명 + 태그 + 회차 본문) -----
  const [byMeta, byContent] = await Promise.all([
    prisma.novel.findMany({
      where: {
        deletedAt: null,
        hidden: false,
        ...adultFilter,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      take: 40,
      select: {
        id: true,
        title: true,
        coverImage: true,
        description: true,
        author: { select: { id: true, username: true, nickname: true } },
        _count: { select: { chapters: { where: { deletedAt: null } } } },
      },
    }),
    prisma.chapter.findMany({
      where: {
        deletedAt: null,
        content: { contains: q, mode: "insensitive" },
        novel: { deletedAt: null, hidden: false, ...adultFilter },
      },
      take: 40,
      orderBy: { createdAt: "desc" },
      select: {
        chapterNum: true,
        title: true,
        content: true,
        novel: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            author: { select: { id: true, username: true, nickname: true } },
            _count: { select: { chapters: { where: { deletedAt: null } } } },
          },
        },
      },
    }),
  ]);

  type Result = {
    novelId: string;
    title: string;
    coverImage: string | null;
    author: { id: string; username: string; nickname: string | null };
    chapterCount: number;
    snippetHtml: string | null;
    matchedChapter: { num: number; title: string } | null;
  };

  const map = new Map<string, Result>();

  for (const n of byMeta) {
    map.set(n.id, {
      novelId: n.id,
      title: n.title,
      coverImage: n.coverImage,
      author: n.author,
      chapterCount: n._count.chapters,
      snippetHtml: n.description ? makeSnippet(n.description, q) : null,
      matchedChapter: null,
    });
  }

  for (const c of byContent) {
    if (map.has(c.novel.id) && map.get(c.novel.id)!.matchedChapter) continue;
    const snippet = makeSnippet(stripHtml(c.content), q);
    const existing = map.get(c.novel.id);
    if (existing) {
      existing.snippetHtml = snippet;
      existing.matchedChapter = { num: c.chapterNum, title: c.title };
    } else {
      map.set(c.novel.id, {
        novelId: c.novel.id,
        title: c.novel.title,
        coverImage: c.novel.coverImage,
        author: c.novel.author,
        chapterCount: c.novel._count.chapters,
        snippetHtml: snippet,
        matchedChapter: { num: c.chapterNum, title: c.title },
      });
    }
  }

  return NextResponse.json({ type, results: Array.from(map.values()) });
}

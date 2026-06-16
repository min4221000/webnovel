import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getViewerAdult } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 소설 등록
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await rateLimit(`novel:${user.id}`, 15, 60))) {
    return new NextResponse("소설 등록이 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  const description = (body?.description ?? "").toString().trim() || null;
  const coverImage = (body?.coverImage ?? "").toString().trim() || null;
  const isAdult = body?.isAdult === true;
  const tags: string[] = Array.isArray(body?.tags)
    ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 10)
    : [];

  if (!title) return new NextResponse("제목을 입력하세요.", { status: 400 });
  if (title.length > 120)
    return new NextResponse("제목은 120자 이하여야 합니다.", { status: 400 });

  const novel = await prisma.novel.create({
    data: { title, description, coverImage, isAdult, tags, authorId: user.id },
    select: { id: true },
  });

  return NextResponse.json({ id: novel.id });
}

// 소설 목록 (최신순)
export async function GET(req: NextRequest) {
  const take = Math.min(
    Number(req.nextUrl.searchParams.get("take")) || 20,
    50,
  );
  const adult = await getViewerAdult();
  const novels = await prisma.novel.findMany({
    where: { deletedAt: null, ...(adult ? {} : { isAdult: false }) },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      coverImage: true,
      createdAt: true,
      author: { select: { id: true, username: true } },
      _count: { select: { chapters: true } },
    },
  });
  return NextResponse.json({ novels });
}

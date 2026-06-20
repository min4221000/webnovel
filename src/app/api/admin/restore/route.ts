import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return authErrorResponse(e);
  }

  const [novels, chapters] = await Promise.all([
    prisma.novel.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        deletedAt: true,
        author: { select: { username: true, nickname: true } },
      },
    }),
    prisma.chapter.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        chapterNum: true,
        deletedAt: true,
        novel: { select: { id: true, title: true } },
      },
    }),
  ]);

  return NextResponse.json({ novels, chapters });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return authErrorResponse(e);
  }

  const body = await req.json().catch(() => null);
  const { type, id } = body ?? {};

  if (type === "novel" && typeof id === "string") {
    await prisma.novel.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (type === "chapter" && typeof id === "string") {
    await prisma.chapter.update({
      where: { id },
      data: { deletedAt: null },
    });
    return NextResponse.json({ ok: true });
  }

  return new NextResponse("type(novel|chapter)과 id 필요", { status: 400 });
}

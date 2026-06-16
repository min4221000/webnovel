import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_COMMENT_LEN = 2000;

// 댓글 목록 (비로그인 조회 가능)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const comments = await prisma.comment.findMany({
    where: { chapterId: params.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      parentId: true,
      createdAt: true,
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ comments });
}

// 댓글 작성 (로그인 필요)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    return authErrorResponse(e);
  }

  if (!(await rateLimit(`comment:${user.id}`, 5, 10))) {
    return new NextResponse("댓글이 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const chapter = await prisma.chapter.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });
  if (!chapter) return authErrorResponse(new Error("NOT_FOUND"));

  const body = await req.json().catch(() => null);
  const content = (body?.content ?? "").toString().trim();
  const parentId = body?.parentId ? String(body.parentId) : null;

  if (!content) return new NextResponse("내용을 입력하세요.", { status: 400 });
  if (content.length > MAX_COMMENT_LEN)
    return new NextResponse(`댓글은 ${MAX_COMMENT_LEN}자 이하여야 합니다.`, { status: 400 });

  // 답글이면 부모 댓글이 같은 회차에 존재하는지 확인
  if (parentId) {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, chapterId: params.id, deletedAt: null },
      select: { id: true },
    });
    if (!parent) return new NextResponse("원 댓글을 찾을 수 없습니다.", { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      chapterId: params.id,
      authorId: user.id,
      content,
      parentId,
    },
    select: {
      id: true,
      content: true,
      parentId: true,
      createdAt: true,
      author: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ comment });
}

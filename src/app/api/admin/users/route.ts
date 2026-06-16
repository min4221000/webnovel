import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return authErrorResponse(e);
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { nickname: { contains: q, mode: "insensitive" } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      nickname: true,
      discordId: true,
      banned: true,
      banReason: true,
      role: true,
      createdAt: true,
      _count: { select: { novels: true, comments: true } },
    },
  });

  return NextResponse.json({ users });
}

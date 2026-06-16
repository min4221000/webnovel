import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, nickname: true, avatarUrl: true },
  });
  return NextResponse.json(db);
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }
  const body = await req.json().catch(() => ({}));
  const raw = typeof body.nickname === "string" ? body.nickname.trim() : "";
  const nickname = raw.slice(0, 30) || null;
  await prisma.user.update({ where: { id: user.id }, data: { nickname } });
  return NextResponse.json({ ok: true, nickname });
}

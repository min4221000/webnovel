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
    select: { username: true, nickname: true, avatarUrl: true, webhookUrl: true },
  });
  return NextResponse.json(db);
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }
  const body = await req.json().catch(() => ({}));

  const data: { nickname?: string | null; webhookUrl?: string | null } = {};

  if (typeof body.nickname === "string") {
    data.nickname = body.nickname.trim().slice(0, 30) || null;
  }

  if (typeof body.webhookUrl === "string") {
    const w = body.webhookUrl.trim();
    if (w === "") {
      data.webhookUrl = null;
    } else if (/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/.test(w)) {
      data.webhookUrl = w;
    } else {
      return new NextResponse("올바른 Discord 웹후크 URL이 아닙니다.", { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { nickname: true, webhookUrl: true },
  });
  return NextResponse.json({ ok: true, ...updated });
}

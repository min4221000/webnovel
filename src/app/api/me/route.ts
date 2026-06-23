import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, nickname: true, avatarUrl: true, webhookUrl: true, adult: true, notifyNewNovels: true },
  });
  return NextResponse.json(db);
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }

  if (!(await rateLimit(`me:${user.id}`, 10, 60))) {
    return new NextResponse("요청이 너무 잦습니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  const body = await req.json().catch(() => ({}));

  const data: { nickname?: string | null; webhookUrl?: string | null; notifyNewNovels?: boolean } = {};

  if (typeof body.nickname === "string") {
    data.nickname = body.nickname.trim().slice(0, 30) || null;
  }

  if (typeof body.notifyNewNovels === "boolean") {
    data.notifyNewNovels = body.notifyNewNovels;
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
    select: { nickname: true, webhookUrl: true, notifyNewNovels: true },
  });
  return NextResponse.json({ ok: true, ...updated });
}

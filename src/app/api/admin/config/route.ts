import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { authErrorResponse } from "@/lib/apiError";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//;

export async function GET() {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }
  if (user.role !== "ADMIN") return authErrorResponse(new Error("FORBIDDEN"));

  const config = await prisma.siteConfig.findUnique({ where: { id: "main" } });
  return NextResponse.json({ globalWebhookUrl: config?.globalWebhookUrl ?? "" });
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); } catch (e) { return authErrorResponse(e); }
  if (user.role !== "ADMIN") return authErrorResponse(new Error("FORBIDDEN"));

  const body = await req.json().catch(() => null);
  const url = (body?.globalWebhookUrl ?? "").toString().trim();

  if (url && !WEBHOOK_RE.test(url)) {
    return new NextResponse("올바른 Discord 웹후크 URL이 아닙니다.", { status: 400 });
  }

  await prisma.siteConfig.upsert({
    where: { id: "main" },
    update: { globalWebhookUrl: url || null },
    create: { id: "main", globalWebhookUrl: url || null },
  });

  return NextResponse.json({ ok: true, globalWebhookUrl: url || null });
}

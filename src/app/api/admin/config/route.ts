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

  // 테스트 전송: 저장하지 않고 입력된 URL로 실제 메시지 1건 보내 Discord 응답을 그대로 반환
  if (body?.test === true) {
    if (!url) return new NextResponse("URL을 먼저 입력하세요.", { status: 400 });
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "✅ 전체 알림 웹후크 테스트입니다. 이 메시지가 보이면 정상 연결된 것입니다." }),
      });
      if (res.ok) return NextResponse.json({ ok: true });
      const detail = await res.text().catch(() => "");
      return new NextResponse(
        `Discord 응답 ${res.status}: ${detail || "(본문 없음)"}\n\n` +
          "※ thread_id를 쓴다면, 웹후크가 그 포럼 채널에 만들어져 있고 thread_id가 그 포럼 안의 포스트인지 확인하세요.",
        { status: 400 },
      );
    } catch (e) {
      return new NextResponse(`전송 실패: ${e instanceof Error ? e.message : "네트워크 오류"}`, { status: 400 });
    }
  }

  await prisma.siteConfig.upsert({
    where: { id: "main" },
    update: { globalWebhookUrl: url || null },
    create: { id: "main", globalWebhookUrl: url || null },
  });

  return NextResponse.json({ ok: true, globalWebhookUrl: url || null });
}

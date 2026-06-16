import { NextResponse } from "next/server";

/** requireUser 등에서 throw된 에러를 HTTP 응답으로 변환 */
export function authErrorResponse(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : "ERROR";
  if (msg === "BANNED")
    return new NextResponse("차단된 계정입니다.", { status: 403 });
  if (msg === "UNAUTHORIZED")
    return new NextResponse("로그인이 필요합니다.", { status: 401 });
  if (msg === "FORBIDDEN")
    return new NextResponse("권한이 없습니다.", { status: 403 });
  if (msg === "NOT_FOUND")
    return new NextResponse("대상을 찾을 수 없습니다.", { status: 404 });
  return new NextResponse("요청 처리 중 오류가 발생했습니다.", { status: 500 });
}

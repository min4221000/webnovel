import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 전체 비공개 모드: REQUIRE_GUILD_MEMBER=1 이면 로그인 없이 어떤 페이지도 접근 불가.
// 멤버 여부 검증은 로그인 시 signIn 콜백에서 처리 (비멤버는 로그인 자체가 거부됨).

// 로그인 없이 접근 허용할 경로
const PUBLIC_PATHS = ["/login", "/not-member"];

export async function middleware(req: NextRequest) {
  if (process.env.REQUIRE_GUILD_MEMBER !== "1") return NextResponse.next();

  const { pathname } = req.nextUrl;

  // 공개 경로는 통과
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (token) return NextResponse.next();

  // 미인증 → 로그인 페이지로 (원래 가려던 경로 보존)
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // 페이지만 검사: api(자체 인증)·정적 파일·next 내부 경로 제외
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};

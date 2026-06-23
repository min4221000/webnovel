import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// 두 가지 게이트:
// 1) MAINTENANCE_MODE=1 → ADMIN 외 모두 /maintenance 로 (배포/수리 시 사용)
// 2) REQUIRE_GUILD_MEMBER=1 → 미로그인 시 /login 으로 (서버 멤버 전용)

const PUBLIC_PATHS = ["/login", "/not-member"];
const MAINTENANCE_ALLOW = ["/maintenance", "/login", "/not-member"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const maintenance = process.env.MAINTENANCE_MODE === "1";
  const memberGate = process.env.REQUIRE_GUILD_MEMBER === "1";

  if (!maintenance && !memberGate) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 점검 모드: ADMIN 만 통과, 나머지는 /maintenance 로
  if (maintenance && token?.role !== "ADMIN") {
    if (MAINTENANCE_ALLOW.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    const url = req.nextUrl.clone();
    url.pathname = "/maintenance";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 멤버 게이트
  if (memberGate) {
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.next();
    }
    if (token) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // 페이지만 검사: api(자체 인증)·정적 파일·next 내부 경로 제외
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};

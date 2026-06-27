import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 서버 컴포넌트/route handler 에서 현재 세션 조회 */
export function getSession() {
  return getServerSession(authOptions);
}

/** 로그인 유저(없으면 null) */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * 현재 열람자가 성인(18+) 콘텐츠를 볼 수 있는지.
 * JWT는 토글 직후 값이 갱신 안 될 수 있어 DB에서 최신값을 읽는다.
 */
export async function getViewerAdult(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { adult: true },
  });
  return !!db?.adult;
}

/**
 * 로그인 필수 가드. 미로그인 시 throw.
 * JWT 전략이라 토큰의 banned는 로그인 시점 값 → DB에서 재확인해 차단을 즉시 반영.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { banned: true, role: true, adult: true },
  });
  if (!db || db.banned) throw new Error("BANNED");
  return { ...user, role: db.role, adult: db.adult };
}

/** 관리자 전용 가드 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!db || db.role !== "ADMIN") throw new Error("FORBIDDEN");
  return { ...user, role: db.role };
}

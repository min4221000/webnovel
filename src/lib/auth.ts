import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // guilds.members.read: 특정 서버 닉네임/프로필 가져오기 (DISCORD_GUILD_ID 설정 시 활성화)
          scope: "identify email guilds.members.read",
        },
      },
    }),
  ],
  // 로그인 유지: 90일간 세션 유지, 활동 시 매일 자동 갱신 (사실상 계속 로그인)
  // 차단/권한은 매 요청 requireUser()가 DB 재확인하므로 길어도 안전
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90, updateAge: 60 * 60 * 24 },
  jwt: { maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/login" },
  callbacks: {
    // 디코섭 멤버만 로그인 허용 (REQUIRE_GUILD_MEMBER=1 + DISCORD_GUILD_ID 설정 시)
    // DISCORD_GUILD_ID는 쉼표로 여러 개 지정 가능 (예: "id1,id2")
    async signIn({ account }) {
      const guildIds = (process.env.DISCORD_GUILD_ID ?? "").split(",").map(s => s.trim()).filter(Boolean);
      const gate = process.env.REQUIRE_GUILD_MEMBER === "1";
      if (!gate || guildIds.length === 0) return true;
      if (!account?.access_token) return false;
      // 404(명확한 비멤버)만 차단. 401/429/5xx/네트워크 오류는 일시적이므로 통과
      // (OAuth 동의 직후 토큰이 막 발급돼 멤버 API가 일시 실패하는 경우 오탐 방지)
      let definiteNonMember = true;
      for (const guildId of guildIds) {
        try {
          const r = await fetch(
            `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${account.access_token}` } },
          );
          if (r.ok) return true; // 하나라도 멤버면 통과
          if (r.status !== 404) definiteNonMember = false; // 일시적 오류
        } catch {
          definiteNonMember = false; // 네트워크 오류 → 일시적
        }
      }
      // 모든 길드에서 확실히 404(비멤버)일 때만 차단
      return definiteNonMember ? "/not-member" : true;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const p = profile as {
          id: string;
          username?: string;
          global_name?: string;
        };
        const discordId = p.id;
        const discordName =
          p.global_name || p.username || (token.name as string) || "user";
        const globalAvatarUrl = (token.picture as string | undefined) ?? null;
        // ADMIN_DISCORD_ID는 쉼표로 여러 명 지정 가능 (예: "id1,id2")
        const adminIds = (process.env.ADMIN_DISCORD_ID ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const isAdmin = adminIds.includes(discordId);

        // 서버 닉네임 + 서버 아바타(Nitro 한정) 가져오기 (DISCORD_GUILD_ID 설정 시; 쉼표 다중이면 첫 길드)
        let serverNick: string | null = null;
        let serverAvatarUrl: string | null = null;
        const guildId = (process.env.DISCORD_GUILD_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0];
        if (guildId && account.access_token) {
          try {
            const r = await fetch(
              `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
              { headers: { Authorization: `Bearer ${account.access_token}` } },
            );
            if (r.ok) {
              const m = await r.json();
              serverNick = (m.nick as string | null) || null;
              const avatarHash = m.avatar as string | null;
              if (avatarHash) {
                const ext = avatarHash.startsWith("a_") ? "gif" : "png";
                serverAvatarUrl = `https://cdn.discordapp.com/guilds/${guildId}/users/${discordId}/avatars/${avatarHash}.${ext}?size=128`;
              }
            }
          } catch { /* ignore */ }
        }

        const autoName = serverNick || discordName;
        // 서버 전용 아바타가 있으면 그것 사용, 없으면 글로벌 (Nitro 미사용/기본 아바타 시)
        const avatarUrl = serverAvatarUrl || globalAvatarUrl;

        const user = await prisma.user.upsert({
          where: { discordId },
          update: {
            username: autoName,
            avatarUrl,
            ...(isAdmin ? { role: "ADMIN" as const } : {}),
          },
          create: {
            discordId,
            username: autoName,
            avatarUrl,
            role: isAdmin ? "ADMIN" : "USER",
          },
        });

        token.uid = user.id;
        token.role = user.role;
        token.banned = user.banned;
        token.adult = user.adult;
        // 세션 name = 커스텀 닉 > 자동 이름
        token.name = user.nickname ?? autoName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
        session.user.banned = (token.banned as boolean) ?? false;
        session.user.adult = (token.adult as boolean) ?? false;
      }
      return session;
    },
  },
};

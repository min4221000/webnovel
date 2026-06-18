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
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    // 디코섭 멤버만 로그인 허용 (REQUIRE_GUILD_MEMBER=1 + DISCORD_GUILD_ID 설정 시)
    // DISCORD_GUILD_ID는 쉼표로 여러 개 지정 가능 (예: "id1,id2")
    async signIn({ account }) {
      const guildIds = (process.env.DISCORD_GUILD_ID ?? "").split(",").map(s => s.trim()).filter(Boolean);
      const gate = process.env.REQUIRE_GUILD_MEMBER === "1";
      if (!gate || guildIds.length === 0) return true;
      if (!account?.access_token) return false;
      try {
        for (const guildId of guildIds) {
          const r = await fetch(
            `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
            { headers: { Authorization: `Bearer ${account.access_token}` } },
          );
          if (r.ok) return true; // 하나라도 멤버면 통과
        }
        return "/not-member";
      } catch {
        return false;
      }
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
        const avatarUrl = (token.picture as string | undefined) ?? null;
        const isAdmin =
          !!process.env.ADMIN_DISCORD_ID &&
          process.env.ADMIN_DISCORD_ID === discordId;

        // 서버 닉네임 가져오기 (DISCORD_GUILD_ID 설정 시)
        let serverNick: string | null = null;
        const guildId = process.env.DISCORD_GUILD_ID;
        if (guildId && account.access_token) {
          try {
            const r = await fetch(
              `https://discord.com/api/v10/users/@me/guilds/${guildId}/member`,
              { headers: { Authorization: `Bearer ${account.access_token}` } },
            );
            if (r.ok) {
              const m = await r.json();
              serverNick = (m.nick as string | null) || null;
            }
          } catch { /* ignore */ }
        }

        const autoName = serverNick || discordName;

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

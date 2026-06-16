import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth 설정.
 * - 전략: JWT (Account/Session 테이블 불필요, User 스키마만으로 운영)
 * - 로그인 시 Discord profile.id(snowflake)로 User upsert
 * - ADMIN_DISCORD_ID 와 일치하면 ADMIN role 부여
 */
export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      // 최초 로그인 시에만 account+profile 존재 → User 동기화
      if (account && profile) {
        const p = profile as {
          id: string;
          username?: string;
          global_name?: string;
        };
        const discordId = p.id;
        const username =
          p.global_name || p.username || (token.name as string) || "user";
        const avatarUrl = (token.picture as string | undefined) ?? null;
        const isAdmin =
          !!process.env.ADMIN_DISCORD_ID &&
          process.env.ADMIN_DISCORD_ID === discordId;

        const user = await prisma.user.upsert({
          where: { discordId },
          update: {
            username,
            avatarUrl,
            ...(isAdmin ? { role: "ADMIN" as const } : {}),
          },
          create: {
            discordId,
            username,
            avatarUrl,
            role: isAdmin ? "ADMIN" : "USER",
          },
        });

        token.uid = user.id;
        token.role = user.role;
        token.banned = user.banned;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
        session.user.banned = (token.banned as boolean) ?? false;
      }
      return session;
    },
  },
};

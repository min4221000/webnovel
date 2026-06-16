# 웹소설 연재소

누구나 자유롭게 웹소설을 연재하는 **글쓰기 전용 커뮤니티**.
읽기는 로그인 불필요, 글쓰기·댓글은 Discord 로그인 필요.

## 스택
- Next.js 14 (App Router) + TypeScript + Tailwind CSS 3
- Prisma 5 + PostgreSQL
- NextAuth v4 (Discord OAuth, JWT 전략)

## 셋업

1. 의존성 설치
   ```bash
   npm install
   ```

2. 환경변수: `.env.example` 복사 → `.env` 채우기
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL`: Neon 또는 Supabase 무료 Postgres 연결 문자열
   - `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   - `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`: Discord Developer Portal > OAuth2
     - Redirect URI 등록: `http://localhost:3000/api/auth/callback/discord` (+ 배포 도메인)
   - `ADMIN_DISCORD_ID`: 본인 Discord 유저 ID(snowflake). 해당 ID로 로그인 시 자동 ADMIN.

3. DB 테이블 생성 (실 DB 연결 후)
   ```bash
   npx prisma migrate dev --name init
   ```

4. 개발 서버
   ```bash
   npm run dev
   ```
   http://localhost:3000

## 관리자
별도 시드 스크립트 없음 — `.env`의 `ADMIN_DISCORD_ID`와 일치하는 Discord 계정으로
로그인하면 `User.role`이 자동으로 `ADMIN`이 됩니다 (NextAuth jwt 콜백, `src/lib/auth.ts`).

# 재해복구 가이드 (Disaster Recovery)

> 사니양 웹소설 사이트 — 장애·데이터 유실 시 복구 매뉴얼
>
> 최종 수정: 2026-06-21

---

## 인프라 구성 요약

| 서비스 | 용도 | 플랜 |
|---|---|---|
| Vercel | Next.js 호스팅 + 서버리스 | Free |
| CockroachDB | PostgreSQL 호환 DB | Free (250M RU/월) |
| Cloudflare R2 | 이미지 저장소 | Free (10GB) |
| Upstash Redis | Rate limit | Free |
| GitHub Actions | 자동 백업 (DB 매일, R2 매주) | Free |

---

## 1. DB 복구 (글·댓글·유저 데이터 유실)

### 1-1. 백업 파일 위치

GitHub → 레포 → Actions 탭 → `Daily DB Backup` 워크플로  
→ 가장 최근 **성공(✅)** run 클릭 → 하단 Artifacts → `db-backup-*.json.gz` 다운로드

- 매일 새벽 2시 UTC (한국 오전 11시) 자동 실행
- 최대 24시간 분량 유실 가능
- 90일간 보관

### 1-2. 백업 파일 구조

```json
{
  "meta": {
    "exportedAt": "2026-06-21T02:00:00.000Z",
    "counts": {
      "users": 10,
      "novels": 5,
      "chapters": 30,
      "comments": 100,
      "bookmarks": 20,
      "uploads": 15,
      "reports": 3
    }
  },
  "users": [...],
  "novels": [...],
  "chapters": [...],
  "comments": [...],
  "bookmarks": [...],
  "uploads": [...],
  "reports": [...]
}
```

### 1-3. 복구 순서

```bash
# 1) 압축 해제
gunzip backup_20260621_020000.json.gz
```

```typescript
// 2) Node.js 스크립트 (프로젝트 루트에서 실행)
// 파일명: restore-db.ts (또는 .js)
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();
const dump = JSON.parse(fs.readFileSync("backup_20260621_020000.json", "utf8"));

async function restore() {
  // ⚠️ 반드시 이 순서대로 (외래키 의존성)
  console.log("1/7 Users...");
  await prisma.user.createMany({ data: dump.users, skipDuplicates: true });

  console.log("2/7 Novels...");
  await prisma.novel.createMany({ data: dump.novels, skipDuplicates: true });

  console.log("3/7 Chapters...");
  await prisma.chapter.createMany({ data: dump.chapters, skipDuplicates: true });

  console.log("4/7 Comments...");
  await prisma.comment.createMany({ data: dump.comments, skipDuplicates: true });

  console.log("5/7 Bookmarks...");
  await prisma.bookmark.createMany({ data: dump.bookmarks, skipDuplicates: true });

  console.log("6/7 Uploads...");
  await prisma.upload.createMany({ data: dump.uploads, skipDuplicates: true });

  console.log("7/7 Reports...");
  await prisma.report.createMany({ data: dump.reports, skipDuplicates: true });

  console.log("✅ 복구 완료");
  console.log("counts:", dump.meta.counts);
}

restore()
  .catch((e) => { console.error("❌ 복구 실패:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

```bash
# 3) 실행 (DATABASE_URL 환경변수 필요)
DATABASE_URL="postgresql://..." npx tsx restore-db.ts
```

### 1-4. 주의사항

- `skipDuplicates: true` → 이미 존재하는 행은 건너뜀 (부분 복구 안전)
- DateTime 필드는 JSON에서 문자열이지만 Prisma가 자동 변환
- **DB를 완전히 새로 만든 경우**: 먼저 `npx prisma db push` 로 스키마 생성 후 복구
- **CockroachDB 새 클러스터로 교체 시**: Vercel 환경변수 `DATABASE_URL` 도 변경 필요

---

## 2. 이미지 복구 (R2 버킷 유실)

### 2-1. 백업 파일 위치

GitHub → Actions 탭 → `Weekly R2 Image Backup`  
→ 성공 run → Artifacts → `r2-backup-*.tar.gz`

- 매주 일요일 03:00 UTC 자동 실행
- 60일간 보관
- 버킷 비어있으면 백업 건너뜀 (정상)

### 2-2. 복구 순서

```bash
# 1) 압축 해제
tar -xzf r2_backup_20260621.tar.gz -C ./r2dump

# 2) AWS CLI로 R2에 재업로드
# (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY 환경변수 설정 필요)
aws s3 sync ./r2dump s3://webnovel-uploads \
  --endpoint-url "https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"
```

### 2-3. R2 버킷 새로 만들어야 할 때

1. Cloudflare 대시보드 → R2 → Create bucket
2. 이름: `webnovel-uploads` (Vercel 환경변수와 일치시킬 것)
3. Settings → Public Access → **Enable**
4. Custom domain 또는 Public URL 복사 → Vercel `R2_PUBLIC_URL` 업데이트

---

## 3. 서버 장애 대응

### 3-1. 증상별 원인과 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 배포 후 전체 500 | 빌드/코드 에러 | Vercel → Deployments → 이전 성공 배포 `···` → **Promote to Production** |
| 모든 페이지 500, 로그에 DB 에러 | CockroachDB 장애 | CockroachDB 콘솔 확인. Managed라 대부분 자동복구. 장기면 새 클러스터+DB복구 |
| 특정 기능만 500 | 환경변수 누락/변경 | Vercel → Settings → Environment Variables 확인 → 수정 → **Redeploy** |
| 로그인 안 됨 | Discord OAuth 설정 문제 | Discord Developer Portal → Application → OAuth2 → Redirect URI 확인 |
| 이미지 안 보임 | R2 장애 또는 Public URL 변경 | R2 대시보드 확인, `R2_PUBLIC_URL` 환경변수 확인 |
| 사이트 접속 자체 불가 | 도메인 만료 / DNS | 도메인 등록기관 + Vercel Domains 설정 확인 |
| 느려짐 / 간헐적 타임아웃 | CockroachDB RU 소진 (월 250M) | 다음 달 자동 리셋. 캐싱+rate limit 이미 적용됨 |
| rate limit만 안 됨 | Upstash Redis 장애 | 자동 in-memory fallback 있음 → 사이트 정상 동작. Redis 콘솔 확인 |

### 3-2. Vercel 롤백 (30초)

```
Vercel 대시보드 → 프로젝트 → Deployments
→ 마지막 정상 배포 찾기 (✅ Ready)
→ 오른쪽 ··· 메뉴 → Promote to Production
```

**이게 제일 빠른 복구 수단.** 코드 문제의 99%는 이걸로 해결.

### 3-3. 환경변수 목록 (필수)

| 변수명 | 설명 | 어디서 얻나 |
|---|---|---|
| `DATABASE_URL` | CockroachDB 접속 URL | CockroachDB 콘솔 → Connect |
| `NEXTAUTH_SECRET` | 세션 암호화 키 | 임의 문자열 (변경 시 전원 로그아웃) |
| `NEXTAUTH_URL` | 사이트 URL | `https://your-domain.com` |
| `DISCORD_CLIENT_ID` | Discord OAuth | Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | Discord OAuth | Discord Developer Portal |
| `DISCORD_GUILD_ID` | 가입 허용 길드 (쉼표 구분 가능) | Discord 서버 ID |
| `R2_ACCOUNT_ID` | Cloudflare 계정 ID | Cloudflare 대시보드 URL에 포함 |
| `R2_BUCKET_NAME` | R2 버킷명 | `webnovel-uploads` |
| `R2_ACCESS_KEY_ID` | R2 API 키 | Cloudflare → R2 → API Tokens |
| `R2_SECRET_ACCESS_KEY` | R2 API 시크릿 | 위와 같음 (생성 시 1회만 표시) |
| `R2_PUBLIC_URL` | R2 퍼블릭 URL | R2 버킷 Settings → Public URL |
| `UPSTASH_REDIS_REST_URL` | Redis URL | Upstash 콘솔 |
| `UPSTASH_REDIS_REST_TOKEN` | Redis 토큰 | Upstash 콘솔 |
| `CRON_SECRET` | 크론 엔드포인트 인증 | 임의 문자열 (GitHub Secrets에도 동일값) |

### 3-4. GitHub Secrets 목록 (백업용)

| Secret | 용도 |
|---|---|
| `SITE_URL` | DB 백업 엔드포인트 호출용 |
| `CRON_SECRET` | DB 백업 인증 |
| `R2_ACCOUNT_ID` | R2 이미지 백업 |
| `R2_BUCKET_NAME` | R2 이미지 백업 |
| `R2_ACCESS_KEY_ID` | R2 이미지 백업 |
| `R2_SECRET_ACCESS_KEY` | R2 이미지 백업 |

---

## 4. 긴급 체크리스트

사이트 죽었을 때 순서대로:

```
□ 1. Vercel 마지막 성공 배포로 롤백              (30초)
□ 2. 그래도 500 → Environment Variables 점검     (1분)
□ 3. DB 접속 안 됨 → CockroachDB 콘솔 확인       (1분)
□ 4. DB 완전 유실 → 백업 JSON으로 복구            (10분~)
□ 5. 이미지 유실 → R2 백업 tar.gz로 복구          (5분~)
□ 6. 모든 인프라 교체 → 환경변수 전부 재설정       (30분~)
```

---

## 5. 수동 백업 실행

자동 스케줄 외에 수동으로도 가능:

```
GitHub → Actions → 워크플로 선택 → Run workflow 버튼
```

- `Daily DB Backup`: DB 즉시 백업
- `Weekly R2 Image Backup`: R2 이미지 즉시 백업

배포 전이나 큰 변경 전에 수동 백업 권장.

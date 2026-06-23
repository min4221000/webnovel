import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/ratelimit";
import { r2 } from "@/lib/r2";
import {
  ALLOWED_IMAGE_MIME,
  DAILY_UPLOAD_LIMIT,
  MAX_IMAGE_BYTES,
  MIME_TO_EXT,
} from "@/lib/constants";

export const runtime = "nodejs";

// 매직바이트 검사 (확장자/MIME 위조 방어)
const MAGIC: { mime: string; check: (b: Buffer) => boolean }[] = [
  { mime: "image/jpeg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", check: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    mime: "image/webp",
    check: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNAUTHORIZED";
    return new NextResponse(
      msg === "BANNED" ? "차단된 계정입니다." : "로그인이 필요합니다.",
      { status: msg === "BANNED" ? 403 : 401 },
    );
  }

  // 버스트 제한 (10초당 5장)
  if (!(await rateLimit(`upload:${user.id}`, 5, 10))) {
    return new NextResponse("업로드가 너무 빠릅니다. 잠시 후 다시 시도하세요.", { status: 429 });
  }

  // 일일 업로드 한도 (유저당 30장/일)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  // 어제 이전 레코드 삭제 (한도 추적 목적 외 불필요 → DB 용량 절약)
  void prisma.upload.deleteMany({ where: { userId: user.id, createdAt: { lt: startOfDay } } });
  const todayCount = await prisma.upload.count({
    where: { userId: user.id, createdAt: { gte: startOfDay } },
  });
  if (todayCount >= DAILY_UPLOAD_LIMIT) {
    return new NextResponse(
      `하루 업로드 한도(${DAILY_UPLOAD_LIMIT}장)를 초과했습니다.`,
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return new NextResponse("파일이 없습니다.", { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return new NextResponse("이미지가 5MB를 초과합니다.", { status: 413 });
  }
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(file.type)) {
    return new NextResponse("허용되지 않은 이미지 형식입니다.", { status: 415 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const magic = MAGIC.find((m) => m.check(buf));
  if (!magic || magic.mime !== file.type) {
    return new NextResponse("파일 내용이 형식과 일치하지 않습니다.", { status: 415 });
  }

  const ext = MIME_TO_EXT[file.type];
  const key = `uploads/${randomUUID()}.${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buf,
      ContentType: file.type,
    }),
  );

  const url = `${process.env.R2_PUBLIC_URL}/${key}`;
  await prisma.upload.create({ data: { userId: user.id, url } });

  return NextResponse.json({ url });
}

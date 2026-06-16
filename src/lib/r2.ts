import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

/** HTML에서 R2 오브젝트 키 추출 */
export function extractR2Keys(html: string): string[] {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) return [];
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}/(uploads/[^"'\\s<>]+)`, "g");
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) keys.push(m[1]);
  return Array.from(new Set(keys));
}

/** R2에서 오브젝트 삭제 (최대 1000개) */
export async function deleteR2Keys(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const Bucket = process.env.R2_BUCKET_NAME!;
  if (keys.length === 1) {
    await r2.send(new DeleteObjectCommand({ Bucket, Key: keys[0] }));
  } else {
    await r2.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }
}

/** 구 콘텐츠 → 신 콘텐츠로 바뀔 때 사라진 이미지 키 반환 */
export function removedKeys(oldHtml: string, newHtml: string): string[] {
  const oldKeys = extractR2Keys(oldHtml);
  const newSet = new Set(extractR2Keys(newHtml));
  return oldKeys.filter((k) => !newSet.has(k));
}

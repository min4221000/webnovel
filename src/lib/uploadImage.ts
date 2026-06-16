import imageCompression from "browser-image-compression";
import { MAX_IMAGE_BYTES } from "./constants";

/**
 * 클라이언트: 이미지 압축(webp/1920px/q80) 후 /api/upload 로 전송 → URL 반환.
 */
export async function compressAndUpload(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("이미지가 5MB를 초과합니다.");
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
  });

  const baseName = (file.name.replace(/\.[^.]+$/, "") || "image").slice(0, 40);
  const form = new FormData();
  form.append("file", compressed, `${baseName}.webp`);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `업로드 실패 (${res.status})`);
  }
  const data = (await res.json()) as { url: string };
  return data.url;
}

import imageCompression from "browser-image-compression";
import { apiFetch } from "./apiFetch";

/**
 * 클라이언트: 이미지 압축(webp/1920px/q80) 후 /api/upload 로 전송 → URL 반환.
 */
const MAX_CLIENT_INPUT = 15 * 1024 * 1024; // 15MB 원본 상한

export async function compressAndUpload(file: File): Promise<string> {
  if (file.size > MAX_CLIENT_INPUT) {
    throw new Error("이미지가 15MB를 초과합니다.");
  }
  if (file.type === "image/gif") {
    throw new Error("GIF는 지원하지 않습니다. (JPG/PNG/WebP만 가능)");
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
  });

  const baseName = (file.name.replace(/\.[^.]+$/, "") || "image").slice(0, 40);
  const form = new FormData();
  form.append("file", compressed, `${baseName}.webp`);

  // 이미지 업로드는 용량 커 시간 더 줌 (40초)
  const res = await apiFetch("/api/upload", { method: "POST", body: form, timeout: 40_000 });
  const data = (await res.json()) as { url: string };
  return data.url;
}

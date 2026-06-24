// 공유 상수 (서버/클라 공용 — node 전용 import 금지)

export const MAX_CHARS = 100_000;
export const MAX_IMAGES_PER_CHAPTER = 1;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB (압축 후 안전망)
export const DAILY_UPLOAD_LIMIT = 30;

// GIF 제외: 클라 압축이 webp로 강제 변환 → 애니메이션 정지됨. 혼란 방지 위해 차단.
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// iframe 임베드 허용 호스트 (유튜브만)
export const YOUTUBE_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
];

export const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "(맑은 고딕)", value: "" },
  { label: "맑은 고딕", value: "'Malgun Gothic', sans-serif" },
  { label: "바탕(명조)", value: "Batang, '바탕', serif" },
  { label: "굴림", value: "Gulim, '굴림', sans-serif" },
  { label: "돋움", value: "Dotum, '돋움', sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Courier", value: "'Courier New', monospace" },
];

export const FONT_SIZES = ["10", "12", "14", "16", "18", "20", "24", "28", "32", "36"];

// 이미지 크기 프리셋 (선택된 이미지 width)
export const IMAGE_SIZE_PRESETS: { label: string; value: string | null }[] = [
  { label: "소", value: "30%" },
  { label: "중", value: "60%" },
  { label: "대", value: "100%" },
  { label: "원본", value: null },
];

// 가이드 스크린샷 압축기.
// public/guide/_raw/ 에 원본(png/jpg/jpeg/webp)을 넣고 `npm run guide:img` 실행하면
// 가로 1200px 이하 · WebP(품질 82)로 압축해 public/guide/<이름>.webp 로 저장한다.
// 가이드 페이지가 참조하는 이름(login.webp 등)과 맞춰서 원본 파일명을 지으면 된다.
//   예) public/guide/_raw/login.png  →  public/guide/login.webp
import sharp from "sharp";
import { readdir, mkdir, stat } from "node:fs/promises";
import { join, parse } from "node:path";

const RAW_DIR = join("public", "guide", "_raw");
const OUT_DIR = join("public", "guide");
const MAX_WIDTH = 1200;
const QUALITY = 82;

const kb = (n) => `${(n / 1024).toFixed(0)}KB`;

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  let files;
  try {
    files = await readdir(RAW_DIR);
  } catch {
    console.log(`'${RAW_DIR}' 폴더가 없습니다. 원본 스크린샷을 넣어주세요.`);
    return;
  }
  const targets = files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  if (targets.length === 0) {
    console.log(`'${RAW_DIR}' 에 변환할 이미지가 없습니다. (png/jpg/webp)`);
    return;
  }
  for (const file of targets) {
    const src = join(RAW_DIR, file);
    const out = join(OUT_DIR, `${parse(file).name}.webp`);
    const before = (await stat(src)).size;
    await sharp(src)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
    const after = (await stat(out)).size;
    console.log(`✓ ${file}  ${kb(before)} → ${kb(after)}  (${out})`);
  }
  console.log(`\n완료: ${targets.length}개. public/guide/_raw 는 커밋하지 않아도 됩니다.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

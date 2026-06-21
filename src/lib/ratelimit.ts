import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter.
 * - UPSTASH_REDIS_REST_* 환경변수 있으면 분산 sliding-window (운영 권장)
 * - 없으면 in-memory 폴백 (개발/단일 인스턴스 best-effort; 서버리스에선 불완전)
 */
// 따옴표/공백 제거 (환경변수에 실수로 따옴표 포함돼도 안전)
function clean(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}

const UPSTASH_URL = clean(process.env.UPSTASH_REDIS_REST_URL);
const UPSTASH_TOKEN = clean(process.env.UPSTASH_REDIS_REST_TOKEN);
const hasUpstash = /^https?:\/\//.test(UPSTASH_URL) && !!UPSTASH_TOKEN;

// lazy init: 빌드 타임에 생성자가 터지지 않도록 첫 호출 시점에 생성
let _redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  if (!hasUpstash) {
    _redis = null;
    return _redis;
  }
  try {
    _redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
  } catch {
    _redis = null;
  }
  return _redis;
}

const limiters = new Map<string, Ratelimit>();

const memo = new Map<string, number[]>();
function memLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (memo.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    memo.set(key, arr);
    return false;
  }
  arr.push(now);
  memo.set(key, arr);
  return true;
}

/** true = 허용, false = 한도 초과 */
export async function rateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const id = `${max}:${windowSec}`;
    let rl = limiters.get(id);
    if (!rl) {
      rl = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${windowSec} s` as Duration),
        prefix: "wn",
      });
      limiters.set(id, rl);
    }
    const { success } = await rl.limit(key);
    return success;
  }
  return memLimit(key, max, windowSec * 1000);
}

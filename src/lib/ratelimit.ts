import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiter.
 * - UPSTASH_REDIS_REST_* 환경변수 있으면 분산 sliding-window (운영 권장)
 * - 없으면 in-memory 폴백 (개발/단일 인스턴스 best-effort; 서버리스에선 불완전)
 */
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

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

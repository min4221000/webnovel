// 공통 fetch 래퍼: 타임아웃 + 네트워크/서버 장애 구분 + 기술적 에러 격리
//
// 던지는 Error.message는 항상 사용자에게 보여줄 수 있는 한글 문구.
// - 네트워크 단절(지하철 등): "인터넷 연결이 불안정합니다…"
// - 응답 지연(타임아웃): "응답이 지연되고 있습니다…"
// - 서버 오류(5xx/raw): "일시적인 서버 오류입니다…"  (영문 stack 노출 차단)
// - 그 외 4xx: 서버가 보낸 한글 안내문 그대로

const DEFAULT_TIMEOUT = 20_000; // 20초

// 화면에 띄우면 안 되는 기술적 응답인지 판별 (영문 stack/HTML 등)
function isTechnicalMessage(s: string): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length > 300) return true; // 보통 HTML 덤프
  if (/^<|<!doctype|<html/i.test(t)) return true; // HTML 페이지
  if (/internal server error|application error|server-side exception|stack|at\s+\w+\s+\(/i.test(t)) return true;
  // 한글이 하나도 없는 긴 영문 = 기술적일 가능성
  if (t.length > 60 && !/[가-힣]/.test(t)) return true;
  return false;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {},
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...rest } = init;

  // 명백한 오프라인: 즉시 안내 (요청 자체를 안 보냄)
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error("인터넷 연결이 끊겼습니다. 연결 상태를 확인해 주세요.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res: Response;
  try {
    res = await fetch(input, { ...rest, signal: controller.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("응답이 지연되고 있습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.");
    }
    // TypeError "Failed to fetch" 등 = 네트워크 단절/서버 도달 불가
    throw new Error("서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status >= 500) {
      throw new Error("일시적인 서버 오류입니다. 잠시 후 다시 시도해 주세요.");
    }
    // 4xx: 서버 한글 안내문 사용, 기술적이면 일반 문구로 대체
    throw new Error(isTechnicalMessage(body) ? "요청을 처리하지 못했습니다." : body);
  }

  return res;
}

import Link from "next/link";
import { getCurrentUser, getViewerAdult } from "@/lib/session";
import AdultToggle from "@/components/AdultToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "🔞시크릿 플러스 설정 — 사니양 연구 보고서 열람실" };

export default async function AdultPage() {
  const user = await getCurrentUser();
  const adult = await getViewerAdult();

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">🔞시크릿 플러스 설정</h1>

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm space-y-2">
        <p>
          🔞시크릿 플러스 작품은 기본적으로 <strong>숨겨져</strong> 있습니다.
          만 19세 이상이며 열람에 동의하는 경우에만 아래에서 켜 주세요.
        </p>
        <p className="text-xs text-gray-500">
          ※ 본 설정은 <strong>본인 자가인증(셀프 체크)</strong> 방식입니다. 허위 인증 시 제재될 수 있습니다.
        </p>
      </div>

      {user ? (
        <AdultToggle initial={adult} />
      ) : (
        <p className="text-sm text-gray-500">
          설정하려면 먼저 Discord 로그인이 필요합니다.{" "}
          <Link href="/" className="underline">
            홈으로
          </Link>
        </p>
      )}

      <div className="text-sm text-gray-500 border-t pt-4">
        🔞시크릿 플러스 작품을 올리려면 글쓰기 시 <strong>&ldquo;🔞시크릿 플러스 작품&rdquo;</strong>에 체크하세요.
        체크된 작품은 시크릿 플러스를 켠 이용자에게만 노출됩니다.
      </div>
    </div>
  );
}

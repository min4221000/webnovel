import Link from "next/link";

export const dynamic = "force-static";

export default function MaintenancePage() {
  return (
    <div className="max-w-sm mx-auto mt-24 text-center space-y-5">
      <div className="text-5xl">🛠</div>
      <h1 className="text-xl font-bold">사이트 점검 중</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        지금은 사이트를 정비하고 있습니다.
        <br />
        잠시 후 다시 방문해 주세요.
      </p>
      <Link
        href="/login"
        className="inline-block text-xs text-gray-400 hover:text-indigo-500 underline"
      >
        관리자 로그인
      </Link>
    </div>
  );
}

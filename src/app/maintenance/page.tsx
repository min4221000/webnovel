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
      <p className="text-xs text-gray-400">
        관리자는 이 페이지 너머도 그대로 이용할 수 있습니다.
      </p>
    </div>
  );
}

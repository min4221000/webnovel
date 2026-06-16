import Link from "next/link";

export default function NotMemberPage() {
  return (
    <div className="max-w-md mx-auto mt-16 text-center space-y-4">
      <div className="text-5xl">🔒</div>
      <h1 className="text-xl font-bold">접근 권한이 없습니다</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        이 사이트는 지정된 Discord 서버 멤버만 이용할 수 있습니다.
        <br />
        서버에 먼저 가입한 뒤 다시 로그인해 주세요.
      </p>
      <Link
        href="/"
        className="inline-block text-sm text-indigo-500 underline mt-2"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}

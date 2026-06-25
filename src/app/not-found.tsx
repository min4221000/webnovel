import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-sm mx-auto mt-24 text-center space-y-5">
      <div className="text-5xl">🔍</div>
      <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        주소가 잘못되었거나, 삭제된 글일 수 있습니다.
      </p>
      <Link
        href="/"
        className="inline-block text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-500"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}

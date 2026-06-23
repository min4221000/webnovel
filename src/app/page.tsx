import Link from "next/link";
import { getViewerAdult, getCurrentUser } from "@/lib/session";
import { listNovels } from "@/lib/queries";
import { displayName } from "@/lib/displayName";
import StatusBadge from "@/components/StatusBadge";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Home({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const [adult, user] = await Promise.all([getViewerAdult(), getCurrentUser()]);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const { novels, total } = await listNovels(adult, page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 로그인 시: 내 비밀글(비공개 소설 + 공개 소설의 비공개 회차) — 메인에 펼침
  const myDrafts = user ? await prisma.novel.findMany({
    where: {
      authorId: user.id,
      deletedAt: null,
      OR: [
        { hidden: true },
        { chapters: { some: { hidden: true, deletedAt: null } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      hidden: true,
      isAdult: true,
      updatedAt: true,
      chapters: {
        where: { deletedAt: null, hidden: true },
        orderBy: { chapterNum: "asc" },
        select: { id: true, chapterNum: true, title: true },
      },
    },
  }) : [];

  return (
    <div className="space-y-6">
      {/* 미로그인: 검색 + 로그인 — 탑바 대신 여기에 표시 */}
      {!user && (
        <div className="flex items-center gap-3 justify-end">
          <Link href="/search" className="text-sm text-gray-500 hover:underline">검색</Link>
          <Link
            href="/login"
            className="text-sm px-3 py-1.5 rounded-md bg-[#5865F2] text-white hover:bg-[#4752c4]"
          >
            로그인
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm">
        📢 <strong>본 사이트는 글쓰기(웹소설 연재) 전용 커뮤니티입니다.</strong>{" "}
        잡담·홍보·분쟁성 글은 제재 대상입니다.{" "}
        <Link href="/rules" className="underline font-medium">
          이용규정 보기
        </Link>{" "}
        ·{" "}
        <Link href="/adult" className="underline font-medium">
          {adult ? "🔞 시크릿 플러스 ON" : "🔞 시크릿 플러스 설정"}
        </Link>
      </div>

      {/* 내 비밀글 — 로그인 + 비공개 소설/회차 있을 때만 */}
      {user && myDrafts.length > 0 && (
        <section className="border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/10 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">📝 내 비밀글</h2>
            <Link href="/drafts" className="text-xs text-gray-500 hover:underline">전체 보기 →</Link>
          </div>
          <ul className="space-y-2">
            {myDrafts.map((n) => (
              <li key={n.id} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/novel/${n.id}`} className="font-medium hover:underline truncate">
                    {n.hidden && <span className="text-amber-600 text-xs mr-1">[비공개]</span>}
                    {n.isAdult && <span className="text-red-500 text-xs mr-1">[🔞]</span>}
                    {n.title}
                  </Link>
                  <div className="flex gap-2 shrink-0 text-xs">
                    <Link href={`/write/${n.id}/edit`} className="text-gray-500 hover:text-indigo-500">정보 수정</Link>
                    <Link href={`/write/${n.id}/chapter/new`} className="text-indigo-600 hover:underline">+ 회차</Link>
                  </div>
                </div>
                {n.chapters.length > 0 && (
                  <ul className="pl-3 mt-1 text-xs space-y-0.5">
                    {n.chapters.slice(0, 3).map((c) => (
                      <li key={c.id} className="flex items-center justify-between">
                        <span className="text-gray-400 truncate">└ {c.chapterNum}화 {c.title}</span>
                        <Link
                          href={`/write/${n.id}/chapter/${c.id}/edit`}
                          className="text-gray-400 hover:text-indigo-500 shrink-0 ml-2"
                        >
                          수정
                        </Link>
                      </li>
                    ))}
                    {n.chapters.length > 3 && (
                      <li className="text-gray-400 pl-2">… 외 {n.chapters.length - 3}개</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h1 className="text-2xl font-bold mb-1">최신 연재</h1>
        <p className="text-sm text-gray-500 mb-4">
          누구나 로그인 없이 읽을 수 있습니다. 글쓰기·댓글은 Discord 로그인이 필요합니다.
        </p>

        {novels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
            아직 등록된 연재가 없습니다. 첫 작품을 올려보세요!
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {novels.map((n) => (
              <li
                key={n.id}
                className="border rounded-lg p-3 hover:border-indigo-400 transition-colors"
              >
                <Link href={`/novel/${n.id}`} className="flex gap-3">
                  {n.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.coverImage}
                      alt=""
                      className="w-16 h-20 object-cover rounded shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-20 rounded bg-black/5 dark:bg-white/10 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h2 className="font-semibold truncate">
                      {n.isAdult && <span className="text-red-500 mr-1">[🔞]</span>}
                      {n.title}
                      {n.status !== "ongoing" && <StatusBadge status={n.status} />}
                    </h2>
                    <p className="text-xs text-gray-500 truncate">
                      {displayName(n.author)} · {n._count.chapters}화
                    </p>
                    {n.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                        {n.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="flex justify-center gap-2 pt-4">
            {page > 1 && (
              <Link
                href={`/?page=${page - 1}`}
                className="px-3 py-1 rounded border text-sm hover:border-indigo-400"
              >
                ← 이전
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/?page=${p}`}
                className={`px-3 py-1 rounded border text-sm ${
                  p === page
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "hover:border-indigo-400"
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={`/?page=${page + 1}`}
                className="px-3 py-1 rounded border text-sm hover:border-indigo-400"
              >
                다음 →
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

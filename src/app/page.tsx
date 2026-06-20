import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerAdult } from "@/lib/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function Home({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const adult = await getViewerAdult();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const where = { deletedAt: null, hidden: false, ...(adult ? {} : { isAdult: false }) } as const;

  const [novels, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        tags: true,
        isAdult: true,
        author: { select: { id: true, username: true } },
        _count: { select: { chapters: { where: { deletedAt: null } } } },
      },
    }),
    prisma.novel.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
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
                    </h2>
                    <p className="text-xs text-gray-500 truncate">
                      {n.author.username} · {n._count.chapters}화
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

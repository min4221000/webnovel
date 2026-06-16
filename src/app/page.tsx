import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerAdult } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const adult = await getViewerAdult();
  const novels = await prisma.novel.findMany({
    where: { deletedAt: null, ...(adult ? {} : { isAdult: false }) },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      tags: true,
      isAdult: true,
      author: { select: { id: true, username: true } },
      _count: { select: { chapters: true } },
    },
  });

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
          {adult ? "🔞 18+ 열람 ON" : "🔞 18+ 설정"}
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
                      {n.isAdult && <span className="text-red-500 mr-1">[18+]</span>}
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
      </section>
    </div>
  );
}

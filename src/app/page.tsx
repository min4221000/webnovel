import Link from "next/link";
import { getViewerAdult, getCurrentUser } from "@/lib/session";
import { listNovels } from "@/lib/queries";
import { displayName } from "@/lib/displayName";
import { coverGradientFor } from "@/lib/coverGradient";
import StatusBadge from "@/components/StatusBadge";

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

  return (
    <div className="space-y-7">
      {/* 미로그인: 검색 + 로그인 */}
      {!user && (
        <div className="flex items-center gap-3 justify-end">
          <Link href="/search" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">검색</Link>
          <Link
            href="/login"
            className="text-sm font-semibold px-3.5 py-2 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752c4] active:scale-95 transition"
          >
            로그인
          </Link>
        </div>
      )}

      {/* 공지 + 시크릿 플러스 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-400/90 text-white text-xs font-bold">!</span>
          <p className="text-[13px] leading-relaxed text-amber-900">
            본 사이트는 <strong className="font-semibold">글쓰기(웹소설 연재) 전용</strong> 커뮤니티입니다.
            잡담·홍보·분쟁성 글은 제재 대상입니다.{" "}
            <Link href="/rules" className="font-semibold underline decoration-amber-400 underline-offset-2 hover:text-amber-700">
              이용규정 보기
            </Link>
          </p>
        </div>
        <Link
          href="/adult"
          className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
        >
          시크릿 플러스{" "}
          <span className="ml-0.5 inline-flex items-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
            {adult ? "ON" : "OFF"}
          </span>
        </Link>
      </div>

      {/* 섹션 헤더 */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              최신 연재
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-600">
                {total}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              누구나 로그인 없이 읽을 수 있습니다. 글쓰기·댓글은 Discord 로그인이 필요합니다.
            </p>
          </div>
        </div>

        {novels.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm">
            아직 등록된 연재가 없습니다. 첫 작품을 올려보세요!
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {novels.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/novel/${n.id}`}
                  className="group flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card hover:shadow-cardHover hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
                >
                  {/* 커버 */}
                  {n.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.coverImage}
                      alt=""
                      className="w-[72px] h-[96px] object-cover rounded-lg shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className={`${coverGradientFor(n.title)} relative w-[72px] h-[96px] shrink-0 rounded-lg overflow-hidden grid place-items-center shadow-sm`}>
                      <span className="text-white/95 text-3xl font-black drop-shadow">
                        {n.title.charAt(0)}
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-start gap-2">
                      <h2 className="font-bold text-[15px] leading-snug text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2">
                        {n.isAdult && <span className="text-rose-500 mr-1">[SP]</span>}
                        {n.title}
                      </h2>
                      {n.status !== "ongoing" && <StatusBadge status={n.status} />}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                      <span>{displayName(n.author)}</span>
                      <span className="text-slate-300">·</span>
                      <span>{n._count.chapters}화</span>
                    </p>
                    {n.description && (
                      <p className="mt-2 text-[13px] leading-relaxed text-slate-400 line-clamp-2">
                        {n.description}
                      </p>
                    )}
                    {n.tags && n.tags.length > 0 && (
                      <div className="mt-auto pt-3 flex flex-wrap items-center gap-1.5">
                        {n.tags.slice(0, 4).map((tag: string) => (
                          <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <nav className="flex justify-center gap-1.5 pt-6">
            {page > 1 && (
              <Link
                href={`/?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                ← 이전
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/?page=${p}`}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20"
                    : "border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {p}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={`/?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
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

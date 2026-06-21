import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

// 소설 목록/카운트는 변경 빈도 낮음 → 데이터 캐시.
// 키: adult 여부 + 페이지 (변형 2종 × 페이지수만). 글 변경 시 revalidateTag로 즉시 무효화.
// force-dynamic 페이지에서도 unstable_cache(데이터 캐시)는 동작 → DB RU 폭주 방지.
export const NOVELS_TAG = "novels";

export function listNovels(adult: boolean, page: number, pageSize: number) {
  return unstable_cache(
    async () => {
      const where = { deletedAt: null, hidden: false, ...(adult ? {} : { isAdult: false }) };
      const [novels, total] = await Promise.all([
        prisma.novel.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            title: true,
            description: true,
            coverImage: true,
            tags: true,
            isAdult: true,
            status: true,
            author: { select: { id: true, username: true, nickname: true } },
            _count: { select: { chapters: { where: { deletedAt: null, hidden: false } } } },
          },
        }),
        prisma.novel.count({ where }),
      ]);
      return { novels, total };
    },
    ["list-novels", adult ? "a1" : "a0", String(page), String(pageSize)],
    { tags: [NOVELS_TAG], revalidate: 60 },
  )();
}

/** 글/회차 변경 시 호출 → 목록 캐시 즉시 무효화 (다음 요청에 반영) */
export function invalidateNovels() {
  revalidateTag(NOVELS_TAG);
}

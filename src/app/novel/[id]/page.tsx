import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function NovelPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const novel = await prisma.novel.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      tags: true,
      author: { select: { id: true, username: true } },
      chapters: {
        where: { deletedAt: null },
        orderBy: { chapterNum: "asc" },
        select: { id: true, chapterNum: true, title: true, createdAt: true },
      },
    },
  });

  if (!novel) notFound();

  const isOwner = !!user && (user.id === novel.author.id || user.role === "ADMIN");

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {novel.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={novel.coverImage}
            alt=""
            className="w-28 h-36 object-cover rounded border shrink-0"
          />
        ) : (
          <div className="w-28 h-36 rounded bg-black/5 dark:bg-white/10 shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{novel.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            글쓴이{" "}
            <Link href={`/author/${novel.author.id}`} className="underline">
              {novel.author.username}
            </Link>{" "}
            · {novel.chapters.length}화
          </p>
          {novel.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {novel.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          {novel.description && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 whitespace-pre-wrap">
              {novel.description}
            </p>
          )}

          {isOwner && (
            <div className="flex items-center gap-3 mt-3">
              <Link
                href={`/write/${novel.id}/chapter/new`}
                className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white"
              >
                + 새 회차
              </Link>
              <Link href={`/write/${novel.id}/edit`} className="text-sm underline">
                정보 수정
              </Link>
              <DeleteButton
                url={`/api/novels/${novel.id}`}
                redirectTo="/"
                label="소설 삭제"
                confirmMsg="이 소설을 삭제할까요? (복구 가능한 소프트 삭제)"
                className="text-sm text-gray-400 hover:text-red-500"
              />
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-semibold mb-2">회차 목록</h2>
        {novel.chapters.length === 0 ? (
          <p className="text-sm text-gray-400">아직 등록된 회차가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10 border rounded-lg">
            {novel.chapters.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Link
                  href={`/novel/${novel.id}/chapter/${c.chapterNum}`}
                  className="flex-1 min-w-0 flex items-center justify-between"
                >
                  <span className="truncate">
                    <span className="text-gray-400 mr-2">{c.chapterNum}화</span>
                    {c.title}
                  </span>
                  <span className="text-xs text-gray-400 ml-2 shrink-0">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </Link>
                {isOwner && (
                  <span className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/write/${novel.id}/chapter/${c.id}/edit`}
                      className="text-xs text-gray-400 hover:text-indigo-500"
                    >
                      수정
                    </Link>
                    <DeleteButton
                      url={`/api/chapters/${c.id}`}
                      confirmMsg="이 회차를 삭제할까요?"
                      label="삭제"
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

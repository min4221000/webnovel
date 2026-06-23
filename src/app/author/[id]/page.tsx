import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getViewerAdult, getCurrentUser } from "@/lib/session";
import { displayName } from "@/lib/displayName";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default async function AuthorPage({
  params,
}: {
  params: { id: string };
}) {
  const adult = await getViewerAdult();
  const viewer = await getCurrentUser();
  // 내가 이 작가를 팔로우 중인지 (본인 페이지면 버튼 숨김)
  const isSelf = viewer?.id === params.id;
  const following = viewer && !isSelf
    ? !!(await prisma.follow.findUnique({
        where: { followerId_authorId: { followerId: viewer.id, authorId: params.id } },
        select: { id: true },
      }))
    : false;
  const author = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      username: true,
      nickname: true,
      avatarUrl: true,
      novels: {
        where: { deletedAt: null, hidden: false, ...(adult ? {} : { isAdult: false }) },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          coverImage: true,
          isAdult: true,
          _count: { select: { chapters: { where: { deletedAt: null, hidden: false } } } },
        },
      },
    },
  });

  if (!author) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {author.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={author.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
        )}
        <div>
          <h1 className="text-2xl font-bold">{displayName(author)}</h1>
          <p className="text-sm text-gray-500">{author.novels.length}개 작품</p>
        </div>
        {viewer && !isSelf && (
          <div className="ml-auto">
            <FollowButton authorId={params.id} initialFollowing={following} />
          </div>
        )}
      </div>

      {author.novels.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 작품이 없습니다.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {author.novels.map((n) => (
            <li key={n.id} className="border rounded-lg p-3 hover:border-indigo-400">
              <Link href={`/novel/${n.id}`} className="flex gap-3">
                {n.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.coverImage} alt="" className="w-14 h-18 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-14 h-[72px] rounded bg-black/5 dark:bg-white/10 shrink-0" />
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold truncate">
                    {n.isAdult && <span className="text-red-500 mr-1">[🔞]</span>}
                    {n.title}
                  </h2>
                  <p className="text-xs text-gray-500">{n._count.chapters}화</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

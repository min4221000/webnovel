import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import NovelForm from "@/components/NovelForm";

export const dynamic = "force-dynamic";

export default async function EditNovelPage({
  params,
}: {
  params: { novelId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const novel = await prisma.novel.findFirst({
    where: { id: params.novelId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      coverImage: true,
      isAdult: true,
      hidden: true,
      status: true,
      authorId: true,
    },
  });
  if (!novel) notFound();
  if (novel.authorId !== user.id && user.role !== "ADMIN") redirect(`/novel/${novel.id}`);

  return (
    <NovelForm
      novelId={novel.id}
      initial={{
        title: novel.title,
        description: novel.description ?? "",
        tags: novel.tags.join(", "),
        coverImage: novel.coverImage,
        isAdult: novel.isAdult,
        hidden: novel.hidden,
        status: novel.status,
      }}
    />
  );
}

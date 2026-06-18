import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import ChapterForm from "@/components/ChapterForm";

export const dynamic = "force-dynamic";

export default async function EditChapterPage({
  params,
}: {
  params: { novelId: string; chapterId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const chapter = await prisma.chapter.findFirst({
    where: { id: params.chapterId, deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      chapterNum: true,
      hidden: true,
      novel: { select: { id: true, authorId: true } },
    },
  });
  if (!chapter || chapter.novel.id !== params.novelId) notFound();
  if (chapter.novel.authorId !== user.id && user.role !== "ADMIN")
    redirect(`/novel/${params.novelId}/chapter/${chapter.chapterNum}`);

  return (
    <ChapterForm
      novelId={params.novelId}
      chapterId={chapter.id}
      redirectNum={chapter.chapterNum}
      initialTitle={chapter.title}
      initialContent={chapter.content}
      initialHidden={chapter.hidden}
    />
  );
}

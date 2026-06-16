import ChapterForm from "@/components/ChapterForm";

export const metadata = { title: "회차 작성 — 웹소설 연재소" };

export default function NewChapterPage({
  params,
}: {
  params: { novelId: string };
}) {
  return <ChapterForm novelId={params.novelId} />;
}

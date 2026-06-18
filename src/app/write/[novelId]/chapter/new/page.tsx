import ChapterForm from "@/components/ChapterForm";

export const metadata = { title: "회차 작성 — 사니양 연구 보고서 열람실" };

export default function NewChapterPage({
  params,
}: {
  params: { novelId: string };
}) {
  return <ChapterForm novelId={params.novelId} />;
}

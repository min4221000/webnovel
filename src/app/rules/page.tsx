export const metadata = { title: "이용규정 — 웹소설 연재소" };

export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto prose-sm space-y-4">
      <h1 className="text-2xl font-bold">이용규정</h1>
      <p className="text-sm text-gray-500">
        본 사이트는 <strong>웹소설 연재(글쓰기) 전용 커뮤니티</strong>입니다.
        아래 규정을 위반할 경우 경고 → 글 삭제 → 계정 차단의 단계적 제재가
        적용됩니다.
      </p>

      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>
          <strong>도배·광고 금지</strong> — 동일/유사 글 반복 게시, 홍보성·상업성
          게시물을 금지합니다.
        </li>
        <li>
          <strong>욕설·혐오·음란물 금지</strong> — 욕설, 차별·혐오 발언, 선정적
          이미지/글을 금지합니다.
        </li>
        <li>
          <strong>저작권 침해 금지</strong> — 타인의 작품을 무단 게시하거나
          표절하는 행위를 금지합니다.
        </li>
        <li>
          <strong>분쟁 유발 금지</strong> — 정치·종교 등 분쟁을 유발하는 글로
          커뮤니티 분위기를 해치지 마세요.
        </li>
        <li>
          <strong>용도 준수</strong> — 본 사이트는 글쓰기 전용입니다. 잡담·친목
          목적의 게시물은 삭제될 수 있습니다.
        </li>
      </ol>

      <div className="text-sm text-gray-500 border-t pt-4">
        신고는 각 글/댓글의 신고 버튼으로 접수되며, 관리자가 검토 후 처리합니다.
      </div>
    </div>
  );
}

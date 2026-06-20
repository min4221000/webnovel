export const metadata = { title: "이용규정 — 사니양 연구 보고서 열람실" };

export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto prose-sm space-y-4">
      <h1 className="text-2xl font-bold">이용규정</h1>
      <p className="text-sm text-gray-500">
        본 열람실은 <strong>사니양 연구실 실험체 모임 디스코드 전용</strong>입니다.
        아래 규정을 위반할 경우 수위에 따라 경고 → 글 삭제 → 계정 차단의 제재가
        적용됩니다.
      </p>

      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>
          <strong>도배·광고 금지</strong> — 웹소설이 아닌 글 게시, 홍보성·상업성
          게시물을 금지합니다.
        </li>
        <li>
          <strong>욕설·혐오 금지</strong> — 웹소설 내를 제외한 댓글에서의 욕설, 비난,
          차별·혐오 발언을 금지합니다.
        </li>
        <li>
          <strong>🔞시크릿 플러스 콘텐츠는 반드시 표시</strong> — 선정적 작품은 글쓰기 시
          <strong> &ldquo;🔞시크릿 플러스 작품&rdquo;</strong>에 체크해야 합니다. 미표시 게시는 제재
          대상입니다. 시크릿 플러스 작품은{" "}
          <a href="/adult" className="underline">
            시크릿 플러스 설정
          </a>
          을 켠 만 19세 이상 이용자에게만 노출됩니다. (불법 촬영물·아동 관련 등
          현행법 위반 콘텐츠는 여부와 무관하게 전면 금지)
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
          <strong>용도 준수</strong> — 본 열람실은 글쓰기 전용입니다. 잡담·친목
          목적의 게시물은 삭제될 수 있습니다.
        </li>
      </ol>

      <div className="text-sm text-gray-500 border-t pt-4 space-y-3">
        <p>신고는 각 글/댓글의 신고 버튼으로 접수되며, 관리자가 검토 후 처리합니다.</p>

        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
          <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">안내사항</p>
          <p>
            본 열람실은 개인이 운영하는 서버입니다. 예기치 않은 서버 장애나 데이터 손실이
            발생할 수 있으므로, 작성하신 글은 <strong>별도로 텍스트 파일 등으로 백업</strong>해두시는
            것을 권장합니다. 또한{" "}
            <strong>사니양연구실 실험체 모임 디스코드 &ldquo;개인 연구 결과 보고서&rdquo; 채널</strong>에
            동시에 올려두시면 더 안전합니다.
          </p>
        </div>

        <div className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-3">
          <p className="font-medium mb-1">문의/개선 제안/서버 장애 신고</p>
          <p>
            문의사항, 개선 아이디어, 서버 오류 제보 등은 디스코드{" "}
            <strong className="font-mono">_cornbutter</strong> 로 DM 부탁드립니다.
          </p>
        </div>
      </div>
    </div>
  );
}

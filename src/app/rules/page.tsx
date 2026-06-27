import Link from "next/link";

export const metadata = { title: "이용규정 — 사니양 연구 보고서 열람실" };

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
        <span className="grid place-items-center w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 text-xs font-bold shrink-0">{num}</span>
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-slate-600 space-y-2">
        {children}
      </div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
      <span>{children}</span>
    </li>
  );
}

export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto py-10">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-indigo-600 transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        돌아가기
      </Link>

      <h1 className="text-2xl font-extrabold tracking-tight">이용규정</h1>
      <p className="mt-2 text-sm text-slate-400">
        본 열람실은 <strong className="font-semibold text-slate-600">사니양 연구실 실험체 모임 디스코드 전용</strong>입니다.
        아래 규정을 위반할 경우 수위에 따라 경고 → 글 삭제 → 계정 차단의 제재가 적용됩니다.
      </p>

      <div className="mt-8 space-y-10">
        <Section num={1} title="도배·광고 금지">
          <p>웹소설이 아닌 글 게시, 홍보성·상업성 게시물을 금지합니다. 본 열람실은 글쓰기(웹소설 연재) 전용입니다. 잡담·친목 목적의 게시물은 삭제될 수 있습니다.</p>
        </Section>

        <Section num={2} title="욕설·혐오 금지">
          <p>웹소설 내를 제외한 댓글에서의 욕설, 비난, 차별·혐오 발언을 금지합니다. 작가와 독자 모두를 존중하는 언어를 사용하세요.</p>
        </Section>

        <Section num={3} title="시크릿 플러스 콘텐츠는 반드시 표시">
          <ul className="list-none space-y-2">
            <Li>선정적 작품은 글쓰기 시 <strong className="font-semibold text-slate-700">&ldquo;시크릿 플러스 작품&rdquo;</strong>에 체크해야 합니다. 미표시 게시는 제재 대상입니다.</Li>
            <Li>시크릿 플러스 작품은 <Link href="/adult" className="underline text-indigo-600 hover:text-indigo-700">시크릿 플러스 설정</Link>을 켠 만 19세 이상 이용자에게만 노출됩니다.</Li>
            <Li>불법 촬영물·아동 관련 등 현행법 위반 콘텐츠는 여부와 무관하게 전면 금지합니다.</Li>
          </ul>
        </Section>

        <Section num={4} title="저작권 침해 금지">
          <p>타인의 작품을 무단 게시하거나 표절하는 행위를 금지합니다. 즉시 삭제 및 영구 제재합니다.</p>
        </Section>

        <Section num={5} title="분쟁 유발 금지">
          <p>정치·종교 등 분쟁을 유발하는 글로 커뮤니티 분위기를 해치지 마세요. 관리자가 별도 안내 없이 삭제할 수 있습니다.</p>
        </Section>

        <Section num={6} title="악용 금지">
          <p>웹사이트의 버그·허점을 악용하거나, 신고 도배 등 시스템을 남용하는 행위는 즉시 제재됩니다. 다계정 운영이 확인되면 전 계정 제재합니다.</p>
        </Section>

        <Section num={7} title="제재 기준">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">위반 유형</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">조치</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr><td className="px-4 py-3">욕설·혐오 표현</td><td className="px-4 py-3">즉시 삭제 + 경고</td></tr>
                <tr><td className="px-4 py-3">무단 광고·홍보</td><td className="px-4 py-3">즉시 삭제 + 경고</td></tr>
                <tr><td className="px-4 py-3">표절·무단 복사</td><td className="px-4 py-3">즉시 삭제 + 영구 제재</td></tr>
                <tr><td className="px-4 py-3">다계정 운영</td><td className="px-4 py-3">전 계정 영구 제재</td></tr>
                <tr><td className="px-4 py-3">분쟁 유발·선동</td><td className="px-4 py-3">관리자 판단에 따라 삭제·제재</td></tr>
                <tr><td className="px-4 py-3">규정 반복 위반</td><td className="px-4 py-3">영구 제재</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* 안내사항 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm text-amber-800 font-semibold">안내사항</p>
          <p className="mt-1 text-sm text-amber-700 leading-relaxed">
            본 열람실은 개인이 운영하는 서버입니다. 예기치 않은 서버 장애나 데이터 손실이
            발생할 수 있으므로, 작성하신 글은 <strong>별도로 텍스트 파일 등으로 백업</strong>해두시는
            것을 권장합니다. 또한{" "}
            <strong>사니양연구실 실험체 모임 디스코드 &ldquo;개인 연구 결과 보고서&rdquo; 채널</strong>에
            동시에 올려두시면 더 안전합니다.
          </p>
        </div>

        {/* 문의 */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-4">
          <p className="text-sm text-indigo-700 font-semibold">문의</p>
          <p className="mt-1 text-sm text-indigo-600 leading-relaxed">
            문의사항, 개선 아이디어, 서버 오류 제보 등은 디스코드{" "}
            <strong className="font-mono">_cornbutter</strong> 로 DM 부탁드립니다.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          본 열람실은 개인 비용으로 운영되며, 사정에 따라 사전 고지 없이 서비스가 중단될 수 있습니다.
          규정은 사전 공지 없이 변경될 수 있으며, 변경 즉시 효력이 발생합니다.
        </p>
      </div>
    </div>
  );
}

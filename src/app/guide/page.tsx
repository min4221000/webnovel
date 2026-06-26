export const metadata = { title: "이용 가이드 — 사니양 연구 보고서 열람실" };

// 스크린샷 한 장 + 설명. 이미지는 /public/guide/ 안에 png로 넣으면 표시됨.
// 파일이 아직 없으면 alt 텍스트만 보이고 레이아웃은 유지됨.
function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="my-4 rounded-lg border border-black/10 dark:border-white/15 overflow-hidden bg-black/[0.02] dark:bg-white/[0.03]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
      {caption && (
        <figcaption className="px-3 py-2 text-xs text-gray-500 border-t border-black/10 dark:border-white/10">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1 scroll-mt-20">
      {children}
    </h2>
  );
}

const TOC = [
  { id: "reader", label: "🙂 처음 오셨나요? (기본)" },
  { id: "webhook", label: "🔔 알림(웹후크) 설정법" },
  { id: "writer", label: "✍️ 글 쓰는 분들께" },
];

export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">이용 가이드</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          처음 오신 분은 <strong>기본</strong>만 보셔도 충분합니다. 알림을 받고 싶다면{" "}
          <strong>알림(웹후크) 설정법</strong>을, 직접 글을 올리신다면 맨 아래{" "}
          <strong>글 쓰는 분들께</strong>를 참고하세요.
        </p>
      </header>

      {/* 목차 */}
      <nav className="flex flex-wrap gap-2 text-sm">
        {TOC.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="px-3 py-1.5 rounded-full border border-black/15 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* ───────── PART A: 독자 기본 ───────── */}
      <section className="space-y-5">
        <SectionTitle id="reader">🙂 처음 오셨나요? — 기본 사용법</SectionTitle>

        {/* 로그인 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">1. Discord로 로그인</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            본 열람실은 <strong>지정된 Discord 서버 멤버 전용</strong>입니다. 첫 화면의{" "}
            <strong>&ldquo;Discord로 로그인&rdquo;</strong> → 권한 안내에서 <strong>&ldquo;승인&rdquo;</strong>을 누르면 입장됩니다.
          </p>
          <Shot src="/guide/login.png" alt="Discord 로그인 화면" caption="첫 화면 — Discord로 로그인" />
          <Shot src="/guide/oauth.png" alt="Discord 권한 승인 화면" caption="권한 안내에서 '승인'" />
        </div>

        {/* 읽기 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">2. 작품 읽기</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            목록에서 작품을 고르면 작품 페이지로 들어갑니다. 회차를 누르면 본문을 읽을 수 있고,
            어디까지 읽었는지 <strong>&ldquo;N화까지 읽음&rdquo;</strong>으로 표시됩니다.
          </p>
          <Shot src="/guide/bookmark-star.png" alt="작품 페이지 — 별(북마크) 버튼" caption="작품 페이지 — 오른쪽 위 ★로 북마크" />
        </div>

        {/* 북마크/팔로우 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">3. 북마크 · 팔로우</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step><strong>★ 북마크</strong> (작품 페이지 오른쪽 위) — 관심 작품을 모아두고, 새 회차 알림을 받습니다.</Step>
            <Step><strong>+ 팔로우</strong> (작가 페이지) — 그 작가의 <strong>모든 작품</strong> 새 회차 알림을 받습니다.</Step>
            <Step>상단 <strong>북마크</strong> 메뉴에서 북마크한 작품과 읽은 진도를 한눈에 볼 수 있습니다.</Step>
          </ul>
          <Shot src="/guide/follow.png" alt="작가 팔로우 버튼" caption="작가 페이지 — + 팔로우" />
          <Shot src="/guide/bookmarks-page.png" alt="북마크 목록 페이지" caption="북마크 메뉴 — 모아보기 + 읽은 진도" />
          <p className="text-sm text-gray-500 leading-relaxed">
            ※ 알림이 실제로 오게 하려면 먼저 <a href="#webhook" className="underline">웹후크 설정</a>이 필요합니다.
          </p>
        </div>

        {/* 신고 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">4. 신고</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            부적절한 글·댓글은 <strong>🚩 신고</strong> 버튼으로 접수할 수 있습니다. 관리자가 검토 후 처리합니다.
          </p>
          <Shot src="/guide/report.png" alt="신고 버튼" caption="각 회차·댓글의 🚩 신고" />
        </div>
      </section>

      {/* ───────── PART B: 웹후크 설정 ───────── */}
      <section className="space-y-4">
        <SectionTitle id="webhook">🔔 알림(웹후크) 설정법</SectionTitle>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          알림은 <strong>내 Discord 채널로 직접</strong> 옵니다. 한 번만 설정해두면 북마크·팔로우한 작품의 새 회차가 그 채널로 전달됩니다.
        </p>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">① Discord에서 웹후크 URL 만들기</h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step>알림을 받을 <strong>채널</strong>을 하나 정합니다. (개인 서버나 DM용 서버를 추천)</Step>
            <Step>그 채널의 <strong>설정(톱니) → 연동 → 웹후크 → 새 웹후크</strong></Step>
            <Step><strong>&ldquo;웹후크 URL 복사&rdquo;</strong>를 눌러 URL을 복사합니다.</Step>
          </ol>
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            ⚠ 이 URL은 <strong>비밀번호와 같습니다.</strong> 노출되면 누구나 그 채널에 글을 쓸 수 있으니 남에게 공유하지 마세요.
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">② 프로필에 붙여넣기</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            오른쪽 위 <strong>내 아바타 → 프로필 설정 → ① 알림 받을 Discord 채널</strong> 칸에 복사한 URL을 붙여넣고 <strong>저장</strong>합니다.
          </p>
          <Shot src="/guide/webhook-profile.png" alt="프로필 — 웹후크 설정" caption="프로필 설정 — 웹후크 URL 붙여넣기 + 알림 종류" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">③ 받을 알림 고르기</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step>채널만 연결돼 있으면 <strong>북마크한 작품 · 팔로우한 작가</strong>의 새 회차는 항상 옵니다.</Step>
            <Step><strong>모든 작품의 새 회차</strong>를 켜면 누가 올리든 전부 알림이 옵니다.</Step>
            <Step><strong>본문 미리보기 포함</strong> — 켜면 알림에 본문·이미지가 함께 옵니다. <span className="text-amber-500">스포일러가 싫으면 꺼두세요.</span></Step>
          </ul>
        </div>
      </section>

      {/* ───────── PART C: 작가 ───────── */}
      <section className="space-y-5">
        <SectionTitle id="writer">✍️ 글 쓰는 분들께</SectionTitle>

        {/* 작품 등록 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">1. 작품 등록</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            오른쪽 위 <strong>글쓰기 → 새 소설 등록</strong>.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step><strong>제목</strong>(30자) · <strong>설명</strong>(200자) · <strong>태그</strong> · <strong>연재 상태</strong>(연재중/완결/휴재).</Step>
            <Step><strong>커버 이미지</strong> — 권장 300 × 400px(세로 3:4), 최대 15MB. 업로드 시 자동으로 WebP 압축됩니다.</Step>
            <Step><strong>🔞 시크릿 플러스 작품</strong> — 체크하면 시크릿 플러스를 켠 이용자에게만 노출됩니다.</Step>
            <Step><strong>비공개</strong> — 나만 볼 수 있게 등록. 나중에 공개로 바꿀 수 있습니다.</Step>
          </ul>
          <Shot src="/guide/write-novel.png" alt="새 소설 등록 화면" caption="새 소설 등록" />
        </div>

        {/* 에디터 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">2. 회차 쓰기 (에디터)</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step><strong>글꼴 · 크기 · 굵게/기울임/밑줄/취소선</strong> — 선택한 글자에만 적용.</Step>
            <Step><strong>색</strong> 버튼 — 한 패널에 <strong>배경색 · 글자색</strong>. 팔레트나 &ldquo;다른 색상 선택&rdquo;으로 지정.</Step>
            <Step><strong>서</strong> 버튼 — 드래그한 부분의 모든 서식을 한 번에 제거.</Step>
            <Step><strong>정렬(좌·중·우·양) · 줄 간격</strong> — 커서가 있는 줄, 또는 드래그한 줄들에만 적용. 줄마다 다르게 줄 수 있습니다.</Step>
            <Step><strong>목록 · 인용 · 구분선 · 링크 · 유튜브 · 이미지 · 특수문자</strong>. 이미지는 클릭 후 크기·정렬 조절.</Step>
            <Step><strong>🌑 → 🌅</strong> — 두 버튼 사이 구간이 읽을 때 화면이 어두워지는 연출.</Step>
            <Step>에디터 아래 <strong>회색 바</strong>를 드래그하면 글쓰기 영역 높이를 조절할 수 있습니다.</Step>
          </ul>
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-3 text-sm text-gray-700 dark:text-gray-200 space-y-1.5 leading-relaxed">
            <p className="font-medium">✍️ 줄바꿈 · 붙여넣기</p>
            <p><strong>Enter</strong>로 줄을 바꿉니다. 한 번이면 다음 줄, 두 번이면 한 줄 띄움. 줄마다 정렬·줄 간격을 따로 줄 수 있어요.</p>
            <p><strong>외부(Discord·워드)</strong>에서 붙여넣으면 서식을 정리해 줄 구조만 살리고, <strong>에디터 안에서 복사·붙여넣기</strong>하면 서식이 그대로 유지됩니다.</p>
          </div>
          <Shot src="/guide/editor.png" alt="회차 작성 에디터" caption="에디터 — 서식 · 색 · 정렬 · 줄 간격 · 이미지" />
        </div>

        {/* 비공개 → 공개 알림 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">3. 비공개로 쓰고, 완성되면 공개 + 알림</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            회차를 <strong>비공개</strong>로 저장하면 나만 볼 수 있습니다. 다 다듬은 뒤 회차 수정 화면에서{" "}
            <strong>&ldquo;공개 + 알림 받기&rdquo;</strong>를 누르면 공개로 전환되고, 이 작품을 <strong>북마크한 사람에게 Discord 알림</strong>이 발송됩니다.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step><strong>임시저장</strong> — 이 브라우저에만 임시로 저장됩니다. (서버 저장 아님)</Step>
            <Step>본문 미리보기 포함 여부는 알림을 <strong>받는 사람</strong>이 각자 프로필에서 정합니다.</Step>
          </ul>
          <Shot src="/guide/chapter-edit.png" alt="회차 수정 화면 — 공개 + 알림" caption="회차 수정 — 비공개 저장 후 '공개 + 알림 받기'" />
        </div>

        {/* 관리 */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">4. 작품 · 회차 관리</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step>작품 페이지에서 <strong>정보 수정 · 소설 삭제 · + 새 회차</strong>를 할 수 있습니다.</Step>
            <Step>각 회차는 <strong>회차 수정</strong>에서 제목·본문을 고칠 수 있습니다.</Step>
          </ul>
        </div>
      </section>

      <p className="text-sm text-gray-500 border-t border-black/10 dark:border-white/10 pt-4 leading-relaxed">
        자세한 운영 규정은 <a href="/rules" className="underline">이용규정</a>을 확인하세요.
        문의·개선 제안은 Discord <strong className="font-mono">_cornbutter</strong>로 DM 부탁드립니다.
      </p>
    </div>
  );
}

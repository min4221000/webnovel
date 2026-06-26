export const metadata = { title: "이용 가이드 — 사니양 연구 보고서 열람실" };

// 스크린샷 한 장 + 설명. 이미지는 /public/guide/ 안에 같은 이름으로 넣으면 표시됨.
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

const SECTIONS = [
  { id: "start", label: "① 시작하기" },
  { id: "profile", label: "② 프로필·알림" },
  { id: "write-novel", label: "③ 작품 등록" },
  { id: "editor", label: "④ 회차 쓰기" },
  { id: "subscribe", label: "⑤ 북마크·팔로우" },
  { id: "etc", label: "⑥ 신고·기타" },
];

function Step({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

export default function GuidePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">이용 가이드</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          사니양 연구 보고서 열람실 사용법을 처음부터 끝까지 정리했습니다.
          로그인 → 프로필 설정 → 작품 등록 → 회차 쓰기 순서로 따라오시면 됩니다.
        </p>
      </header>

      {/* 목차 */}
      <nav className="flex flex-wrap gap-2 text-sm">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="px-3 py-1.5 rounded-full border border-black/15 dark:border-white/20 text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      {/* ① 시작하기 */}
      <section id="start" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1">① 시작하기 — Discord 로그인</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          본 열람실은 <strong>지정된 Discord 서버 멤버 전용</strong>입니다. 첫 화면의
          <strong> &ldquo;Discord로 로그인&rdquo;</strong> 버튼을 누르고, Discord 권한 안내에서
          <strong> &ldquo;승인&rdquo;</strong>을 누르면 바로 입장됩니다. 서버 닉네임이 있으면 자동 적용됩니다.
        </p>
        <Shot src="/guide/01-login.png" alt="Discord 로그인 화면" caption="첫 화면 — Discord로 로그인" />
        <Shot src="/guide/02-oauth.png" alt="Discord 권한 승인 화면" caption="권한 안내에서 '승인'을 누르면 로그인 완료" />
      </section>

      {/* ② 프로필·알림 */}
      <section id="profile" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1">② 프로필 · 알림 설정</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          오른쪽 위 <strong>내 아바타</strong>를 누르면 프로필 설정으로 들어갑니다.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Step><strong>커스텀 닉네임</strong> (최대 30자) — 비워두면 Discord 이름을 사용합니다.</Step>
          <Step>
            <strong>① 알림 받을 Discord 채널</strong> — 알림은 <strong>Discord 웹후크</strong>로 옵니다.
            Discord에서 <strong>채널 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사</strong> 후 붙여넣으세요.
            <span className="text-amber-500"> ⚠ 이 URL은 비밀입니다. 노출되면 누구나 그 채널에 글을 쓸 수 있어요.</span>
          </Step>
          <Step>
            <strong>② 어떤 알림을 받을지</strong> — 채널만 연결돼 있으면 <strong>북마크한 작품 · 팔로우한 작가</strong>의 새 회차는
            항상 옵니다. <strong>&ldquo;모든 작품의 새 회차&rdquo;</strong>를 켜면 누가 올리든 전부 알림이 옵니다.
          </Step>
          <Step>
            <strong>③ 본문 미리보기 포함</strong> — 켜면 알림에 회차 본문·이미지가 함께 옵니다.
            끄면 제목+링크만. <span className="text-amber-500">스포일러가 싫으면 꺼두세요.</span>
          </Step>
          <Step>
            <strong>🔞 시크릿 플러스</strong> — 만 19세 이상이면 켤 수 있고, 켠 이용자에게만 시크릿 플러스 작품이 노출됩니다.
          </Step>
        </ul>
        <Shot src="/guide/03-profile.png" alt="프로필 설정 화면" caption="프로필 설정 — 닉네임 · 웹후크 알림 · 시크릿 플러스" />
      </section>

      {/* ③ 작품 등록 */}
      <section id="write-novel" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1">③ 작품 등록</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          오른쪽 위 <strong>글쓰기</strong>를 누르면 <strong>새 소설 등록</strong> 화면이 나옵니다.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Step><strong>제목</strong>(최대 30자) · <strong>설명</strong>(최대 200자)을 입력합니다.</Step>
          <Step><strong>태그</strong>로 작품 성격을 표시합니다. (사니 / 나모 / 유머 / 장편 / 시크릿 플러스 등)</Step>
          <Step><strong>연재 상태</strong> — 연재중 / 완결 / 휴재 중 선택.</Step>
          <Step>
            <strong>커버 이미지</strong> — 권장 <strong>300 × 400px(세로 3:4)</strong>, 최대 15MB. JPG/PNG/WebP.
            업로드하면 자동으로 1920px 이하 · WebP로 압축됩니다.
          </Step>
          <Step><strong>🔞 시크릿 플러스 작품</strong> 체크 — 시크릿 플러스를 켠 이용자에게만 노출됩니다.</Step>
          <Step><strong>비공개</strong> 체크 — 나만 볼 수 있습니다. 나중에 수정에서 공개로 바꿀 수 있어요.</Step>
        </ul>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>&ldquo;등록하고 1화 쓰기 →&rdquo;</strong>를 누르면 곧바로 회차 작성 화면으로 넘어갑니다.
        </p>
        <Shot src="/guide/04-write-novel.png" alt="새 소설 등록 화면" caption="새 소설 등록 — 제목 · 태그 · 커버 이미지" />
      </section>

      {/* ④ 회차 쓰기 (에디터) */}
      <section id="editor" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1">④ 회차 쓰기 (에디터)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          상단 툴바로 글꼴부터 효과까지 꾸밀 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Step><strong>글꼴 · 크기</strong> — 드롭다운에서 선택. 선택한 글자에만 적용됩니다.</Step>
          <Step><strong>굵게 · 기울임 · 밑줄 · 취소선</strong>.</Step>
          <Step>
            <strong>색 버튼</strong> — 한 패널에 <strong>배경색 · 글자색</strong>이 함께 있습니다. 팔레트에서 고르거나
            <strong> &ldquo;다른 색상 선택&rdquo;</strong>으로 원하는 색을 직접 지정하세요.
          </Step>
          <Step><strong>서(서식 제거)</strong> — 드래그한 부분의 색 · 크기 · 굵게 등 모든 서식을 한 번에 지웁니다.</Step>
          <Step>
            <strong>정렬(좌·중·우·양) · 줄 간격</strong> — <strong>커서가 있는 문단</strong> 또는
            <strong> 드래그한 문단들에만</strong> 적용됩니다. 문단마다 다르게 줄 수 있어요.
          </Step>
          <Step><strong>목록 · 인용구 · 구분선 · 링크</strong>.</Step>
          <Step><strong>🌑 → 🌅</strong> — 두 버튼 사이 구간이 읽을 때 화면이 어두워지는 연출 효과입니다.</Step>
          <Step>
            <strong>🖼 이미지 · ▶ 유튜브</strong> — 이미지는 회차당 정해진 장수까지, 최대 15MB(JPG/PNG/WebP).
            업로드 시 자동 압축됩니다. 이미지를 클릭하면 정렬·크기를 조절할 수 있어요.
          </Step>
        </ul>
        <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-3 text-sm text-gray-700 dark:text-gray-200 space-y-1.5 leading-relaxed">
          <p className="font-medium">✍️ 줄바꿈 · 붙여넣기 팁</p>
          <p><strong>Enter</strong> = 새 문단, <strong>Shift+Enter</strong> = 같은 문단 안에서 줄만 바꿈. Enter를 두 번 누르면 간격이 두 배가 됩니다.</p>
          <p><strong>외부(Discord·워드·메모장)</strong>에서 붙여넣으면 서식을 정리해 줄 구조만 살립니다. <strong>에디터 안에서 복사·붙여넣기</strong>하면 색·크기 등 서식이 그대로 유지됩니다.</p>
        </div>
        <p className="text-xs text-gray-500">
          아래에 글자수 카운터가 있습니다. 한도를 넘으면 저장되지 않으니 분량을 확인하세요.
        </p>
        <Shot src="/guide/05-editor.png" alt="회차 작성 에디터 화면" caption="에디터 툴바 — 서식 · 색 · 정렬 · 줄 간격 · 이미지" />
      </section>

      {/* ⑤ 북마크·팔로우 */}
      <section id="subscribe" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1">⑤ 북마크 · 팔로우 · 알림</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Step>
            <strong>☆ 북마크</strong> (작품 페이지) — 그 작품에 새 회차가 올라오면 내 Discord 웹후크로 알림이 옵니다.
          </Step>
          <Step>
            <strong>+ 팔로우</strong> (작가 페이지) — 그 작가의 <strong>모든 작품</strong> 새 회차 알림을 받습니다.
          </Step>
          <Step>알림이 오게 하려면 먼저 프로필에서 <strong>웹후크 채널을 연결</strong>해야 합니다. (②번 참고)</Step>
        </ul>
        <Shot src="/guide/06-novel-detail.png" alt="작품 상세 페이지 — 북마크/팔로우 버튼" caption="작품 페이지의 ☆ 북마크 · 작가 페이지의 + 팔로우" />
      </section>

      {/* ⑥ 신고·기타 */}
      <section id="etc" className="space-y-3 scroll-mt-20">
        <h2 className="text-lg font-bold border-b border-black/10 dark:border-white/15 pb-1">⑥ 신고 · 기타</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Step><strong>🚩 신고</strong> — 각 글·댓글의 신고 버튼으로 접수됩니다. 관리자가 검토 후 처리합니다.</Step>
          <Step><strong>비밀글</strong> — 비공개로 등록한 작품은 상단 <strong>비밀글</strong> 메뉴에서 모아볼 수 있습니다.</Step>
          <Step><strong>검색 · 북마크</strong> — 상단 메뉴에서 작품 검색과 북마크 목록을 볼 수 있습니다.</Step>
        </ul>
        <p className="text-sm text-gray-500 border-t border-black/10 dark:border-white/10 pt-3">
          자세한 운영 규정은 <a href="/rules" className="underline">이용규정</a>을 확인하세요.
          문의·개선 제안은 Discord <strong className="font-mono">_cornbutter</strong>로 DM 부탁드립니다.
        </p>
      </section>
    </div>
  );
}

import GuideImage from "./GuideImage";

export const metadata = { title: "이용 가이드 — 사니양 연구 보고서 열람실" };

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

// 한 기능 = 제목 + 이미지(먼저) + 한두 줄 설명. 이미지 우선 배치.
function Feature({
  title,
  images,
  children,
}: {
  title: string;
  images: { src: string; alt: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm">{title}</h3>
      {images.map((img) => (
        <GuideImage key={img.src} src={img.src} alt={img.alt} />
      ))}
      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed space-y-1">
        {children}
      </div>
    </div>
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
          <strong>글 쓰는 분들께</strong>를 참고하세요. <span className="text-gray-400">이미지를 클릭하면 크게 볼 수 있습니다.</span>
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
      <section className="space-y-6">
        <SectionTitle id="reader">🙂 처음 오셨나요? — 기본 사용법</SectionTitle>

        <Feature
          title="1. Discord로 로그인"
          images={[
            { src: "/guide/login.webp", alt: "Discord 로그인 화면" },
            { src: "/guide/oauth.webp", alt: "Discord 권한 승인 화면" },
          ]}
        >
          <p>
            <strong>지정된 Discord 서버 멤버 전용</strong>입니다. <strong>&ldquo;Discord로 로그인&rdquo;</strong> →
            권한 안내에서 <strong>&ldquo;승인&rdquo;</strong>을 누르면 입장됩니다.
          </p>
        </Feature>

        <Feature
          title="2. 작품 읽기"
          images={[{ src: "/guide/bookmark-star.webp", alt: "작품 페이지 — 별(북마크)·작가명" }]}
        >
          <p>작품을 고르면 회차를 읽을 수 있고, 어디까지 읽었는지 <strong>&ldquo;N화까지 읽음&rdquo;</strong>으로 표시됩니다.</p>
          <p>오른쪽 위 <strong>★</strong>로 북마크, <strong>왼쪽 위 작가명</strong>을 누르면 그 작가의 작가 페이지로 이동합니다.</p>
        </Feature>

        <Feature
          title="3. 북마크 · 팔로우"
          images={[
            { src: "/guide/follow.webp", alt: "작가 팔로우 버튼" },
            { src: "/guide/bookmarks-page.webp", alt: "북마크 목록 페이지" },
          ]}
        >
          <p><strong>★ 북마크</strong>(작품) · <strong>+ 팔로우</strong>(작가의 모든 작품) — 새 회차가 올라오면 알림을 받습니다.</p>
          <p>상단 <strong>북마크</strong> 메뉴에서 북마크한 작품과 읽은 진도를 한눈에 볼 수 있습니다.</p>
          <p className="text-gray-500">※ 알림이 실제로 오게 하려면 먼저 <a href="#webhook" className="underline">웹후크 설정</a>이 필요합니다.</p>
        </Feature>

        <Feature
          title="4. 신고"
          images={[{ src: "/guide/report.webp", alt: "신고 버튼" }]}
        >
          <p>부적절한 글·댓글은 <strong>🚩 신고</strong> 버튼으로 접수할 수 있습니다. 관리자가 검토 후 처리합니다.</p>
        </Feature>
      </section>

      {/* ───────── PART B: 웹후크 설정 ───────── */}
      <section className="space-y-6">
        <SectionTitle id="webhook">🔔 알림(웹후크) 설정법</SectionTitle>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          알림은 <strong>내 Discord 채널로 직접</strong> 옵니다. 한 번만 설정해두면 북마크·팔로우한 작품의 새 회차가 그 채널로 전달됩니다.
        </p>

        <Feature
          title="① Discord에서 웹후크 URL 만들기"
          images={[{ src: "/guide/webhook-discord.webp", alt: "Discord 웹후크 만들기 화면" }]}
        >
          <p>알림 받을 채널의 <strong>설정(톱니) → 연동 → 웹후크 → 새 웹후크</strong> → <strong>&ldquo;웹후크 URL 복사&rdquo;</strong>.</p>
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-2 text-amber-800 dark:text-amber-300">
            ⚠ 이 URL은 <strong>비밀번호와 같습니다.</strong> 노출되면 누구나 그 채널에 글을 쓸 수 있으니 공유하지 마세요.
          </div>
        </Feature>

        <Feature
          title="② 프로필에 붙여넣기"
          images={[{ src: "/guide/webhook-profile.webp", alt: "프로필 — 웹후크 설정" }]}
        >
          <p>오른쪽 위 <strong>아바타 → 프로필 설정 → ① 알림 받을 Discord 채널</strong>에 복사한 URL을 붙여넣고 <strong>저장</strong>합니다.</p>
        </Feature>

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
      <section className="space-y-6">
        <SectionTitle id="writer">✍️ 글 쓰는 분들께</SectionTitle>

        <Feature
          title="1. 작품 등록"
          images={[{ src: "/guide/write-novel.webp", alt: "새 소설 등록 화면" }]}
        >
          <p>오른쪽 위 <strong>글쓰기 → 새 소설 등록</strong>. 제목·설명·태그·연재 상태를 정합니다.</p>
          <p><strong>커버 이미지</strong>는 권장 300×400px(세로 3:4), 자동 WebP 압축. <strong>🔞 시크릿 플러스</strong>·<strong>비공개</strong> 옵션도 여기서.</p>
        </Feature>

        <Feature
          title="2. 회차 쓰기 (에디터)"
          images={[
            { src: "/guide/editor1.webp", alt: "에디터 — 시연 예시" },
            { src: "/guide/editor2.webp", alt: "에디터 — 툴바" },
          ]}
        >
          <p>글꼴·크기·굵게/색·<strong>정렬·줄 간격</strong>(줄마다 따로)·목록·인용·링크·유튜브·이미지·특수문자를 지원합니다.</p>
          <p><strong>Enter</strong>로 줄바꿈(두 번이면 한 줄 띄움). 외부 글은 서식 정리, 에디터 안 복붙은 서식 유지. 하단 회색 바로 높이 조절.</p>
        </Feature>

        <Feature
          title="3. 비공개로 쓰고, 완성되면 공개 + 알림"
          images={[{ src: "/guide/chapter-edit.webp", alt: "회차 수정 — 공개 + 알림" }]}
        >
          <p><strong>비공개</strong>로 저장하면 나만 볼 수 있고, 회차 수정에서 <strong>&ldquo;공개 + 알림 받기&rdquo;</strong>를 누르면 공개 전환 + <strong>북마크한 사람에게 Discord 알림</strong>이 발송됩니다.</p>
          <p className="text-gray-500">임시저장은 이 브라우저에만 저장됩니다(서버 저장 아님). 본문 미리보기 포함 여부는 받는 사람이 각자 정합니다.</p>
        </Feature>

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">4. 작품 · 회차 관리</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Step>작품 페이지에서 <strong>정보 수정 · 소설 삭제 · + 새 회차</strong>.</Step>
            <Step>각 회차는 <strong>회차 수정</strong>에서 제목·본문·회차 번호를 고칠 수 있습니다.</Step>
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

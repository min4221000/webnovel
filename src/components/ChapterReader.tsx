/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * 회차 본문 렌더.
 * Ctrl+F는 브라우저 기본 동작 사용 (자체 검색바 비활성화 — 어두워짐 transition과 충돌).
 * 본문 html은 저장 시 이미 새니타이즈됨.
 */
export default function ChapterReader({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const attachImageFallbacks = useCallback((root: HTMLElement) => {
    root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const showBroken = () => {
        if (img.dataset.wnBroken) return;
        img.dataset.wnBroken = "1";
        img.style.display = "none";
        const el = document.createElement("div");
        el.className = "wn-img-broken";
        el.textContent = "🖼 이미지를 불러올 수 없습니다";
        img.parentNode?.insertBefore(el, img.nextSibling);
      };
      img.addEventListener("error", showBroken, { once: true });
      if (img.complete && img.naturalWidth === 0) showBroken();
    });
  }, []);

  // 초기 렌더 후 깨진 이미지 처리
  useEffect(() => {
    if (containerRef.current) attachImageFallbacks(containerRef.current);
  }, [html, attachImageFallbacks]);

  // 화면 전체 어두워짐 효과 (darken-start/end 마커)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const startEls = Array.from(container.querySelectorAll<HTMLElement>('[data-wn-effect="darken-start"]'));
    const endEls   = Array.from(container.querySelectorAll<HTMLElement>('[data-wn-effect="darken-end"]'));
    if (!startEls.length) return;

    // start~end 사이 스타일 수집 (hideStyles="true" 인 쌍만)
    type SavedStyle = { prop: string; value: string };
    type StyledInfo = { el: HTMLElement; saved: SavedStyle[] };
    const STYLE_PROPS = ["color", "backgroundColor", "fontWeight", "fontStyle", "textDecoration"] as const;
    const SEMANTIC_TAGS: Record<string, { prop: string; reset: string }> = {
      STRONG: { prop: "fontWeight", reset: "inherit" },
      B:      { prop: "fontWeight", reset: "inherit" },
      EM:     { prop: "fontStyle",  reset: "inherit" },
      I:      { prop: "fontStyle",  reset: "inherit" },
      U:      { prop: "textDecoration", reset: "inherit" },
      S:      { prop: "textDecoration", reset: "inherit" },
      MARK:   { prop: "backgroundColor", reset: "transparent" },
    };

    const styledMap: StyledInfo[][] = [];
    for (let i = 0; i < startEls.length; i++) {
      const s = startEls[i];
      const e = endEls[i];
      const hide = s.dataset.wnHideStyles !== "false";
      const list: StyledInfo[] = [];
      if (hide && e) {
        let node: Element | null = s.nextElementSibling;
        while (node && node !== e) {
          // 모든 자식 + 자기 자신 순회
          const allEls = [node as HTMLElement, ...Array.from(node.querySelectorAll<HTMLElement>("*"))];
          for (const el of allEls) {
            const saved: SavedStyle[] = [];
            // inline style 속성 저장
            for (const prop of STYLE_PROPS) {
              const v = el.style[prop as any];
              if (v) saved.push({ prop, value: v });
            }
            // semantic 태그 (bold/italic/underline/mark)
            const sem = SEMANTIC_TAGS[el.tagName];
            if (sem && !saved.some((s) => s.prop === sem.prop)) {
              saved.push({ prop: sem.prop, value: "__semantic__" });
            }
            if (saved.length > 0) list.push({ el, saved });
          }
          node = node.nextElementSibling;
        }
      }
      styledMap.push(list);
    }

    // 스타일 숨기기/복원 헬퍼
    const hideAll = () => {
      styledMap.forEach((list) => list.forEach(({ el, saved }) => {
        for (const { prop, value } of saved) {
          const sem = SEMANTIC_TAGS[el.tagName];
          if (value === "__semantic__" && sem) {
            (el.style as any)[sem.prop] = sem.reset;
          } else if (prop === "backgroundColor") {
            (el.style as any)[prop] = "transparent";
          } else {
            (el.style as any)[prop] = "inherit";
          }
        }
      }));
    };
    const showAll = (idx: number) => {
      styledMap[idx]?.forEach(({ el, saved }) => {
        for (const { prop, value } of saved) {
          if (value === "__semantic__") {
            (el.style as any)[prop] = "";  // semantic 태그 기본 스타일 복원
          } else {
            (el.style as any)[prop] = value;
          }
        }
      });
    };

    // 초기 상태: 숨김
    hideAll();

    let wasDark = false;
    let activeIdx = -1;
    let ticking = false;
    const root = document.documentElement;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const mid = window.innerHeight * 0.55;

        let dark = false;
        let newIdx = -1;
        let bgColor = "#0d0d0d";
        let textColor = "#f0f0f0";

        for (let i = 0; i < startEls.length; i++) {
          const s = startEls[i];
          const e = endEls[i];
          const pastStart = s.getBoundingClientRect().bottom < mid;
          const pastEnd   = e ? e.getBoundingClientRect().bottom < mid : false;
          if (pastStart && !pastEnd) {
            dark = true;
            newIdx    = i;
            bgColor   = s.dataset.wnColor     ?? "#0d0d0d";
            textColor = s.dataset.wnTextColor  ?? "#f0f0f0";
            break;
          }
        }

        if (dark === wasDark && newIdx === activeIdx) return;

        wasDark = dark;
        activeIdx = newIdx;

        if (dark) {
          root.style.setProperty("--background", bgColor);
          root.style.setProperty("--foreground", textColor);
          hideAll();
          showAll(newIdx);
        } else {
          root.style.removeProperty("--background");
          root.style.removeProperty("--foreground");
          hideAll();
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      root.style.removeProperty("--background");
      root.style.removeProperty("--foreground");
      styledMap.forEach((_, i) => showAll(i));
    };
  }, [html]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="wn-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

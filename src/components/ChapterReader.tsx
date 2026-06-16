/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 회차 본문 + Ctrl+F 커스텀 검색.
 * - Ctrl/Cmd+F 가로채기 → 자체 검색바
 * - 본문 텍스트노드 순회하며 <mark class="wn-hl"> 래핑
 * - 현재 매치는 wn-hl-active + 스크롤 이동, "n / total" 표시
 * 본문 html은 저장 시 이미 새니타이즈됨.
 */
export default function ChapterReader({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLElement[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0); // 1-based

  const clearMarks = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    root.innerHTML = html; // 원본 복원 → 기존 mark 제거
    marksRef.current = [];
  }, [html]);

  const setActive = useCallback((idx: number) => {
    const marks = marksRef.current;
    marks.forEach((m) => m.classList.remove("wn-hl-active"));
    if (marks.length === 0) return;
    const i = ((idx % marks.length) + marks.length) % marks.length;
    const el = marks[i];
    el.classList.add("wn-hl-active");
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setCurrent(i + 1);
  }, []);

  const highlight = useCallback(
    (q: string) => {
      const root = containerRef.current;
      if (!root) return;
      clearMarks();
      if (!q) {
        setTotal(0);
        setCurrent(0);
        return;
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) =>
          n.nodeValue && n.nodeValue.trim()
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      });
      const texts: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) texts.push(node as Text);

      const lowerQ = q.toLowerCase();
      const found: HTMLElement[] = [];
      for (const tn of texts) {
        const val = tn.nodeValue ?? "";
        const low = val.toLowerCase();
        let idx = low.indexOf(lowerQ);
        if (idx < 0) continue;
        const frag = document.createDocumentFragment();
        let last = 0;
        while (idx >= 0) {
          if (idx > last) frag.appendChild(document.createTextNode(val.slice(last, idx)));
          const m = document.createElement("mark");
          m.className = "wn-hl";
          m.textContent = val.slice(idx, idx + q.length);
          frag.appendChild(m);
          found.push(m);
          last = idx + q.length;
          idx = low.indexOf(lowerQ, last);
        }
        if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
        tn.parentNode?.replaceChild(frag, tn);
      }
      marksRef.current = found;
      setTotal(found.length);
      if (found.length > 0) setActive(0);
      else setCurrent(0);
    },
    [clearMarks, setActive],
  );


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
    let rafId = 0;
    const root = document.documentElement;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
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
      cancelAnimationFrame(rafId);
      root.style.removeProperty("--background");
      root.style.removeProperty("--foreground");
      styledMap.forEach((_, i) => showAll(i));
    };
  }, [html]);

  // Ctrl/Cmd+F 가로채기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
        clearMarks();
        setTotal(0);
        setCurrent(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, clearMarks]);

  const go = (dir: 1 | -1) => {
    if (total === 0) return;
    setActive((current - 1) + dir);
  };

  return (
    <div className="relative">
      {/* 검색바 */}
      {open && (
        <div className="sticky top-14 z-30 mb-3 flex items-center gap-2 rounded-md border border-black/15 dark:border-white/20 bg-[var(--background)] px-2 py-1.5 shadow-sm">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              highlight(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                go(e.shiftKey ? -1 : 1);
              }
            }}
            placeholder="본문 검색 (Enter: 다음, Shift+Enter: 이전)"
            className="flex-1 bg-transparent text-sm px-1 focus:outline-none"
          />
          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
            {total > 0 ? `${current} / ${total}` : "0건"}
          </span>
          <button onClick={() => go(-1)} className="px-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10 rounded" title="이전">↑</button>
          <button onClick={() => go(1)} className="px-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10 rounded" title="다음">↓</button>
          <button
            onClick={() => {
              setOpen(false);
              setQuery("");
              clearMarks();
              setTotal(0);
              setCurrent(0);
            }}
            className="px-1.5 text-sm hover:bg-black/10 dark:hover:bg-white/10 rounded"
            title="닫기"
          >
            ✕
          </button>
        </div>
      )}

      {/* 본문 */}
      <div
        ref={containerRef}
        className="wn-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

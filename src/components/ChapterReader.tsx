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

  // 동적 효과: darken-start/end 스크롤 기반 배경+글자색 전환
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const startEls = Array.from(container.querySelectorAll<HTMLElement>('[data-wn-effect="darken-start"]'));
    const endEls   = Array.from(container.querySelectorAll<HTMLElement>('[data-wn-effect="darken-end"]'));
    if (startEls.length === 0 && endEls.length === 0) return;

    container.style.transition = "background-color 700ms ease, color 700ms ease";

    let wasDark = false;
    let rafId = 0;

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const mid = window.innerHeight * 0.6;

        let dark = false;
        let activeIdx = -1;
        const pairs = Math.max(startEls.length, endEls.length);
        for (let i = 0; i < pairs; i++) {
          const s = startEls[i];
          const e = endEls[i];
          const pastStart = s ? s.getBoundingClientRect().bottom < mid : false;
          const pastEnd   = e ? e.getBoundingClientRect().bottom < mid : false;
          if (pastStart && !pastEnd) { dark = true; activeIdx = i; break; }
        }

        if (dark === wasDark) return;
        wasDark = dark;

        if (dark && startEls[activeIdx]) {
          const bgColor   = startEls[activeIdx].dataset.wnColor     ?? "#0d0d0d";
          const textColor = startEls[activeIdx].dataset.wnTextColor ?? "#f0f0f0";
          container.style.backgroundColor = bgColor;
          container.style.color           = textColor;
        } else {
          container.style.backgroundColor = "";
          container.style.color           = "";
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
      container.style.backgroundColor = "";
      container.style.color           = "";
      container.style.transition      = "";
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

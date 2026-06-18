"use client";

import { useState } from "react";

type Props = {
  novelId: string;
  initialBookmarked: boolean;
};

export default function BookmarkButton({ novelId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ novelId }),
    });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setBookmarked(data.bookmarked);
      setPop(true);
      setTimeout(() => setPop(false), 1200);
    }
  };

  return (
    <div className="fixed top-20 right-4 z-30 flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        disabled={busy}
        aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-200 active:scale-90 disabled:opacity-50 select-none
          ${bookmarked
            ? "bg-amber-400 text-white shadow-amber-200"
            : "bg-white border border-black/10 text-gray-300 hover:text-amber-400 hover:border-amber-300"
          }`}
      >
        {bookmarked ? "★" : "☆"}
      </button>
      {pop && (
        <span className="text-xs text-amber-500 font-medium whitespace-nowrap animate-pulse">
          {bookmarked ? "북마크 추가" : "해제"}
        </span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

type Props = {
  novelId: string;
  initialBookmarked: boolean;
};

export default function BookmarkButton({ novelId, initialBookmarked }: Props) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
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
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={bookmarked ? "북마크 해제" : "북마크"}
      className={`text-sm px-3 py-1 rounded-md border transition-colors disabled:opacity-50 ${
        bookmarked
          ? "bg-amber-400 border-amber-400 text-black hover:bg-amber-300"
          : "border-black/20 dark:border-white/20 hover:border-amber-400"
      }`}
    >
      {bookmarked ? "★ 북마크됨" : "☆ 북마크"}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import ReportButton from "./ReportButton";

type C = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
};

export default function Comments({ chapterId }: { chapterId: string }) {
  const { data: session } = useSession();
  const me = session?.user;

  const [list, setList] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/chapters/${chapterId}/comments`);
    if (res.ok) {
      const d = (await res.json()) as { comments: C[] };
      setList(d.comments);
    }
    setLoading(false);
  }, [chapterId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (content: string, parentId: string | null) => {
    if (!me) {
      signIn("discord");
      return;
    }
    if (!content.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/chapters/${chapterId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    setBusy(false);
    if (res.ok) {
      setText("");
      setReplyText("");
      setReplyTo(null);
      load();
    } else {
      alert(await res.text());
    }
  };

  const del = async (id: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) load();
    else alert(await res.text());
  };

  const tops = list.filter((c) => !c.parentId);
  const repliesOf = (id: string) => list.filter((c) => c.parentId === id);

  const Item = ({ c, isReply }: { c: C; isReply?: boolean }) => (
    <div className={`py-2 ${isReply ? "ml-8 border-l border-black/10 dark:border-white/10 pl-3" : ""}`}>
      <div className="flex items-center gap-2 text-sm">
        {c.author.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.author.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
        )}
        <span className="font-medium">{c.author.username}</span>
        <span className="text-xs text-gray-400">
          {new Date(c.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
      <div className="flex items-center gap-3 mt-1">
        {!isReply && (
          <button
            onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
            className="text-xs text-gray-400 hover:underline"
          >
            답글
          </button>
        )}
        {(me?.id === c.author.id || me?.role === "ADMIN") && (
          <button onClick={() => del(c.id)} className="text-xs text-gray-400 hover:text-red-500">
            삭제
          </button>
        )}
        <ReportButton targetType="comment" targetId={c.id} />
      </div>

      {replyTo === c.id && (
        <div className="mt-2 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="답글 입력…"
            maxLength={2000}
            className="flex-1 border rounded-md px-2 py-1 text-sm bg-transparent"
          />
          <button
            onClick={() => post(replyText, c.id)}
            disabled={busy}
            className="px-3 py-1 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* 입력창 */}
      {me ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="댓글을 입력하세요"
            maxLength={2000}
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                post(text, null);
              }
            }}
          />
          <button
            onClick={() => post(text, null)}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white disabled:opacity-50"
          >
            등록
          </button>
        </div>
      ) : (
        <button
          onClick={() => signIn("discord")}
          className="text-sm text-indigo-500 hover:underline"
        >
          댓글을 작성하려면 Discord 로그인하세요 →
        </button>
      )}

      {/* 목록 */}
      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : tops.length === 0 ? (
        <p className="text-sm text-gray-400">첫 댓글을 남겨보세요.</p>
      ) : (
        <div className="divide-y divide-black/10 dark:divide-white/10">
          {tops.map((c) => (
            <div key={c.id}>
              <Item c={c} />
              {repliesOf(c.id).map((r) => (
                <Item key={r.id} c={r} isReply />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

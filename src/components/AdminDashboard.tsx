"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { displayName } from "@/lib/displayName";

type Report = {
  id: string;
  targetType: "chapter" | "comment";
  targetId: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string };
  target: {
    kind: "chapter" | "comment";
    preview: string;
    link: string | null;
    deleted: boolean;
    offender: { id: string; username: string } | null;
  };
  reportCount?: number;
};

type StatusFilter = "pending" | "resolved" | "rejected";
type Tab = "reports" | "users" | "restore" | "config";

type DeletedNovel = {
  id: string;
  title: string;
  deletedAt: string;
  author: { username: string; nickname: string | null };
};
type DeletedChapter = {
  id: string;
  title: string;
  chapterNum: number;
  deletedAt: string;
  novel: { id: string; title: string };
};

type UserInfo = {
  id: string;
  username: string;
  nickname: string | null;
  discordId: string;
  banned: boolean;
  banReason: string | null;
  role: string;
  createdAt: string;
  _count: { novels: number; comments: number };
};

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("reports");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // 유저 탭
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  // 복구 탭
  const [deletedNovels, setDeletedNovels] = useState<DeletedNovel[]>([]);
  const [deletedChapters, setDeletedChapters] = useState<DeletedChapter[]>([]);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // 설정 탭
  const [globalWebhook, setGlobalWebhook] = useState("");
  const [configLoading, setConfigLoading] = useState(false);
  const [configMsg, setConfigMsg] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${status}`);
    if (res.ok) {
      const d = (await res.json()) as { reports: Report[] };
      setReports(d.reports);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    if (tab === "reports") loadReports();
  }, [loadReports, tab]);

  const loadUsers = async (q?: string) => {
    setUserLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q || "")}`);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
    }
    setUserLoading(false);
  };

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab]);

  const setReportStatus = async (id: string, s: StatusFilter) => {
    setBusy(id);
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    setBusy(null);
    loadReports();
  };

  const deleteTarget = async (r: Report) => {
    if (!confirm("이 콘텐츠를 삭제(숨김)할까요?")) return;
    setBusy(r.id);
    const url =
      r.targetType === "chapter"
        ? `/api/chapters/${r.targetId}`
        : `/api/comments/${r.targetId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      await setReportStatus(r.id, "resolved");
    } else {
      alert(await res.text());
      setBusy(null);
    }
  };

  const restoreTarget = async (r: Report) => {
    if (!confirm("이 콘텐츠를 재게시할까요?")) return;
    setBusy(r.id);
    const url =
      r.targetType === "chapter"
        ? `/api/chapters/${r.targetId}`
        : `/api/comments/${r.targetId}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restore: true }),
    });
    setBusy(null);
    if (res.ok) loadReports();
    else alert(await res.text());
  };

  const banUser = async (userId: string, username: string, reason?: string) => {
    const r = reason ?? window.prompt(`${username} 차단 사유:`, "");
    if (r === null) return;
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true, banReason: r }),
    });
    if (res.ok) {
      alert("차단됨");
      if (tab === "users") loadUsers(userSearch);
      else loadReports();
    } else alert(await res.text());
  };

  const unbanUser = async (userId: string) => {
    const res = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: false }),
    });
    if (res.ok) {
      alert("차단 해제됨");
      if (tab === "users") loadUsers(userSearch);
      else loadReports();
    } else alert(await res.text());
  };

  const loadDeleted = async () => {
    setRestoreLoading(true);
    const res = await fetch("/api/admin/restore");
    if (res.ok) {
      const d = await res.json();
      setDeletedNovels(d.novels);
      setDeletedChapters(d.chapters);
    }
    setRestoreLoading(false);
  };

  useEffect(() => {
    if (tab === "restore") loadDeleted();
  }, [tab]);

  const loadConfig = async () => {
    setConfigLoading(true);
    const res = await fetch("/api/admin/config");
    if (res.ok) {
      const d = await res.json();
      setGlobalWebhook(d.globalWebhookUrl ?? "");
    }
    setConfigLoading(false);
  };
  const saveConfig = async () => {
    setConfigMsg("");
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ globalWebhookUrl: globalWebhook }),
    });
    if (res.ok) setConfigMsg("저장됨");
    else setConfigMsg(await res.text());
  };
  const testConfig = async () => {
    setConfigMsg("전송 중…");
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ globalWebhookUrl: globalWebhook, test: true }),
    });
    if (res.ok) setConfigMsg("✅ 테스트 전송 성공 — 디스코드를 확인하세요.");
    else setConfigMsg(await res.text());
  };
  useEffect(() => {
    if (tab === "config") loadConfig();
  }, [tab]);

  const restoreItem = async (type: "novel" | "chapter", id: string) => {
    if (!confirm("이 항목을 복구할까요?")) return;
    setBusy(id);
    const res = await fetch("/api/admin/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    setBusy(null);
    if (res.ok) loadDeleted();
    else alert(await res.text());
  };

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "대기" },
    { key: "resolved", label: "처리됨" },
    { key: "rejected", label: "반려" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">관리자</h1>

      {/* 메인 탭 */}
      <div className="flex gap-2 border-b border-black/10">
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === "reports" ? "border-indigo-600 font-semibold" : "border-transparent text-gray-500"}`}
        >
          신고 관리
        </button>
        <button
          onClick={() => setTab("users")}
          className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === "users" ? "border-indigo-600 font-semibold" : "border-transparent text-gray-500"}`}
        >
          유저 관리
        </button>
        <button
          onClick={() => setTab("restore")}
          className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === "restore" ? "border-indigo-600 font-semibold" : "border-transparent text-gray-500"}`}
        >
          삭제 복구
        </button>
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-2 text-sm -mb-px border-b-2 ${tab === "config" ? "border-indigo-600 font-semibold" : "border-transparent text-gray-500"}`}
        >
          설정
        </button>
      </div>

      {/* ─── 신고 탭 ─── */}
      {tab === "reports" && (
        <>
          <div className="rounded-lg border border-black/10 dark:border-white/10 px-4 py-3 text-xs text-gray-500 dark:text-gray-400 space-y-1 leading-relaxed">
            <p className="font-medium text-gray-700 dark:text-gray-300">ℹ️ 신고 처리 안내</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li><strong>신고 3건 이상</strong> 누적 시 해당 글·댓글은 <strong>자동 숨김</strong> 처리됩니다 (복구 가능).</li>
              <li>작성자 차단은 자동으로 되지 않습니다. 악의적 신고 도배일 수 있으니 내용을 직접 확인 후 &ldquo;작성자 차단&rdquo;을 눌러주세요.</li>
              <li>정당한 신고가 아니면 &ldquo;반려&rdquo;, 처리했으면 &ldquo;처리 완료&rdquo;를 눌러 목록을 정리하세요.</li>
            </ul>
          </div>
          <div className="flex gap-1 border-b border-black/10">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${
                  status === f.key ? "border-indigo-600 font-semibold" : "border-transparent text-gray-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">불러오는 중…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-gray-400">해당 상태의 신고가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-black/5">
                      {r.targetType === "chapter" ? "글" : "댓글"}
                    </span>
                    <span>신고자: <strong>{r.reporter.username}</strong></span>
                    <span>·</span>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                    {r.target.deleted && <span className="text-red-500">(숨김/삭제됨)</span>}
                    {r.reportCount && r.reportCount >= 3 && (
                      <span className="text-orange-600 font-semibold">⚠ 신고 {r.reportCount}건</span>
                    )}
                  </div>

                  <div className="text-sm">
                    <p>
                      대상:{" "}
                      {r.target.link ? (
                        <Link href={r.target.link} className="underline" target="_blank">
                          {r.target.preview}
                        </Link>
                      ) : (
                        r.target.preview
                      )}
                    </p>
                    <p className="text-red-600 mt-1">사유: {r.reason}</p>
                    {r.target.offender && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        작성자: {r.target.offender.username}
                      </p>
                    )}
                  </div>

                  {r.status === "pending" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        disabled={busy === r.id || r.target.deleted}
                        onClick={() => deleteTarget(r)}
                        className="text-sm px-3 py-1 rounded-md bg-red-600 text-white disabled:opacity-40"
                      >
                        숨김 처리
                      </button>
                      {r.target.deleted && (
                        <button
                          disabled={busy === r.id}
                          onClick={() => restoreTarget(r)}
                          className="text-sm px-3 py-1 rounded-md bg-green-600 text-white disabled:opacity-40"
                        >
                          재게시
                        </button>
                      )}
                      {r.target.offender && (
                        <button
                          disabled={busy === r.id}
                          onClick={() => banUser(r.target.offender!.id, r.target.offender!.username, r.reason)}
                          className="text-sm px-3 py-1 rounded-md bg-orange-600 text-white disabled:opacity-40"
                        >
                          작성자 차단
                        </button>
                      )}
                      <button
                        disabled={busy === r.id}
                        onClick={() => setReportStatus(r.id, "resolved")}
                        className="text-sm px-3 py-1 rounded-md border"
                      >
                        처리 완료
                      </button>
                      <button
                        disabled={busy === r.id}
                        onClick={() => setReportStatus(r.id, "rejected")}
                        className="text-sm px-3 py-1 rounded-md border text-gray-500"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ─── 유저 탭 ─── */}
      {tab === "users" && (
        <>
          <div className="flex gap-2 items-center">
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUsers(userSearch)}
              placeholder="유저명 검색"
              className="flex-1 border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={() => loadUsers(userSearch)}
              className="px-3 py-2 text-sm bg-indigo-600 text-white rounded"
            >
              검색
            </button>
          </div>

          {userLoading ? (
            <p className="text-sm text-gray-400">불러오는 중…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400">유저가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u.id} className="border rounded-lg p-3 flex items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{displayName(u)}</span>
                      {u.nickname && (
                        <span className="text-xs text-gray-400">({u.username})</span>
                      )}
                      {u.role === "ADMIN" && (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded">관리자</span>
                      )}
                      {u.banned && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded">차단됨</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      가입: {new Date(u.createdAt).toLocaleDateString()} · 소설 {u._count.novels}편 · 댓글 {u._count.comments}개
                    </p>
                    {u.banned && u.banReason && (
                      <p className="text-xs text-red-500">차단 사유: {u.banReason}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {u.role !== "ADMIN" && (
                      <>
                        {u.banned ? (
                          <button
                            onClick={() => unbanUser(u.id)}
                            className="text-xs px-2 py-1 rounded bg-green-600 text-white"
                          >
                            차단 해제
                          </button>
                        ) : (
                          <button
                            onClick={() => banUser(u.id, displayName(u))}
                            className="text-xs px-2 py-1 rounded bg-orange-600 text-white"
                          >
                            차단
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ─── 복구 탭 ─── */}
      {tab === "restore" && (
        <>
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-medium">ℹ️ 삭제 복구 안내</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs leading-relaxed">
              <li>작가가 삭제한 글·회차는 즉시 사라지지 않고 여기에 보관됩니다.</li>
              <li><strong>삭제 후 7일이 지나면 매일 자동으로 영구 삭제</strong>되며, 첨부 이미지도 함께 지워져 복구가 불가능해집니다.</li>
              <li>복구가 필요하면 7일 안에 아래 목록에서 &ldquo;복구&rdquo;를 눌러주세요.</li>
            </ul>
          </div>
          {restoreLoading ? (
            <p className="text-sm text-gray-400">불러오는 중…</p>
          ) : deletedNovels.length === 0 && deletedChapters.length === 0 ? (
            <p className="text-sm text-gray-400">삭제된 항목이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {deletedNovels.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-2">삭제된 소설</h2>
                  <ul className="space-y-2">
                    {deletedNovels.map((n) => (
                      <li key={n.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{n.title}</p>
                          <p className="text-xs text-gray-500">
                            작가: {displayName(n.author)} · 삭제: {new Date(n.deletedAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          disabled={busy === n.id}
                          onClick={() => restoreItem("novel", n.id)}
                          className="text-xs px-3 py-1 rounded bg-green-600 text-white disabled:opacity-40"
                        >
                          복구
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {deletedChapters.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-gray-500 mb-2">삭제된 회차</h2>
                  <ul className="space-y-2">
                    {deletedChapters.map((c) => (
                      <li key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            <Link href={`/novel/${c.novel.id}`} className="text-gray-400 hover:underline mr-1">
                              {c.novel.title}
                            </Link>
                            {c.chapterNum}화 — {c.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            삭제: {new Date(c.deletedAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          disabled={busy === c.id}
                          onClick={() => restoreItem("chapter", c.id)}
                          className="text-xs px-3 py-1 rounded bg-green-600 text-white disabled:opacity-40"
                        >
                          복구
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── 설정 탭 ─── */}
      {tab === "config" && (
        <div className="space-y-4">
          {configLoading ? (
            <p className="text-sm text-gray-400">로딩 중…</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium block">전체 알림 웹후크</label>
                <input
                  value={globalWebhook}
                  onChange={(e) => { setGlobalWebhook(e.target.value); setConfigMsg(""); }}
                  placeholder="https://discord.com/api/webhooks/...?thread_id=..."
                  className="w-full border rounded-md px-3 py-2 bg-transparent text-sm"
                />
                <p className="text-xs text-gray-400 leading-relaxed">
                  새 회차가 올라오면 이 웹후크로도 알림이 발송됩니다. (개인 웹후크와 별도)
                  <br />포럼 채널의 특정 토론에 보내려면 URL 뒤에 <strong>?thread_id=스레드ID</strong>를 붙이세요.
                  <br />비워두면 전체 알림을 보내지 않습니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveConfig}
                  className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm"
                >
                  저장
                </button>
                <button
                  onClick={testConfig}
                  className="px-4 py-2 rounded-md border text-sm"
                >
                  테스트 전송
                </button>
              </div>
              {configMsg && (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap border rounded-md px-3 py-2 bg-black/[0.02] dark:bg-white/[0.03]">
                  {configMsg}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

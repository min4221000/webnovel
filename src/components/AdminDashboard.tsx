"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
};

type StatusFilter = "pending" | "resolved" | "rejected";

export default function AdminDashboard() {
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reports?status=${status}`);
    if (res.ok) {
      const d = (await res.json()) as { reports: Report[] };
      setReports(d.reports);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const setReportStatus = async (id: string, s: StatusFilter) => {
    setBusy(id);
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    setBusy(null);
    load();
  };

  const deleteTarget = async (r: Report) => {
    if (!confirm("이 콘텐츠를 삭제할까요? (소프트 삭제)")) return;
    setBusy(r.id);
    const url =
      r.targetType === "chapter"
        ? `/api/chapters/${r.targetId}`
        : `/api/comments/${r.targetId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      await fetch(`/api/admin/reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      load();
    } else {
      alert(await res.text());
      setBusy(null);
    }
  };

  const banUser = async (r: Report) => {
    if (!r.target.offender) return;
    const reason = window.prompt(
      `${r.target.offender.username} 님을 차단합니다. 사유:`,
      r.reason,
    );
    if (reason === null) return;
    setBusy(r.id);
    const res = await fetch(`/api/admin/users/${r.target.offender.id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true, banReason: reason }),
    });
    setBusy(null);
    if (res.ok) {
      alert("차단되었습니다.");
      load();
    } else {
      alert(await res.text());
    }
  };

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "pending", label: "대기" },
    { key: "resolved", label: "처리됨" },
    { key: "rejected", label: "반려" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">관리자 — 신고 처리</h1>

      <div className="flex gap-1 border-b border-black/10 dark:border-white/10">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${
              status === f.key
                ? "border-indigo-600 font-semibold"
                : "border-transparent text-gray-500"
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
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                  {r.targetType === "chapter" ? "글" : "댓글"}
                </span>
                <span>신고자 {r.reporter.username}</span>
                <span>·</span>
                <span>{new Date(r.createdAt).toLocaleString()}</span>
                {r.target.deleted && <span className="text-red-500">(이미 삭제됨)</span>}
              </div>

              <div className="text-sm">
                <p className="text-gray-700 dark:text-gray-200">
                  대상:{" "}
                  {r.target.link ? (
                    <Link href={r.target.link} className="underline" target="_blank">
                      {r.target.preview}
                    </Link>
                  ) : (
                    r.target.preview
                  )}
                </p>
                <p className="text-red-600 dark:text-red-400 mt-1">사유: {r.reason}</p>
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
                    콘텐츠 삭제
                  </button>
                  <button
                    disabled={busy === r.id || !r.target.offender}
                    onClick={() => banUser(r)}
                    className="text-sm px-3 py-1 rounded-md bg-orange-600 text-white disabled:opacity-40"
                  >
                    작성자 차단
                  </button>
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
    </div>
  );
}

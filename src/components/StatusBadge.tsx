const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ongoing: { label: "연재중", cls: "bg-indigo-50 text-indigo-600 ring-indigo-600/20" },
  completed: { label: "완결", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  hiatus: { label: "휴재", cls: "bg-slate-100 text-slate-500 ring-slate-400/20" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.ongoing;
  return (
    <span className={`ml-2 align-middle text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
}

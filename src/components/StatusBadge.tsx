const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ongoing: { label: "연재중", cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  completed: { label: "완결", cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  hiatus: { label: "휴재", cls: "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.ongoing;
  return (
    <span className={`ml-2 align-middle text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

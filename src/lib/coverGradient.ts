const GRADIENTS = [
  "bg-gradient-to-br from-indigo-600 to-violet-600",
  "bg-gradient-to-br from-sky-500 to-indigo-600",
  "bg-gradient-to-br from-rose-500 to-violet-600",
  "bg-gradient-to-br from-emerald-600 to-sky-500",
];

export function coverGradientFor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

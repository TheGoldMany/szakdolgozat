import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Relatív idő magyarul (pl. "5 perce", "3 órája", "2 napja"). */
export function timeAgo(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1)  return "most";
  if (diffMin < 60) return `${diffMin} perce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH} órája`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD} napja`;
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" });
}

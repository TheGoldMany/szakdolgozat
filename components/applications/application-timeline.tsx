import { FileText, Clock, CheckCircle2, XCircle, Flag, Ban, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  status:     string;
  createdAt:  string;        // ISO
  reviewedAt: string | null; // ISO
}

type NodeState = "done" | "current" | "upcoming";
interface TimelineNode {
  label: string;
  date:  string | null;
  hint?: string;
  state: NodeState;
  tone:  "brand" | "green" | "red" | "gray";
  icon:  LucideIcon;
}

const NODE_BG: Record<TimelineNode["tone"], string> = {
  brand: "bg-brand-500 text-white",
  green: "bg-green-500 text-white",
  red:   "bg-red-500 text-white",
  gray:  "bg-gray-200 text-gray-400",
};

function fmt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Az örökbefogadási kérelem állapotát mutató lépéssor a felhasználónak:
 * Beküldve → Feldolgozás alatt → Döntés (Jóváhagyva/Elutasítva).
 * Visszavont kérelemnek külön záró állapot.
 */
export function ApplicationTimeline({ status, createdAt, reviewedAt }: Props) {
  const invited   = status === "INVITED";
  const withdrawn = status === "WITHDRAWN";
  const approved  = status === "APPROVED";
  const rejected  = status === "REJECTED";
  const decided   = approved || rejected;

  let nodes: TimelineNode[];

  if (withdrawn) {
    nodes = [
      { label: "Kérelem beküldve", date: fmt(createdAt),  state: "done",    tone: "brand", icon: FileText },
      { label: "Visszavonva",      date: fmt(reviewedAt), state: "current", tone: "gray",  icon: Ban },
    ];
  } else {
    nodes = [
      {
        label: invited ? "Meghívva jelentkezésre" : "Kérelem beküldve",
        date:  fmt(createdAt),
        state: "done",
        tone:  "brand",
        icon:  FileText,
      },
      {
        label: "Feldolgozás alatt",
        date:  null,
        hint:  decided ? undefined : "A menhely hamarosan elbírálja a kérelmedet.",
        state: decided ? "done" : "current",
        tone:  "brand",
        icon:  Clock,
      },
      decided
        ? approved
          ? { label: "Jóváhagyva", date: fmt(reviewedAt), state: "current", tone: "green", icon: CheckCircle2 }
          : { label: "Elutasítva", date: fmt(reviewedAt), state: "current", tone: "red",   icon: XCircle }
        : { label: "Döntés", date: null, state: "upcoming", tone: "gray", icon: Flag },
    ];
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">A kérelem állapota</h2>
      <ol className="relative border-l border-gray-200 pl-6">
        {nodes.map((n, i) => {
          const Icon = n.icon;
          return (
            <li key={i} className="mb-6 last:mb-0">
              <span
                className={cn(
                  "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white",
                  n.state === "upcoming" ? NODE_BG.gray : NODE_BG[n.tone],
                )}
              >
                <Icon className="h-3 w-3" />
              </span>
              <p className={cn("text-sm font-semibold", n.state === "upcoming" ? "text-gray-400" : "text-gray-800")}>
                {n.label}
              </p>
              {n.date && <time className="text-xs text-gray-400">{n.date}</time>}
              {n.hint && <p className="mt-0.5 text-xs text-gray-400">{n.hint}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

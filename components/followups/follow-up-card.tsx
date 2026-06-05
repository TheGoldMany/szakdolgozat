"use client";

import { useState } from "react";
import { Star, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUp {
  id:          string;
  scheduledAt: string;
  completedAt: string | null;
  wellbeing:   number | null;
  notes:       string | null;
  photoUrl:    string | null;
  status:      "PENDING" | "COMPLETED" | "OVERDUE";
  application: {
    animal: {
      name:    string;
      slug:    string;
      images:  { url: string }[];
      shelter: { name: string; slug: string };
    };
  };
}

interface Props {
  followUp:  FollowUp;
  onUpdate:  (id: string, data: { wellbeing: number; notes?: string; photoUrl?: string }) => Promise<void>;
}

const STATUS_CONFIG = {
  COMPLETED: { label: "Kitöltve",    color: "text-green-600  bg-green-50",  icon: CheckCircle },
  PENDING:   { label: "Esedékes",    color: "text-blue-600   bg-blue-50",   icon: Clock },
  OVERDUE:   { label: "Késésben",    color: "text-red-600    bg-red-50",    icon: AlertCircle },
};

export function FollowUpCard({ followUp, onUpdate }: Props) {
  const [open,       setOpen]       = useState(false);
  const [wellbeing,  setWellbeing]  = useState(0);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const cfg = STATUS_CONFIG[followUp.status];
  const Icon = cfg.icon;

  const scheduledLabel = new Date(followUp.scheduledAt).toLocaleDateString("hu-HU", {
    year: "numeric", month: "long", day: "numeric",
  });

  const weekOffset = Math.round(
    (new Date(followUp.scheduledAt).getTime() - new Date(followUp.application.animal.slug ? 0 : 0).getTime()) / 86_400_000
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wellbeing) { setError("Kérjük adj értékelést!"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onUpdate(followUp.id, { wellbeing, notes: notes || undefined });
      setOpen(false);
    } catch {
      setError("Hiba történt a küldés során.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn(
      "rounded-2xl border bg-white shadow-sm overflow-hidden",
      followUp.status === "OVERDUE" ? "border-red-100" : "border-gray-100"
    )}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        {/* Animal image */}
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {followUp.application.animal.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={followUp.application.animal.images[0].url}
              alt={followUp.application.animal.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">?</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{followUp.application.animal.name}</p>
          <p className="text-xs text-gray-400">{followUp.application.animal.shelter.name}</p>
          <p className="mt-0.5 text-xs text-gray-500">{scheduledLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", cfg.color)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </span>

          {followUp.status !== "COMPLETED" && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Completed view */}
      {followUp.status === "COMPLETED" && followUp.wellbeing && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3">
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn("h-4 w-4", s <= followUp.wellbeing! ? "fill-amber-400 text-amber-400" : "text-gray-200")}
              />
            ))}
            <span className="ml-1 text-sm text-gray-500">{followUp.wellbeing}/5</span>
          </div>
          {followUp.notes && <p className="text-sm text-gray-600 whitespace-pre-line">{followUp.notes}</p>}
        </div>
      )}

      {/* Submission form */}
      {open && followUp.status !== "COMPLETED" && (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 p-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Hogyan érzi magát {followUp.application.animal.name}?
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWellbeing(s)}
                  className="transition-transform hover:scale-110"
                >
                  <Star className={cn(
                    "h-8 w-8",
                    s <= wellbeing ? "fill-amber-400 text-amber-400" : "text-gray-200 hover:text-amber-200"
                  )} />
                </button>
              ))}
              {wellbeing > 0 && (
                <span className="ml-2 self-center text-sm text-gray-500">
                  {["", "Nehezen alkalmazkodik", "Kicsit bizonytalan", "Jól van", "Nagyon jól", "Kiváló!"][wellbeing]}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Megjegyzés <span className="text-gray-400 font-normal">(opcionális)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Hogyan illeszkedett be az új otthonba? Van-e valami, amiben segítségre lenne szükség?"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Mégsem
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? "Küldés..." : "Visszajelzés küldése"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

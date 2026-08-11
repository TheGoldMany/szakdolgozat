"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2, MapPin, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export interface PendingShelter {
  id:        string;
  name:      string;
  slug:      string;
  city:      string;
  address:   string | null;
  email:     string | null;
  phone:     string | null;
  createdAt: string;
}

/**
 * Hitelesítésre váró menhelyek a jóváhagyási központban.
 * A hitelesítés a meglévő admin végpontot hívja (isVerified = true).
 */
export function ShelterApprovals({ shelters: initial }: { shelters: PendingShelter[] }) {
  const router = useRouter();
  const [shelters, setShelters] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function verify(id: string) {
    setBusy(id);
    try {
      const res  = await fetch(`/api/admin/shelters/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isVerified: true }),
      });
      if (res.ok) {
        setShelters((prev) => prev.filter((s) => s.id !== id));
        toast.success("Menhely hitelesítve.");
        router.refresh();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "A hitelesítés sikertelen.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (shelters.length === 0) {
    return <p className="rounded-2xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
      Nincs hitelesítésre váró menhely.
    </p>;
  }

  return (
    <div className="space-y-3">
      {shelters.map((s) => (
        <div key={s.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{s.name}</p>
              <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {s.city}{s.address ? `, ${s.address}` : ""}
                </p>
                {s.email && <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" />{s.email}</p>}
                {s.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" />{s.phone}</p>}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                Regisztrálva: {new Date(s.createdAt).toLocaleDateString("hu-HU")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`/shelters/${s.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Megtekintés
              </a>
              <button
                onClick={() => verify(s.id)}
                disabled={busy === s.id}
                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                {busy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
                Hitelesítés
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

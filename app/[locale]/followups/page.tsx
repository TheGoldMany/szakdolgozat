"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { FollowUpCard } from "@/components/followups/follow-up-card";

interface FollowUp {
  id:          string;
  scheduledAt: string;
  completedAt: string | null;
  wellbeing:   number | null;
  notes:       string | null;
  photoUrl:    string | null;
  status:      "PENDING" | "COMPLETED" | "OVERDUE";
  application: {
    id:     string;
    animal: {
      name:    string;
      slug:    string;
      images:  { url: string }[];
      shelter: { name: string; slug: string };
    };
  };
}

export default function FollowUpsPage() {
  const t = useTranslations("followups");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/followups");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/followups")
      .then((r) => r.json())
      .then((data) => setFollowUps(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  async function handleUpdate(id: string, data: { wellbeing: number; notes?: string; photoUrl?: string }) {
    const res = await fetch(`/api/followups/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Hiba");
    }
    setFollowUps((prev) =>
      prev.map((f) => f.id === id ? { ...f, status: "COMPLETED" as const, wellbeing: data.wellbeing, notes: data.notes ?? null, completedAt: new Date().toISOString() } : f)
    );
  }

  const pending   = followUps.filter((f) => f.status === "PENDING");
  const overdue   = followUps.filter((f) => f.status === "OVERDUE");
  const completed = followUps.filter((f) => f.status === "COMPLETED");

  const stats = [
    { label: t("statCompleted"), value: completed.length, icon: CheckCircle,  color: "text-green-600" },
    { label: t("statPending"),   value: pending.length,   icon: Clock,        color: "text-blue-600"  },
    { label: t("statOverdue"),   value: overdue.length,   icon: AlertCircle,  color: "text-red-600"   },
  ];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-sm text-gray-500">{t("subtitle")}</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && followUps.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm">
              <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : followUps.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-500">{t("empty")}</p>
          <p className="mt-1 text-sm text-gray-400">{t("emptyDesc")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overdue first */}
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
                <AlertCircle className="h-4 w-4" /> {t("sectionOverdue")} ({overdue.length})
              </h2>
              <div className="space-y-3">
                {overdue.map((f) => (
                  <FollowUpCard key={f.id} followUp={f} onUpdate={handleUpdate} />
                ))}
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                <Clock className="h-4 w-4" /> {t("sectionPending")} ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((f) => (
                  <FollowUpCard key={f.id} followUp={f} onUpdate={handleUpdate} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-600">
                <CheckCircle className="h-4 w-4" /> {t("sectionCompleted")} ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((f) => (
                  <FollowUpCard key={f.id} followUp={f} onUpdate={handleUpdate} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

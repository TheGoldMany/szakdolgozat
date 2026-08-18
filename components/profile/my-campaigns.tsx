import { Link } from "@/i18n/navigation";
import { PlusCircle, ExternalLink } from "lucide-react";
import { CampaignStatus } from "@prisma/client";

const STATUS_LABEL: Record<CampaignStatus, { label: string; color: string }> = {
  PENDING:   { label: "Jóváhagyásra vár", color: "bg-yellow-50 text-yellow-700" },
  ACTIVE:    { label: "Aktív",             color: "bg-green-50 text-green-700" },
  REJECTED:  { label: "Elutasítva",        color: "bg-red-50 text-red-600" },
  COMPLETED: { label: "Lezárt",            color: "bg-gray-100 text-gray-500" },
};

export interface MyCampaign {
  id:           string;
  title:        string;
  status:       CampaignStatus;
  targetAmount: number;
  shelter:      { name: string } | null;
  _count:       { donations: number };
  donations:    { amount: number }[];
}

/**
 * A bejelentkezett felhasználó saját gyűjtései – állapottal, haladással és
 * az összegyűlt összeggel. A profil oldalon és a profil-admin oldalon is ez fut.
 */
export function MyCampaigns({ campaigns }: { campaigns: MyCampaign[] }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Gyűjtéseim</h2>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Új gyűjtés
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">Még nincs gyűjtésed.</p>
          <Link href="/campaigns/new" className="mt-2 inline-block text-sm font-medium text-brand-500 hover:underline">
            Indíts egyet most
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => {
            const raised = c.donations.reduce((s, d) => s + d.amount, 0);
            const pct    = Math.min(100, Math.round((raised / c.targetAmount) * 100));
            const st     = STATUS_LABEL[c.status];
            return (
              <li key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold text-gray-900">{c.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.color}`}>{st.label}</span>
                    </div>
                    {c.shelter && <p className="mb-2 text-xs text-gray-400">{c.shelter.name}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{raised.toLocaleString("hu-HU")} / {c.targetAmount.toLocaleString("hu-HU")} Ft</span>
                      <span>·</span>
                      <span>{c._count.donations} adomány</span>
                    </div>
                    {c.status === "ACTIVE" && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  {c.status === "ACTIVE" && (
                    <Link
                      href={`/donate/${c.id}`}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Megtekintés
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

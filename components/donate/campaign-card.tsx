import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { CalendarDays, Users } from "lucide-react";

interface CampaignCardProps {
  campaign: {
    id: string;
    title: string;
    imageUrl: string | null;
    targetAmount: number;
    raisedAmount: number;
    endsAt: string | null;
    user: { name: string | null };
    shelter: { name: string; slug: string } | null;
    _count: { donations: number };
  };
}

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const pct = Math.min(
    Math.round((campaign.raisedAmount / campaign.targetAmount) * 100),
    100
  );

  const endsAt = campaign.endsAt ? new Date(campaign.endsAt) : null;
  const endsAtFormatted = endsAt
    ? endsAt.toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })
    : null;

  return (
    <Link
      href={`/donate/${campaign.id}`}
      className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden"
    >
      {/* Image / gradient placeholder */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600">
        {campaign.imageUrl && (
          <Image
            src={campaign.imageUrl}
            alt={campaign.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {/* Percent badge */}
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-brand-600 shadow-sm">
          {pct}% összegyűlt
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 gap-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {campaign.title}
        </h3>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span className="font-medium text-brand-600">{formatHUF(campaign.raisedAmount)}</span>
            <span>{formatHUF(campaign.targetAmount)}</span>
          </div>
        </div>

        {/* Meta */}
        <div className="mt-auto space-y-1 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{campaign._count.donations} adományozó</span>
            {campaign.shelter && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-gray-500">{campaign.shelter.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span>Indította: {campaign.user.name ?? "Névtelen"}</span>
          </div>
          {endsAtFormatted && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>Lejár: {endsAtFormatted}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

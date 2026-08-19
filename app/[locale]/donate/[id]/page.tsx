import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { CalendarDays, Users, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DonateForm } from "@/components/donate/donate-form";
import { ShareButton } from "@/components/ui/share-button";
import { getTranslations } from "next-intl/server";

function formatHUF(amount: number) {
  return new Intl.NumberFormat("hu-HU").format(amount) + " Ft";
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const t = await getTranslations("donate");
  const campaign = await prisma.campaign.findUnique({
    where:  { id: params.id },
    select: { title: true, description: true, imageUrl: true },
  });
  if (!campaign) return { title: t("notFound") };

  const description = campaign.description?.slice(0, 160) ?? campaign.title;
  const image       = campaign.imageUrl ?? undefined;

  return {
    title: campaign.title,
    description,
    openGraph: {
      title: campaign.title, description, type: "article",
      ...(image ? { images: [{ url: image, alt: campaign.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: campaign.title, description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const t = await getTranslations("donate");
  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      user:    { select: { name: true } },
      shelter: { select: { id: true, name: true, slug: true, city: true } },
      donations: {
        where:   { paidAt: { not: null } },
        orderBy: { paidAt: "desc" },
        take: 10,
        select: {
          id:          true,
          amount:      true,
          message:     true,
          isAnonymous: true,
          paidAt:      true,
          user:        { select: { name: true } },
        },
      },
    },
  });

  if (!campaign) notFound();

  const pct = Math.min(
    Math.round((campaign.raisedAmount / campaign.targetAmount) * 100),
    100
  );

  const endsAt = campaign.endsAt
    ? campaign.endsAt.toLocaleDateString("hu-HU", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Campaign image / gradient header */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-brand-400 to-brand-700 sm:h-72">
        {campaign.imageUrl && (
          <Image
            src={campaign.imageUrl}
            alt={campaign.title}
            fill
            className="object-cover opacity-80"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Main content */}
          <div className="space-y-6 lg:col-span-2">

            {/* Header */}
            <div>
              <nav className="mb-2 flex items-center gap-1 text-xs text-gray-400">
                <Link href="/donate" className="hover:text-brand-500 transition-colors">{t("donateNow")}</Link>
                <span>›</span>
                <span className="text-gray-600 truncate max-w-[200px]">{campaign.title}</span>
              </nav>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{campaign.title}</h1>
                <ShareButton url={`/donate/${campaign.id}`} title={`${campaign.title} – ÁllatiMenhelyek.hu`} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {/* Menhelyhez kötött gyűjtésnél a MENHELY az indító, nem az az
                    admin, aki véletlenül létrehozta – az adomány is a menhely
                    Stripe fiókjára fut. A létrehozó személy megmarad az
                    adatbázisban, de nyilvánosan félrevezető lenne. */}
                {campaign.shelter ? (
                  <span className="flex items-center gap-1">
                    {t("startedByShelter")}
                    <Link
                      href={`/shelters/${campaign.shelter.slug}`}
                      className="flex items-center gap-1 font-medium text-brand-600 hover:underline"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {campaign.shelter.name}
                    </Link>
                  </span>
                ) : (
                  <span>{t("startedBy", { name: campaign.user?.name ?? t("anonymous") })}</span>
                )}
                {endsAt && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {t("expiresOn", { date: endsAt })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">{t("aboutCampaign")}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {campaign.description}
              </p>
            </div>

            {/* Recent donations */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                {t("recentDonations")}
              </h2>
              {campaign.donations.length === 0 ? (
                <p className="text-sm text-gray-400">{t("noDonationsYet")}</p>
              ) : (
                <ul className="divide-y divide-gray-50 space-y-0">
                  {campaign.donations.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {d.isAnonymous ? t("anonymousDonor") : (d.user?.name ?? t("anonymous"))}
                        </p>
                        {d.message && (
                          <p className="mt-0.5 text-xs italic text-gray-500 line-clamp-2">
                            "{d.message}"
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-brand-600">
                        {formatHUF(d.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Progress card – az állandó gyűjtésnek nincs célösszege, ott csak
                az eddig összegyűlt összeg jelenik meg, haladásjelző nélkül. */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-1 flex items-end justify-between">
                <span className="text-2xl font-bold text-brand-600">{formatHUF(campaign.raisedAmount)}</span>
                {!campaign.isGeneral && (
                  <span className="text-sm text-gray-400">/ {formatHUF(campaign.targetAmount)}</span>
                )}
              </div>
              {campaign.isGeneral ? (
                <p className="mt-1 text-sm text-gray-500">{t("generalOngoing")}</p>
              ) : (
                <>
                  <div className="my-3 h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-brand-600">{t("percentCollected", { pct })}</p>
                </>
              )}
              {campaign.donations.length > 0 && (
                <p className="mt-1 text-xs text-gray-400">{t("donorsPlus", { count: campaign.donations.length })}</p>
              )}
            </div>

            {/* Donate form */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">{t("donateNow")}</h2>
              <DonateForm campaignId={campaign.id} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

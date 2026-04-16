import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CampaignCard } from "@/components/donate/campaign-card";
import { TierCard } from "@/components/donate/tier-card";
import { Heart, PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Adományozás" };

export default async function DonatePage() {
  const [campaigns, shelters] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "ACTIVE" },
      include: {
        user:    { select: { name: true } },
        shelter: { select: { name: true, slug: true } },
        _count:  { select: { donations: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.shelter.findMany({
      where: {
        isActive: true,
        tiers: { some: { isActive: true } },
      },
      select: {
        id:   true,
        name: true,
        slug: true,
        tiers: {
          where: { isActive: true },
          include: { _count: { select: { subscriptions: true } } },
        },
      },
      take: 10,
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 py-16 px-4 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <Heart className="mx-auto mb-4 h-10 w-10 opacity-90" />
          <h1 className="text-3xl font-bold sm:text-4xl">Támogass egy menhelyet</h1>
          <p className="mt-3 text-base text-brand-100 sm:text-lg">
            Egyedi adománnyal vagy havi előfizetéssel segítsd a rászoruló állatokat.
            Minden forint számít!
          </p>
          <Link
            href="/campaigns/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow hover:bg-brand-50 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Saját gyűjtés indítása
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 space-y-14">

        {/* Active campaigns */}
        <section>
          <h2 className="mb-5 text-xl font-bold text-gray-900">Aktív gyűjtések</h2>
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <Heart className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">Jelenleg nincs aktív gyűjtés.</p>
              <Link
                href="/campaigns/new"
                className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Indíts egyet!
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {campaigns.map((c) => (
                <CampaignCard
                  key={c.id}
                  campaign={{
                    ...c,
                    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Monthly subscriptions */}
        {shelters.length > 0 && (
          <section>
            <h2 className="mb-5 text-xl font-bold text-gray-900">Havi előfizetések</h2>
            <div className="space-y-8">
              {shelters.map((shelter) => (
                <div key={shelter.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-800">{shelter.name}</h3>
                    <Link
                      href={`/shelters/${shelter.slug}`}
                      className="text-xs text-brand-500 hover:underline"
                    >
                      Menhely oldala →
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {shelter.tiers.map((tier) => (
                      <TierCard key={tier.id} tier={tier}
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

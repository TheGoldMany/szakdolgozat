import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { PageInfo } from "@/components/dashboard/page-info";
import { prisma } from "@/lib/prisma";
import { ShelterSettingsForm } from "@/components/dashboard/shelter-settings-form";
import { resolveActingShelter } from "@/lib/acting-shelter";

export const metadata: Metadata = { title: "Menhely beállítások" };

export default async function ShelterSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const t = await getTranslations("dashboard");

  const acting    = await resolveActingShelter(session.user.id, session.user.role);
  const shelterId = acting.shelterId;

  const shelter = shelterId
    ? await prisma.shelter.findUnique({
        where:  { id: shelterId },
        select: {
          id:                      true,
          name:                    true,
          slug:                    true,
          logoUrl:                 true,
          adoptionRequirements:    true,
          capacity:                true,
          city:                    true,
          address:                 true,
          lat:                     true,
          lng:                     true,
          companyName:             true,
          taxNumber:               true,
          bankAccountName:         true,
          bankAccountNumber:       true,
          stripeAccountId:         true,
          stripeOnboardingComplete: true,
          documents:               { orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  if (!shelter) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        {acting.canSwitch
          ? "Válassz menhelyt a bal oldali „Kezelt menhely” választóval a beállítások szerkesztéséhez."
          : t("settingsNoShelter")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t("settingsTitle")}</h1>
            <PageInfo page="settings" />
          </div>
          <p className="mt-1 text-sm text-gray-500">{shelter.name}</p>
        </div>
        <a
          href={`/shelters/${shelter.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        >
          <ExternalLink className="h-4 w-4" />
          {t("settingsPublicPage")}
        </a>
      </div>
      <ShelterSettingsForm shelter={shelter} />
    </div>
  );
}

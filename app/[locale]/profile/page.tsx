import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { SubscriptionsList } from "@/components/profile/subscriptions-list";
import { SponsorshipsList } from "@/components/profile/sponsorships-list";
import { ProfileReports } from "@/components/profile/profile-reports";
import { DeleteAccountButton } from "@/components/profile/delete-account-button";
import { EmailNotificationsToggle } from "@/components/profile/email-notifications-toggle";
import { DownloadDataButton } from "@/components/profile/download-data-button";
import { StripeConnectSection } from "@/components/profile/stripe-connect-section";
import { MyCampaigns } from "@/components/profile/my-campaigns";
import { PawPrint } from "lucide-react";
import { Role } from "@prisma/client";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const t = await getTranslations("profile");

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/login?callbackUrl=/profile");
  }

  const [user, adoptedApps, userReports, myCampaigns] = await Promise.all([
    prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id:                 true,
      name:               true,
      email:              true,
      image:              true,
      phone:              true,
      address:            true,
      city:               true,
      role:               true,
      password:           true,
      emailNotifications: true,
      stripeAccountId:          true,
      stripeOnboardingComplete: true,
      createdAt:          true,
      _count: { select: { applications: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          status:      true,
          createdAt:   true,
          cancelledAt: true,
          tier: {
            select: {
              name:    true,
              amount:  true,
              shelter: { select: { name: true, slug: true } },
            },
          },
        },
      },
      sponsorships: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          status:      true,
          amount:      true,
          isPublic:    true,
          createdAt:   true,
          cancelledAt: true,
          animal:      { select: { name: true, slug: true } },
        },
      },
    },
  }),
    prisma.adoptionApplication.findMany({
      where:   { userId: session.user.id, status: "APPROVED" },
      orderBy: { reviewedAt: "desc" },
      select: {
        id:         true,
        reviewedAt: true,
        animal: {
          select: {
            name: true, slug: true, type: true, adoptedAt: true,
            images:  { where: { isPrimary: true }, take: 1, select: { url: true } },
            shelter: { select: { name: true } },
          },
        },
      },
    }),
    prisma.animalReport.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:       true,
        type:     true,
        status:   true,
        name:     true,
        breed:    true,
        imageUrl: true,
        city:     true,
        createdAt: true,
        _count: {
          select: {
            matchesA: { where: { dismissed: false } },
            matchesB: { where: { dismissed: false } },
          },
        },
      },
    }),
    // Saját gyűjtések (bármely felhasználó indíthat)
    prisma.campaign.findMany({
      where:   { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:           true,
        title:        true,
        status:       true,
        targetAmount: true,
        shelter:      { select: { name: true } },
        _count:       { select: { donations: true } },
        donations: {
          where:  { paidAt: { not: null } },
          select: { amount: true },
        },
      },
    }),
  ]);

  if (!user) redirect("/auth/login");

  const ROLE_LABELS: Record<Role, string> = {
    USER:          t("roleUser"),
    SHELTER_ADMIN: t("roleShelterAdmin"),
    SUPER_ADMIN:   t("roleSuperAdmin"),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">

        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
          <AvatarUpload currentImage={user.image} name={user.name} />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl text-gray-900">{user.name ?? t("title")}</h1>
            <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Account info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("accountInfo")}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("email")}</span>
                <span className="font-medium text-gray-800">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("role")}</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("registration")}</span>
                <span className="text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString("hu-HU", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t("applications")}</span>
                <Link href="/applications" className="font-medium text-brand-500 hover:underline">
                  {t("applicationsCount", { count: user._count.applications })}
                </Link>
              </div>
            </div>
          </div>

          {/* Personal data */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("personalData")}</h2>
            <ProfileForm user={user} />
          </div>

          {/* Change password – only for password-based accounts */}
          {user.password && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("changePassword")}</h2>
              <ChangePasswordForm />
            </div>
          )}

          {/* Stripe fiók kezelése */}
          <StripeConnectSection
            stripeAccountId={user.stripeAccountId}
            stripeOnboardingComplete={user.stripeOnboardingComplete}
          />

          {/* Saját gyűjtések */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <MyCampaigns campaigns={myCampaigns} />
          </div>

          {/* Subscriptions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("mySubscriptions")}</h2>
            <SubscriptionsList
              subscriptions={user.subscriptions.map((s) => ({
                ...s,
                createdAt:   s.createdAt.toISOString(),
                cancelledAt: s.cancelledAt?.toISOString() ?? null,
              }))}
            />
          </div>

          {/* Virtual adoptions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("mySponsorships")}</h2>
            <SponsorshipsList
              sponsorships={user.sponsorships.map((s) => ({
                ...s,
                createdAt:   s.createdAt.toISOString(),
                cancelledAt: s.cancelledAt?.toISOString() ?? null,
              }))}
            />
          </div>

          {/* Adoption history */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("adoptionHistory")}</h2>
            {adoptedApps.length === 0 ? (
              <p className="text-sm text-gray-400">{t("noAdoptions")}</p>
            ) : (
              <ul className="space-y-3">
                {adoptedApps.map((app) => {
                  const img = app.animal.images[0];
                  const date = app.animal.adoptedAt ?? app.reviewedAt;
                  return (
                    <li key={app.id}>
                      <Link
                        href={`/animals/${app.animal.slug}`}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.url} alt={app.animal.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center"><PawPrint className="h-5 w-5 text-gray-300" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{app.animal.name}</p>
                          <p className="truncate text-xs text-gray-400">{app.animal.shelter.name}</p>
                        </div>
                        {date && (
                          <span className="shrink-0 text-xs text-gray-400">
                            {t("adoptedOn")}{" "}
                            {new Date(date).toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* My reports */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("myReports")}</h2>
            <ProfileReports
              reports={userReports.map((r) => ({
                id:         r.id,
                type:       r.type,
                status:     r.status,
                name:       r.name,
                breed:      r.breed,
                imageUrl:   r.imageUrl,
                city:       r.city,
                createdAt:  r.createdAt.toISOString(),
                matchCount: r._count.matchesA + r._count.matchesB,
              }))}
            />
          </div>

          {/* Notification preferences */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("notificationSettings")}</h2>
            <EmailNotificationsToggle enabled={user.emailNotifications} />
          </div>

          {/* GDPR data portability */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-gray-700">{t("myData")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("myDataDesc")}</p>
            <DownloadDataButton />
          </div>

          {/* Danger zone – account deletion */}
          <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-red-700">{t("dangerZone")}</h2>
            <p className="mb-4 text-xs text-gray-500">{t("deleteAccountDesc")}</p>
            <DeleteAccountButton />
          </div>

        </div>
      </div>
    </div>
  );
}

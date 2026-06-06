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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id:        true,
      name:      true,
      email:     true,
      image:     true,
      phone:     true,
      address:   true,
      city:      true,
      role:      true,
      password:  true,
      createdAt: true,
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
  });

  if (!user) redirect("/auth/login");

  const ROLE_LABELS: Record<Role, string> = {
    USER:          t("roleUser"),
    SHELTER_ADMIN: t("roleShelterAdmin"),
    SUPER_ADMIN:   t("roleSuperAdmin"),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
          <AvatarUpload currentImage={user.image} name={user.name} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name ?? t("title")}</h1>
            <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Account info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("personalData")}</h2>
            <ProfileForm user={user} />
          </div>

          {/* Change password – only for password-based accounts */}
          {user.password && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("changePassword")}</h2>
              <ChangePasswordForm />
            </div>
          )}

          {/* Subscriptions */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">{t("mySponsorships")}</h2>
            <SponsorshipsList
              sponsorships={user.sponsorships.map((s) => ({
                ...s,
                createdAt:   s.createdAt.toISOString(),
                cancelledAt: s.cancelledAt?.toISOString() ?? null,
              }))}
            />
          </div>

        </div>
      </div>
    </div>
  );
}

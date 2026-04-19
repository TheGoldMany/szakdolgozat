import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { SubscriptionsList } from "@/components/profile/subscriptions-list";
import { Role } from "@prisma/client";

export const metadata: Metadata = { title: "Profilom" };

const ROLE_LABELS: Record<Role, string> = {
  USER:          "Felhasználó",
  SHELTER_ADMIN: "Menhely admin",
  SUPER_ADMIN:   "Főadmin",
};

export default async function ProfilePage() {
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
    },
  });

  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
          <AvatarUpload currentImage={user.image} name={user.name} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name ?? "Profilom"}</h1>
            <p className="mt-0.5 text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-6">

          {/* Fiók info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Fiók adatok</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">E-mail</span>
                <span className="font-medium text-gray-800">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Szerepkör</span>
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Regisztráció</span>
                <span className="text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString("hu-HU", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Kérelmek</span>
                <Link href="/applications" className="font-medium text-brand-500 hover:underline">
                  {user._count.applications} kérelem →
                </Link>
              </div>
            </div>
          </div>

          {/* Profil szerkesztés */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Személyes adatok</h2>
            <ProfileForm user={user} />
          </div>

          {/* Jelszó csere – csak jelszavas fiókoknál */}
          {user.password && (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">Jelszó módosítása</h2>
              <ChangePasswordForm />
            </div>
          )}

          {/* Előfizetések */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Előfizetéseim</h2>
            <SubscriptionsList
              subscriptions={user.subscriptions.map((s) => ({
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

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ShelterSettingsForm } from "@/components/dashboard/shelter-settings-form";

export const metadata: Metadata = { title: "Menhely beállítások" };

export default async function ShelterSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const adminRecord = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    include: {
      shelter: {
        select: {
          id:                      true,
          name:                    true,
          logoUrl:                 true,
          adoptionRequirements:    true,
          companyName:             true,
          taxNumber:               true,
          bankAccountName:         true,
          bankAccountNumber:       true,
          stripeAccountId:         true,
          stripeOnboardingComplete: true,
          documents:               { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!adminRecord?.shelter) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Nincs hozzárendelt menhelyed.
      </div>
    );
  }

  const { shelter } = adminRecord;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Menhely beállítások</h1>
        <p className="mt-1 text-sm text-gray-500">{shelter.name}</p>
      </div>
      <ShelterSettingsForm shelter={shelter} />
    </div>
  );
}

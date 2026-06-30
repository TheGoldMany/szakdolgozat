import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewCampaignForm } from "@/components/donate/new-campaign-form";

export const metadata: Metadata = { title: "Új gyűjtés indítása" };

export default async function NewCampaignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/campaigns/new");

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { stripeOnboardingComplete: true },
  });
  const stripeConnected = user?.stripeOnboardingComplete ?? false;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Saját gyűjtés indítása</h1>
        <p className="mb-8 text-sm text-gray-500">
          Töltsd ki az alábbi mezőket. A gyűjtésed admin jóváhagyás után kerül nyilvánosságra.
        </p>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <NewCampaignForm stripeConnected={stripeConnected} />
        </div>
      </div>
    </div>
  );
}

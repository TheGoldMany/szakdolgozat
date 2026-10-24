import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { Megaphone } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportsManager } from "@/components/dashboard/reports-manager";

export const metadata: Metadata = { title: "Bejelentések" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/reports");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const reports = await prisma.animalReport.findMany({
    orderBy: { createdAt: "desc" },
    take:    1000,
    select: {
      id: true, type: true, status: true, animalType: true,
      name: true, breed: true, color: true, gender: true, description: true,
      city: true, address: true, lat: true, lng: true,
      contactName: true, contactPhone: true, contactEmail: true,
      imageUrl: true, createdAt: true,
      images: { orderBy: [{ isPrimary: "desc" }, { order: "asc" }], take: 1, select: { url: true } },
      _count: { select: { images: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Bejelentések</h1>
          <span className="text-sm font-normal text-gray-400">({reports.length})</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Az összes elveszett, talált és kóbor állat bejelentése. Szerkesztheted vagy törölheted őket.
        </p>
      </div>

      <ReportsManager
        initial={reports.map((r) => ({
          ...r,
          thumb:      r.images[0]?.url ?? r.imageUrl,
          imageCount: r._count.images,
          createdAt:  r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}

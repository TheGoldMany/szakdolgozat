import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Stethoscope } from "lucide-react";
import { VetsManager } from "@/components/dashboard/vets-manager";

export const metadata: Metadata = { title: "Állatorvosok" };
export const dynamic = "force-dynamic";

export default async function VetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/vets");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const vets = await prisma.vetClinic.findMany({
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Állatorvosi rendelők</h1>
          <span className="text-sm font-normal text-gray-400">({vets.length})</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          A felvett rendelők a nyilvános térképen jelennek meg, saját jelölővel.
        </p>
      </div>

      <VetsManager initial={vets} />
    </div>
  );
}

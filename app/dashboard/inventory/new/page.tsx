import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";

export const metadata: Metadata = { title: "Új készlettétel" };

export default async function NewInventoryItemPage({
  searchParams,
}: {
  searchParams: { shelterId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  const t = await getTranslations("dashboard");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  let shelterId = searchParams.shelterId ?? "";

  if (!shelterId && !isSuperAdmin) {
    const admin = await prisma.shelterAdmin.findFirst({ where: { userId: session.user.id } });
    shelterId = admin?.shelterId ?? "";
  }

  // For super admin: show shelter picker if shelterId not provided
  let shelters: { id: string; name: string }[] = [];
  if (isSuperAdmin && !shelterId) {
    shelters = await prisma.shelter.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link
        href="/dashboard/inventory"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("inventoryDetailBack")}
      </Link>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h1 className="mb-5 text-lg font-bold text-gray-900">{t("inventoryNewTitle")}</h1>

        {isSuperAdmin && !shelterId && shelters.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t("inventoryNewSelectShelter")}</p>
            <ul className="space-y-2">
              {shelters.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/inventory/new?shelterId=${s.id}`}
                    className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : shelterId ? (
          <InventoryItemForm shelterId={shelterId} />
        ) : (
          <p className="text-sm text-gray-400">{t("inventoryNewNoShelter")}</p>
        )}
      </div>
    </div>
  );
}

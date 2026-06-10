import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { FormBuilder } from "@/components/dashboard/form-builder";

export const metadata: Metadata = { title: "Új kérvény sablon" };

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/forms/new");
  if (session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  const t = await getTranslations("dashboard");

  const DEFAULT_FIELDS = [
    { label: t("formNewDefaultMotivation"), type: "TEXTAREA" as const, required: true,  order: 0 },
    { label: t("formNewDefaultHomeType"),   type: "TEXT"     as const, required: true,  order: 1 },
    { label: t("formNewDefaultGarden"),     type: "TEXT"     as const, required: false, order: 2 },
    { label: t("formNewDefaultChildren"),   type: "TEXT"     as const, required: false, order: 3 },
    { label: t("formNewDefaultPets"),       type: "TEXT"     as const, required: false, order: 4 },
    { label: t("formNewDefaultExperience"), type: "TEXTAREA" as const, required: false, order: 5 },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("formNewPageTitle")}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {t("formNewPageDesc")}
      </p>
      <FormBuilder initialFields={DEFAULT_FIELDS} />
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FormBuilder } from "@/components/dashboard/form-builder";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sablon szerkesztése" };

export default async function EditFormPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/forms");
  if (session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  const t = await getTranslations("dashboard");

  const shelterAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id },
    select: { shelterId: true },
  });
  if (!shelterAdmin) redirect("/dashboard");

  const form = await prisma.applicationForm.findUnique({
    where: { id: params.id },
    include: { fields: { orderBy: { order: "asc" } } },
  });

  if (!form || form.shelterId !== shelterAdmin.shelterId) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("formEditPageTitle")}</h1>
      <FormBuilder
        formId={form.id}
        initialTitle={form.title}
        initialDescription={form.description ?? ""}
        initialFields={form.fields.map((f) => ({
          id:       f.id,
          label:    f.label,
          type:     f.type as "TEXT" | "TEXTAREA" | "IMAGE" | "FILE",
          required: f.required,
          order:    f.order,
        }))}
        initialStatus={form.status}
      />
    </div>
  );
}

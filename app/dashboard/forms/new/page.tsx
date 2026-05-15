import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { FormBuilder } from "@/components/dashboard/form-builder";

export const metadata: Metadata = { title: "Új kérvény sablon" };

const DEFAULT_FIELDS = [
  { label: "Motiváció / Miért szeretnéd örökbefogadni?", type: "TEXTAREA" as const, required: true,  order: 0 },
  { label: "Lakástípus (ház / lakás / egyéb)",            type: "TEXT"     as const, required: true,  order: 1 },
  { label: "Van kert?",                                   type: "TEXT"     as const, required: false, order: 2 },
  { label: "Van gyermek a háztartásban?",                 type: "TEXT"     as const, required: false, order: 3 },
  { label: "Van más háziállat otthon?",                   type: "TEXT"     as const, required: false, order: 4 },
  { label: "Korábbi állattartási tapasztalat",            type: "TEXTAREA" as const, required: false, order: 5 },
];

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/forms/new");
  if (session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Új kérvény sablon</h1>
      <p className="mb-6 text-sm text-gray-500">
        Az alap mezők az örökbefogadási kérvény szokásos kérdéseit tartalmazzák. Átírhatod a feliratokat, törölhetsz mezőket, átrendezheted őket, vagy újakat adhatsz hozzá.
      </p>
      <FormBuilder initialFields={DEFAULT_FIELDS} />
    </div>
  );
}

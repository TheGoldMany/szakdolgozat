import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { FormBuilder } from "@/components/dashboard/form-builder";

export const metadata: Metadata = { title: "Új kérvény sablon" };

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard/forms/new");
  if (session.user.role !== "SHELTER_ADMIN") redirect("/dashboard");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Új kérvény sablon</h1>
      <FormBuilder />
    </div>
  );
}

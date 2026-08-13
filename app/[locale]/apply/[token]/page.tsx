import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PawPrint } from "lucide-react";
import { ApplicationFormFiller } from "@/components/apply/application-form-filler";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Örökbefogadási kérvény" };
}

interface FormField {
  id:       string;
  label:    string;
  type:     "TEXT" | "TEXTAREA" | "IMAGE" | "FILE";
  required: boolean;
  order:    number;
}

interface ApplyData {
  animalName:      string;
  animalSlug:      string;
  animalImage:     string | null;
  formTitle:       string;
  formDescription: string | null;
  fields:          FormField[];
}

async function getApplyData(token: string): Promise<ApplyData | null> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${baseUrl}/api/apply/${token}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ApplyPage({ params }: { params: { token: string; locale: string } }) {
  const data = await getApplyData(params.token);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">

        {/* Animal info */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
          {data.animalImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.animalImage}
              alt={data.animalName}
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <PawPrint className="h-7 w-7 text-gray-300" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Örökbefogadási kérvény</p>
            <h1 className="text-xl font-bold text-gray-900">{data.animalName}</h1>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-900">{data.formTitle}</h2>
          {data.formDescription && (
            <p className="mb-5 text-sm text-gray-600">{data.formDescription}</p>
          )}
          {!data.formDescription && <div className="mb-5" />}

          {data.fields.length === 0 ? (
            <p className="text-sm text-gray-500">Ez a kérvény nem tartalmaz mezőket.</p>
          ) : (
            <ApplicationFormFiller
              token={params.token}
              fields={data.fields}
              animalSlug={data.animalSlug}
            />
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Sikeres adományozás" };

export default function DonateSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-10 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-500" />
        <h1 className="mt-5 text-2xl font-bold text-gray-900">
          Köszönjük az adományodat!
        </h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          Az adományod sikeresen megérkezett. Segítségeddel rengeteg állat életét
          könnyíted meg. Nagyon köszönjük!
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/donate"
            className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Vissza az adományozáshoz
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Főoldal
          </Link>
        </div>
      </div>
    </div>
  );
}

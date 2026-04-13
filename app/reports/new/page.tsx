import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/reports/report-form";

export const metadata: Metadata = { title: "Új bejelentés" };

export default function NewReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">

        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/reports" className="hover:text-brand-500">Bejelentések</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">Új bejelentés</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Új bejelentés</h1>
          <p className="mt-2 text-gray-500">
            Elveszett, megtalált vagy kóbor állat esetén töltsd ki az alábbi űrlapot.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <ReportForm />
        </div>
      </div>
    </div>
  );
}

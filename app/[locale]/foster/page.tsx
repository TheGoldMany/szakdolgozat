import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { Home, PawPrint } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ANIMAL_TYPE_LABELS, FOSTER_STATUS_LABELS, FOSTER_STATUS_COLORS } from "@/lib/foster";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ideiglenes befogadásaim" };
export const dynamic = "force-dynamic";

export default async function FosterPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login?callbackUrl=/foster");

  const profiles = await prisma.fosterProfile.findMany({
    where:   { userId: session.user.id },
    include: {
      shelter:         { select: { name: true, city: true, slug: true } },
      fosteredAnimals: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-2">
        <Home className="h-6 w-6 text-brand-500" />
        <h1 className="text-2xl font-bold text-gray-900">Ideiglenes befogadásaim</h1>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            Még nem jelentkeztél ideiglenes befogadónak.
          </p>
          <Link href="/shelters" className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline">
            Menhelyek böngészése →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map(p => (
            <div key={p.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/shelters/${p.shelter.slug}`}
                  className="font-bold text-gray-900 hover:text-brand-600">
                  {p.shelter.name}
                </Link>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${FOSTER_STATUS_COLORS[p.status]}`}>
                  {FOSTER_STATUS_LABELS[p.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400">{p.shelter.city}</p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>
                  <span className="font-medium">Preferált:</span>{" "}
                  {p.preferredTypes.length > 0
                    ? p.preferredTypes.map(t => ANIMAL_TYPE_LABELS[t]).join(", ")
                    : "bármi"}
                </span>
                {p.maxWeightKg != null && <span><span className="font-medium">Max súly:</span> {p.maxWeightKg} kg</span>}
              </div>

              {p.fosteredAnimals.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-50 pt-3">
                  <PawPrint className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium text-gray-500">Nálad lévő állatok:</span>
                  {p.fosteredAnimals.map(a => (
                    <Link key={a.id} href={`/animals/${a.slug}`}
                      className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 hover:bg-purple-100">
                      {a.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

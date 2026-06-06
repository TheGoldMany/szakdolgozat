"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Building2, MapPin, Phone, Mail, ExternalLink, BadgeCheck } from "lucide-react";
import { AddShelterForm } from "@/components/dashboard/add-shelter-form";
import { cn } from "@/lib/utils";
import { PageInfo } from "@/components/dashboard/page-info";

interface ShelterAdmin {
  user: { name: string | null; email: string };
}

interface Shelter {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  admins: ShelterAdmin[];
  _count: { animals: number };
}

export default function DashboardSheltersPage() {
  const [shelters, setShelters]     = useState<Shelter[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/shelters");
    if (res.ok) setShelters(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleClose() {
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Menhelyek</h1>
            <PageInfo page="shelters" />
          </div>
          <p className="mt-1 text-sm text-gray-500">{shelters.length} menhely a rendszerben</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Menhely hozzáadása
        </button>
      </div>

      {/* Hozzáadás panel */}
      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Új menhely létrehozása</h2>
          </div>
          <AddShelterForm onClose={handleClose} />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : shelters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">Még nincs menhely a rendszerben.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Első menhely hozzáadása
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Menhely</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">Admin fiók</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">Állatok</th>
                <th className="px-4 py-3 text-left">Státusz</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shelters.map((shelter) => (
                <tr key={shelter.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{shelter.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{shelter.city}
                      </span>
                      {shelter.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />{shelter.phone}
                        </span>
                      )}
                      {shelter.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />{shelter.email}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="hidden px-4 py-3 sm:table-cell">
                    {shelter.admins[0] ? (
                      <div>
                        <p className="font-medium text-gray-800">{shelter.admins[0].user.name ?? "–"}</p>
                        <p className="text-xs text-gray-400">{shelter.admins[0].user.email}</p>
                      </div>
                    ) : (
                      <span className="text-gray-300">Nincs admin</span>
                    )}
                  </td>

                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {shelter._count.animals}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        shelter.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {shelter.isActive ? "Aktív" : "Inaktív"}
                      </span>
                      {shelter.isVerified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <BadgeCheck className="h-3 w-3" /> Ellenőrzött
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Link
                      href={`/shelters/${shelter.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Megtekint
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

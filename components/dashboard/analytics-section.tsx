"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Uc01AdoptionsTrend } from "./stats/uc01-adoptions-trend";
import { Uc02CapacityPanel } from "./stats/uc02-capacity-panel";
import { Uc03ReportsPanel } from "./stats/uc03-reports-panel";
import { Uc04ReturnRate } from "./stats/uc04-return-rate";

interface Shelter { id: string; name: string }

interface AnalyticsData {
  uc01: {
    totalAdoptions: number;
    yoyGrowth: number | null;
    thisYearApps: number;
    lastYearApps: number;
    monthlyTrend: Array<{ month: string; label: string; DOG: number; CAT: number; RABBIT: number; BIRD: number; OTHER: number }>;
    bySpecies: Array<{ type: string; label: string; count: number }>;
  };
  uc02: {
    avgStayBySpecies: Array<{ type: string; label: string; avgDays: number }>;
    stayCategories: Array<{ label: string; days: string; count: number }>;
    shelterUtil: Array<{ shelterId: string; name: string; occupied: number; capacity: number | null; utilizationRate: number | null }>;
    avgUtilization: number | null;
  };
  uc03: {
    lostCount: number;
    foundCount: number;
    strayCount: number;
    matchRate: number;
    lostMinusFound: number;
    byReportType: Array<{ type: string; label: string; count: number }>;
    reportsByCity: Array<{ city: string; lost: number; found: number; stray: number; total: number }>;
  };
  uc04: {
    returnRate: number;
    yoyReturnRateChange: number | null;
    returnAnimals: number;
    uniqueAnimals: number;
    adoptionsByHomeType: Array<{ homeType: string; label: string; count: number }>;
    adoptionsByProfile: { withGarden: number; withChildren: number; withPets: number };
  };
}

interface Props {
  role: "SHELTER_ADMIN" | "SUPER_ADMIN";
  shelters: Shelter[];
}

export function AnalyticsSection({ role, shelters }: Props) {
  const isSuperAdmin = role === "SUPER_ADMIN";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(shelters.map((s) => s.id)));
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = isSuperAdmin && selectedIds.size > 0
        ? `?shelterIds=${[...selectedIds].join(",")}`
        : "";
      const res = await fetch(`/api/dashboard/analytics${params}`);
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hiba történt");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, selectedIds]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleShelter = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelectedIds(new Set(shelters.map((s) => s.id)));
  const selectNone = () => setSelectedIds(new Set());

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Analitika</h2>
          <p className="text-xs text-gray-400 mt-0.5">Power BI-alapú üzleti mutatók</p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Menhelyek ({selectedIds.size}/{shelters.length})
              {filterOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Frissít
          </button>
        </div>
      </div>

      {/* Shelter filter panel — super admin only */}
      {isSuperAdmin && filterOpen && (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={selectAll}
              className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              Összes
            </button>
            <button
              onClick={selectNone}
              className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Semmi
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {shelters.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleShelter(s.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                  selectedIds.has(s.id)
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className={loading ? "opacity-60 pointer-events-none" : ""}>
            <Uc01AdoptionsTrend {...data.uc01} />
          </div>
          <div className={loading ? "opacity-60 pointer-events-none" : ""}>
            <Uc02CapacityPanel {...data.uc02} />
          </div>
          <div className={loading ? "opacity-60 pointer-events-none" : ""}>
            <Uc03ReportsPanel {...data.uc03} />
          </div>
          <div className={loading ? "opacity-60 pointer-events-none" : ""}>
            <Uc04ReturnRate {...data.uc04} />
          </div>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400 text-sm">
          Nincs megjeleníthető adat
        </div>
      )}
    </div>
  );
}

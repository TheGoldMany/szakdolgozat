"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { MapReport, MapShelter } from "@/components/ui/animal-map";

const AnimalMap = dynamic(() => import("@/components/ui/animal-map"), { ssr: false });

const TYPE_OPTIONS = [
  { value: "",      label: "Mind",       color: "#6B7280" },
  { value: "LOST",  label: "Elveszett",  color: "#EF4444" },
  { value: "FOUND", label: "Megtalált",  color: "#22C55E" },
  { value: "STRAY", label: "Kóbor",      color: "#F97316" },
];

export default function MapView() {
  const [reports,  setReports]  = useState<MapReport[]>([]);
  const [shelters, setShelters] = useState<MapShelter[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [showReports,  setShowReports]  = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [typeFilter,   setTypeFilter]   = useState("");
  const [status, setStatus] = useState("ACTIVE");

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ status });
    fetch(`/api/map?${qs}`)
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); setShelters(d.shelters ?? []); })
      .finally(() => setLoading(false));
  }, [status]);

  const visibleReports  = typeFilter ? reports.filter(r => r.type === typeFilter) : reports;
  const lostCount  = reports.filter(r => r.type === "LOST").length;
  const foundCount = reports.filter(r => r.type === "FOUND").length;
  const strayCount = reports.filter(r => r.type === "STRAY").length;

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Térkép */}
      <div className="absolute inset-0">
        {!loading && (
          <AnimalMap
            reports={reports}
            shelters={shelters}
            showReports={showReports}
            showShelters={showShelters}
            typeFilter={typeFilter}
          />
        )}
        {loading && (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-sm text-gray-500">Adatok betöltése…</p>
            </div>
          </div>
        )}
      </div>

      {/* Vezérlőpanel – bal felső */}
      <div className="absolute left-3 top-3 z-[1000] w-64 rounded-2xl border border-gray-100 bg-white shadow-lg">
        {/* Fejléc */}
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">Térkép szűrők</h2>
        </div>

        <div className="space-y-3 p-4">
          {/* Státusz */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Státusz</p>
            <div className="flex gap-1.5">
              {[
                { v: "ACTIVE",   l: "Aktív"   },
                { v: "RESOLVED", l: "Megoldott" },
                { v: "ALL",      l: "Mind"    },
              ].map(o => (
                <button key={o.v}
                  onClick={() => setStatus(o.v)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                    status === o.v
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >{o.l}</button>
              ))}
            </div>
          </div>

          {/* Típus szűrő */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Bejelentés típusa</p>
            <div className="flex flex-col gap-1">
              {TYPE_OPTIONS.map(o => (
                <button key={o.value}
                  onClick={() => setTypeFilter(typeFilter === o.value ? "" : o.value)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    typeFilter === o.value
                      ? "bg-gray-100 font-semibold text-gray-900"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ background: o.color }} />
                  {o.label}
                  {o.value === "LOST"  && <span className="ml-auto text-xs text-gray-400">{lostCount}</span>}
                  {o.value === "FOUND" && <span className="ml-auto text-xs text-gray-400">{foundCount}</span>}
                  {o.value === "STRAY" && <span className="ml-auto text-xs text-gray-400">{strayCount}</span>}
                  {o.value === ""      && <span className="ml-auto text-xs text-gray-400">{reports.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Rétegek */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Megjelenítés</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={showReports}
                onChange={e => setShowReports(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500" />
              <span className="text-sm text-gray-700">Bejelentések</span>
              <span className="ml-auto text-xs text-gray-400">{visibleReports.length}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={showShelters}
                onChange={e => setShowShelters(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500" />
              <span className="text-sm text-gray-700">Menhelyek 🏠</span>
              <span className="ml-auto text-xs text-gray-400">{shelters.length}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Jelmagyarázat – jobb alsó */}
      <div className="absolute bottom-8 right-3 z-[1000] rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-lg">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">Jelmagyarázat</p>
        <div className="space-y-1">
          {[
            { color: "#EF4444", label: "Elveszett" },
            { color: "#22C55E", label: "Megtalált" },
            { color: "#F97316", label: "Kóbor"     },
            { color: "#2563EB", label: "Menhely 🏠" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm flex-shrink-0"
                style={{ background: item.color }} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Új bejelentés gomb */}
      <a
        href="/reports/new"
        className="absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-600"
      >
        + Új bejelentés
      </a>
    </div>
  );
}

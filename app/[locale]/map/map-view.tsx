"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import type { MapLabels, MapReport, MapShelter, MapVet } from "@/components/ui/animal-map";
import {
  SHELTER_COLOR, TYPE_COLOR, VET_COLOR, VET_EMERGENCY_COLOR,
} from "@/components/ui/map-colors";
import { glyphSvg, type MapGlyph } from "@/components/ui/map-icons";

const AnimalMap = dynamic(() => import("@/components/ui/animal-map"), { ssr: false });

/** Jelmagyarázat-korong: pontosan az az ikon, ami a térképen is látszik. */
function LegendDot({ color, glyph }: { color: string; glyph: MapGlyph }) {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: color }}
      dangerouslySetInnerHTML={{ __html: glyphSvg(glyph, 12) }}
    />
  );
}

export default function MapView() {
  const t       = useTranslations("map");
  const locale  = useLocale();

  const TYPE_OPTIONS = [
    { value: "",      label: t("allTypes"), color: "#6B7280"         },
    { value: "LOST",  label: t("lost"),     color: TYPE_COLOR.LOST   },
    { value: "FOUND", label: t("found"),    color: TYPE_COLOR.FOUND  },
    { value: "STRAY", label: t("stray"),    color: TYPE_COLOR.STRAY  },
  ];

  const [reports,  setReports]  = useState<MapReport[]>([]);
  const [shelters, setShelters] = useState<MapShelter[]>([]);
  const [vets,     setVets]     = useState<MapVet[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [showReports,  setShowReports]  = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showVets,     setShowVets]     = useState(true);
  const [typeFilter,   setTypeFilter]   = useState("");
  const [status,       setStatus]       = useState("ACTIVE");
  const [panelOpen,    setPanelOpen]    = useState(false);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ status });
    fetch(`/api/map?${qs}`)
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); setShelters(d.shelters ?? []); setVets(d.vets ?? []); })
      .finally(() => setLoading(false));
  }, [status]);

  // A jelölő-buborékok szövegei; memoizálva, hogy ne rajzoljuk újra minden rendernél.
  const labels: MapLabels = useMemo(() => ({
    lost:        t("lost"),
    found:       t("found"),
    stray:       t("stray"),
    animalDog:   t("animalDog"),
    animalCat:   t("animalCat"),
    animalOther: t("animalOther"),
    unknownAnimal: t("unknownAnimal"),
    shelterAnimals: (count: number) => t("shelterAnimals", { count }),
    shelterPage: t("shelterPage"),
    emergency:   t("emergency"),
    website:     t("website"),
  }), [t]);

  const visibleReports  = typeFilter ? reports.filter(r => r.type === typeFilter) : reports;
  const lostCount  = reports.filter(r => r.type === "LOST").length;
  const foundCount = reports.filter(r => r.type === "FOUND").length;
  const strayCount = reports.filter(r => r.type === "STRAY").length;

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* Map */}
      <div className="absolute inset-0">
        {!loading && (
          <AnimalMap
            reports={reports}
            shelters={shelters}
            showReports={showReports}
            vets={vets}
            showShelters={showShelters}
            showVets={showVets}
            typeFilter={typeFilter}
            labels={labels}
            locale={locale}
          />
        )}
        {loading && (
          <div className="flex h-full items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
              <p className="text-sm text-gray-500">{t("loading")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        className="absolute left-3 top-3 z-[1001] flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md md:hidden"
        aria-label={t("filters")}
      >
        {panelOpen ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
        {t("filters")}
      </button>

      {/* Control panel – top left */}
      <div className={`absolute left-3 top-3 z-[1000] w-64 rounded-2xl border border-gray-200 bg-white shadow-lg transition-transform md:translate-y-0 ${
        panelOpen ? "translate-y-12" : "hidden md:block"
      }`}>
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-bold text-gray-900">{t("filters")}</h2>
        </div>

        <div className="space-y-3 p-4">
          {/* Status */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("status")}</p>
            <div className="flex gap-1.5">
              {[
                { v: "ACTIVE",   l: t("statusActive")   },
                { v: "RESOLVED", l: t("statusResolved") },
                { v: "ALL",      l: t("statusAll")      },
              ].map(o => (
                <button key={o.v}
                  onClick={() => setStatus(o.v)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                    status === o.v
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >{o.l}</button>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("reportType")}</p>
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

          {/* Layers */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{t("layers")}</p>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={showReports}
                onChange={e => setShowReports(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500" />
              <span className="text-sm text-gray-700">{t("reportsLayer")}</span>
              <span className="ml-auto text-xs text-gray-400">{visibleReports.length}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={showShelters}
                onChange={e => setShowShelters(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500" />
              <span className="text-sm text-gray-700">{t("sheltersLayer")}</span>
              <span className="ml-auto text-xs text-gray-400">{shelters.length}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={showVets}
                onChange={e => setShowVets(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-500" />
              <span className="text-sm text-gray-700">{t("vetsLayer")}</span>
              <span className="ml-auto text-xs text-gray-400">{vets.length}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Legend – bottom right */}
      <div className="absolute bottom-8 right-3 z-[1000] rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">{t("legend")}</p>
        <div className="space-y-1.5">
          {([
            { color: TYPE_COLOR.LOST,        glyph: "DOG",           label: t("lost")      },
            { color: TYPE_COLOR.FOUND,       glyph: "CAT",           label: t("found")     },
            { color: TYPE_COLOR.STRAY,       glyph: "PAW",           label: t("stray")     },
            { color: SHELTER_COLOR,          glyph: "SHELTER",       label: t("shelter")   },
            { color: VET_COLOR,              glyph: "VET",           label: t("vet")       },
            { color: VET_EMERGENCY_COLOR,    glyph: "VET_EMERGENCY", label: t("emergency") },
          ] as { color: string; glyph: MapGlyph; label: string }[]).map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <LegendDot color={item.color} glyph={item.glyph} />
              <span className="text-xs text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 max-w-[9rem] border-t border-gray-100 pt-1.5 text-[10px] leading-snug text-gray-400">
          {t("legendHint")}
        </p>
      </div>

      {/* New report button */}
      <a
        href="/reports/new"
        className="absolute bottom-8 left-1/2 z-[1000] -translate-x-1/2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-600"
      >
        + {t("newReport")}
      </a>
    </div>
  );
}

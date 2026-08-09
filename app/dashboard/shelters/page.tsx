"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Building2, MapPin, Phone, Mail, ExternalLink,
  BadgeCheck, Power, Loader2, Trash2, AlertTriangle, Clock, MapPinned,
} from "lucide-react";
import { AddShelterForm } from "@/components/dashboard/add-shelter-form";
import { cn } from "@/lib/utils";
import { PageInfo } from "@/components/dashboard/page-info";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ShelterAdmin {
  user: { name: string | null; email: string };
}

interface Shelter {
  id:         string;
  name:       string;
  slug:       string;
  city:       string;
  address:    string;
  phone:      string | null;
  email:      string | null;
  isActive:   boolean;
  isVerified: boolean;
  createdAt:  string;
  admins:     ShelterAdmin[];
  _count:     { animals: number };
}

export default function DashboardSheltersPage() {
  const t = useTranslations("dashboard");
  const [shelters, setShelters]         = useState<Shelter[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [busy, setBusy]                 = useState<string | null>(null);
  const [geocoding, setGeocoding]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Shelter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/shelters");
    if (res.ok) setShelters(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (id: string, field: "isActive" | "isVerified", value: boolean) => {
    setBusy(`${id}:${field}`);
    try {
      const res = await fetch(`/api/admin/shelters/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setShelters((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
        if (field === "isActive") {
          toast.success(value ? t("shelterActivated") : t("shelterSuspended"));
        }
      } else {
        const json = await res.json();
        toast.error(json.error ?? t("shelterActionError"));
      }
    } finally {
      setBusy(null);
    }
  }, [t]);

  const deleteShelter = useCallback(async (shelter: Shelter) => {
    setConfirmDelete(null);
    setBusy(`${shelter.id}:delete`);
    try {
      const res = await fetch(`/api/admin/shelters/${shelter.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setShelters((prev) => prev.filter((s) => s.id !== shelter.id));
        toast.success(t("shelterDeleted"));
      } else {
        toast.error(json.error ?? t("shelterActionError"));
      }
    } finally {
      setBusy(null);
    }
  }, [t]);

  function handleClose() {
    setShowForm(false);
    load();
  }

  const geocode = useCallback(async (all: boolean) => {
    setGeocoding(true);
    try {
      const res  = await fetch("/api/admin/shelters/geocode", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ all }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.total === 0) {
          toast.success("Nincs feldolgozandó menhely.");
        } else {
          toast.success(`${json.updated} menhely koordinátája ${all ? "frissítve" : "pótolva"}${json.failed ? `, ${json.failed} sikertelen` : ""}.`);
        }
        load();
      } else {
        toast.error(json.error ?? "Hiba történt.");
      }
    } finally {
      setGeocoding(false);
    }
  }, [load]);

  const pending = shelters.filter((s) => s.isActive && !s.isVerified);

  return (
    <div className="space-y-6">
      {/* Fejléc */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{t("sheltersPageTitle")}</h1>
            <PageInfo page="shelters" />
          </div>
          <p className="mt-1 text-sm text-gray-500">{t("sheltersCountLabel", { count: shelters.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => geocode(false)}
            disabled={geocoding}
            title="Térképkoordináták pótlása a koordináta nélküli menhelyeknek"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
            Koordináták pótlása
          </button>
          <button
            onClick={() => geocode(true)}
            disabled={geocoding}
            title="Az összes menhely újra-geokódolása a pontos címük alapján (felülírja a jelenlegi koordinátákat)"
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
            Pontosítás cím alapján
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("sheltersAddButton")}
          </button>
        </div>
      </div>

      {/* Jóváhagyásra váró menhelyek bannere */}
      {!loading && pending.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {pending.length} menhely vár hitelesítésre
            </p>
            <p className="mt-0.5 text-xs text-blue-700">
              Önregisztrált menhelyek. Ellenőrizd az adataikat, majd a{" "}
              <BadgeCheck className="inline h-3.5 w-3.5" /> Hitelesítés gombbal hagyd jóvá őket.
            </p>
          </div>
        </div>
      )}

      {/* Hozzáadás panel */}
      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t("sheltersNewTitle")}</h2>
          </div>
          <AddShelterForm onClose={handleClose} />
        </div>
      )}

      {/* Törlés megerősítő dialóg */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{t("shelterDeleteTitle")}</h2>
            </div>
            <p className="mb-2 text-sm text-gray-600">
              {t("shelterDeleteConfirm", { name: confirmDelete.name })}
            </p>
            <p className="mb-6 text-xs text-red-600 font-medium">{t("shelterDeleteWarning")}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t("shelterDeleteCancel")}
              </button>
              <button
                onClick={() => deleteShelter(confirmDelete)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                {t("shelterDeleteConfirmBtn")}
              </button>
            </div>
          </div>
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
          <p className="mt-3 text-gray-500">{t("sheltersEmpty")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            {t("sheltersAddFirstButton")}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">{t("sheltersColName")}</th>
                <th className="hidden px-4 py-3 text-left sm:table-cell">{t("sheltersColAdmin")}</th>
                <th className="hidden px-4 py-3 text-left md:table-cell">{t("sheltersColAnimals")}</th>
                <th className="px-4 py-3 text-left">{t("sheltersColStatus")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shelters.map((shelter) => (
                <tr key={shelter.id} className={cn("transition-colors",
                  !shelter.isActive
                    ? "bg-amber-50/40 hover:bg-amber-50"
                    : !shelter.isVerified
                    ? "bg-blue-50/40 hover:bg-blue-50"
                    : "hover:bg-gray-50"
                )}>
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
                      <span className="text-gray-300">{t("sheltersNoAdmin")}</span>
                    )}
                  </td>

                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {shelter._count.animals}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {/* Felfüggesztés / Aktiválás */}
                      <button
                        onClick={() => toggle(shelter.id, "isActive", !shelter.isActive)}
                        disabled={!!busy}
                        title={shelter.isActive ? t("sheltersTooltipSuspend") : t("sheltersTooltipActivate")}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
                          shelter.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        )}
                      >
                        {busy === `${shelter.id}:isActive`
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Power className="h-3 w-3" />}
                        {shelter.isActive ? t("sheltersStatusActive") : t("sheltersStatusInactive")}
                      </button>

                      {/* Hitelesítés */}
                      <button
                        onClick={() => toggle(shelter.id, "isVerified", !shelter.isVerified)}
                        disabled={!!busy}
                        title={shelter.isVerified ? t("sheltersTooltipUnverify") : t("sheltersTooltipVerify")}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50",
                          shelter.isVerified
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "border border-dashed border-gray-300 bg-white text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        {busy === `${shelter.id}:isVerified`
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <BadgeCheck className="h-3 w-3" />}
                        {shelter.isVerified ? t("sheltersStatusVerified") : t("sheltersStatusUnverified")}
                      </button>

                      {/* Törlés – csak felfüggesztett menhelyen */}
                      {!shelter.isActive && (
                        <button
                          onClick={() => setConfirmDelete(shelter)}
                          disabled={!!busy}
                          title={t("shelterDeleteTitle")}
                          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {busy === `${shelter.id}:delete`
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />}
                          {t("shelterDeleteBtn")}
                        </button>
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
                      {t("sheltersViewButton")}
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

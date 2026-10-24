"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPinned } from "lucide-react";
import { toast } from "sonner";
import { LocationPicker } from "@/components/ui/location-picker";
import { Button } from "@/components/ui/button";

/**
 * A bejelentés térképes helyének pontosítása (a bejelentőnek és az adminnak).
 *
 * Ha a beírt utca az OpenStreetMapben más írásmóddal szerepel, a geokódoló
 * csak a település közepét találja meg. Ilyenkor a pötty kézzel a helyére
 * tehető. Csak a koordináta változik, a bejelentő által beírt cím marad.
 */
export function ReportLocationEditor({ reportId, lat, lng }: {
  reportId: string; lat: number | null; lng: number | null;
}) {
  const t = useTranslations("reports");
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [point, setPoint]   = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!point) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lat: point.lat, lng: point.lng }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("locationSaved"));
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("locationError"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-graphite transition-colors hover:border-brand-600 hover:text-brand-700">
        <MapPinned className="h-4 w-4" />
        {t("editLocation")}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-600">{t("editLocationHint")}</p>
      <LocationPicker lat={point?.lat} lng={point?.lng}
        onChange={({ lat: newLat, lng: newLng }) => setPoint({ lat: newLat, lng: newLng })} />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>{t("editLocationCancel")}</Button>
        <Button type="button" className="flex-1" onClick={save} loading={saving} disabled={!point}>{t("editLocationSave")}</Button>
      </div>
    </div>
  );
}

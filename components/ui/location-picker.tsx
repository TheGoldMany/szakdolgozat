"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr:     false,
  loading: () => <MapPlaceholder />,
});

/** A dinamikus import töltő állapota – külön komponens, hogy fordítható legyen. */
function MapPlaceholder() {
  const t = useTranslations("common");
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
      {t("mapLoading")}
    </div>
  );
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (data: { lat: number; lng: number; city: string; address: string }) => void;
}

export function LocationPicker({ lat, lng, onChange }: Props) {
  const t = useTranslations("common");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <MapPin className="h-4 w-4 text-gray-400" />
        {t("pickLocation")}
        <span className="text-xs font-normal text-gray-400">{t("pickLocationHint")}</span>
      </div>
      <LeafletMap lat={lat} lng={lng} onChange={onChange} />
      {lat && lng && (
        <p className="text-xs text-gray-400">
          {t("coordinates")}: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}

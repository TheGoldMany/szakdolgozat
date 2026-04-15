"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr:     false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400">
      Térkép betöltése...
    </div>
  ),
});

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (data: { lat: number; lng: number; city: string; address: string }) => void;
}

export function LocationPicker({ lat, lng, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        <MapPin className="h-4 w-4 text-gray-400" />
        Helyszín megjelölése térképen
        <span className="text-xs font-normal text-gray-400">(kattints a térképre)</span>
      </div>
      <LeafletMap lat={lat} lng={lng} onChange={onChange} />
      {lat && lng && (
        <p className="text-xs text-gray-400">
          Koordináták: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";

const StaticLeafletMap = dynamic(() => import("./static-leaflet-map"), {
  ssr:     false,
  loading: () => (
    <div className="h-[220px] animate-pulse rounded-xl bg-gray-100" />
  ),
});

interface Props { lat: number; lng: number }

export function StaticMap({ lat, lng }: Props) {
  return <StaticLeafletMap lat={lat} lng={lng} />;
}

"use client";

import dynamic from "next/dynamic";

const StaticLeafletMap = dynamic(() => import("./static-leaflet-map"), {
  ssr:     false,
  loading: () => (
    <div className="h-[220px] animate-pulse rounded-xl bg-gray-100" />
  ),
});

interface Props {
  lat: number;
  lng: number;
  /** Bejelentés típusa és állatfaja – ettől lesz a jelölő ugyanaz, mint a térképen. */
  type?: string;
  animalType?: string;
}

export function StaticMap({ lat, lng, type, animalType }: Props) {
  return <StaticLeafletMap lat={lat} lng={lng} type={type} animalType={animalType} />;
}

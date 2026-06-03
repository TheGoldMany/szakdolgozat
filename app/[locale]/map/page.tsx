import type { Metadata } from "next";
import MapView from "./map-view";

export const metadata: Metadata = { title: "Térkép – Elveszett állatok & Menhelyek" };

export default function MapPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <MapView />
    </div>
  );
}

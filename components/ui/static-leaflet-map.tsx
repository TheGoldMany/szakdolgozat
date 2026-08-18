"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { glyphForAnimal, pinHtml } from "@/components/ui/map-icons";

/**
 * Egy pontot mutató, nem mozgatható térkép (pl. a bejelentés oldalán).
 *
 * A jelölő ugyanaz a csepp, mint a nagy térképen: a szín a bejelentés típusa,
 * az ikon az állatfaj. Így nem kell a Leaflet alapértelmezett jelölő-képeit
 * CDN-ről betölteni, és a két térkép jelölése egységes marad.
 */

const TYPE_COLOR: Record<string, string> = {
  LOST:  "#EF4444",
  FOUND: "#22C55E",
  STRAY: "#F97316",
};

interface Props {
  lat: number;
  lng: number;
  /** Bejelentés típusa (LOST/FOUND/STRAY) – a jelölő színét adja. */
  type?: string;
  /** Állatfaj (DOG/CAT/…) – a jelölőbe kerülő ikont adja. */
  animalType?: string;
}

export default function StaticLeafletMap({ lat, lng, type, animalType }: Props) {
  const icon = L.divIcon({
    className: "",
    html: pinHtml(TYPE_COLOR[type ?? ""] ?? "#6B7280", glyphForAnimal(animalType ?? ""), 34),
    iconSize:   [34, 34],
    iconAnchor: [17, 34],
  });

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: "220px", width: "100%", borderRadius: "12px", zIndex: 0 }}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      doubleClickZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}

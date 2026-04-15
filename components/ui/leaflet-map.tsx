"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons (broken in webpack)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (data: { lat: number; lng: number; city: string; address: string }) => void;
}

export default function LeafletMap({ lat, lng, onChange }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(
    lat && lng ? [lat, lng] : null
  );

  async function handleClick(clickLat: number, clickLng: number) {
    setPosition([clickLat, clickLng]);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json&accept-language=hu`,
        { headers: { "Accept-Language": "hu" } }
      );
      const data = await res.json();
      const city =
        data.address?.city ??
        data.address?.town ??
        data.address?.village ??
        data.address?.county ?? "";
      const road  = data.address?.road ?? "";
      const house = data.address?.house_number ?? "";
      const address = [road, house].filter(Boolean).join(" ");
      onChange({ lat: clickLat, lng: clickLng, city, address });
    } catch {
      onChange({ lat: clickLat, lng: clickLng, city: "", address: "" });
    }
  }

  return (
    <MapContainer
      center={position ?? [47.497913, 19.040236]}
      zoom={position ? 15 : 7}
      style={{ height: "280px", width: "100%", borderRadius: "12px", zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={handleClick} />
      {position && <Marker position={position} />}
    </MapContainer>
  );
}

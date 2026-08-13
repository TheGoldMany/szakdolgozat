"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapReport {
  id: string; type: string; animalType: string;
  name: string | null; breed: string | null; city: string;
  description: string; imageUrl: string | null;
  lat: number; lng: number; status: string;
  createdAt: string; contactPhone: string | null; contactName: string;
}
export interface MapShelter {
  id: string; name: string; city: string; address: string | null;
  phone: string | null; email: string | null; isVerified: boolean;
  logoUrl: string | null; lat: number; lng: number; slug: string;
  _count: { animals: number };
}

const TYPE_COLOR: Record<string, string> = {
  LOST:  "#EF4444",
  FOUND: "#22C55E",
  STRAY: "#F97316",
};
const TYPE_LABEL: Record<string, string> = {
  LOST: "Elveszett", FOUND: "Megtalált", STRAY: "Kóbor",
};
const ANIMAL_LABEL: Record<string, string> = {
  DOG: "Kutya", CAT: "Macska", OTHER: "Egyéb",
};

function makeReportIcon(type: string) {
  const color = TYPE_COLOR[type] ?? "#6B7280";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      transform:rotate(-45deg);
    "></div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 28],
    popupAnchor:[0, -30],
  });
}

const SHELTER_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;border-radius:8px;
    background:#2563EB;border:2px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
    font-size:16px;
  "></div>`,
  iconSize:   [32, 32],
  iconAnchor: [16, 16],
  popupAnchor:[0, -18],
});

interface Props {
  reports:  MapReport[];
  shelters: MapShelter[];
  showReports:  boolean;
  showShelters: boolean;
  typeFilter: string;
}

export default function AnimalMap({ reports, shelters, showReports, showShelters, typeFilter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const layerRef     = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current, {
      center: [47.497, 19.040],
      zoom:   7,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Re-render markers when filters change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    if (showReports) {
      const filtered = typeFilter ? reports.filter(r => r.type === typeFilter) : reports;
      filtered.forEach(r => {
        const marker = L.marker([r.lat, r.lng], { icon: makeReportIcon(r.type) });
        const img = r.imageUrl
          ? `<img src="${r.imageUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px" />`
          : "";
        marker.bindPopup(`
          ${img}
          <div style="min-width:160px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="background:${TYPE_COLOR[r.type]};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">
                ${TYPE_LABEL[r.type] ?? r.type}
              </span>
              <span style="font-size:11px;color:#6B7280">${ANIMAL_LABEL[r.animalType] ?? r.animalType}</span>
            </div>
            <div style="font-weight:700;font-size:14px;color:#111827">${r.name ?? "Ismeretlen"}</div>
            ${r.breed ? `<div style="font-size:12px;color:#6B7280">${r.breed}</div>` : ""}
            <div style="font-size:12px;color:#374151;margin-top:4px">${r.city}</div>
            ${r.contactPhone ? `<div style="font-size:12px;color:#2563EB;margin-top:4px">${r.contactName}: ${r.contactPhone}</div>` : ""}
            <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${new Date(r.createdAt).toLocaleDateString("hu-HU")}</div>
          </div>
        `);
        marker.addTo(layerRef.current!);
      });
    }

    if (showShelters) {
      shelters.forEach(s => {
        const marker = L.marker([s.lat, s.lng], { icon: SHELTER_ICON });
        marker.bindPopup(`
          <div style="min-width:160px">
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
              <span style="font-weight:700;font-size:14px;color:#111827">${s.name}</span>
              ${s.isVerified ? '<span style="color:#16A34A;font-size:11px">✓</span>' : ""}
            </div>
            <div style="font-size:12px;color:#6B7280">${s.city}${s.address ? `, ${s.address}` : ""}</div>
            <div style="font-size:12px;color:#2563EB;margin-top:2px">${s._count.animals} állat örökbefogadható</div>
            ${s.phone ? `<div style="font-size:12px;color:#374151;margin-top:2px">${s.phone}</div>` : ""}
            <a href="/shelters/${s.slug}" target="_blank"
              style="display:inline-block;margin-top:6px;font-size:12px;color:#2563EB;text-decoration:underline">
              Menhely oldala →
            </a>
          </div>
        `);
        marker.addTo(layerRef.current!);
      });
    }
  }, [reports, shelters, showReports, showShelters, typeFilter]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", zIndex: 0 }} />;
}

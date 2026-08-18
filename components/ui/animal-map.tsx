"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { badgeHtml, glyphForAnimal, glyphSvg, pinHtml, type MapGlyph } from "@/components/ui/map-icons";

export interface MapReport {
  id: string; type: string; animalType: string;
  name: string | null; breed: string | null; city: string;
  description: string; imageUrl: string | null;
  lat: number; lng: number; status: string;
  createdAt: string; contactPhone: string | null; contactName: string;
}
export interface MapVet {
  id: string; name: string; city: string; address: string;
  phone: string | null; website: string | null;
  openingHours: string | null; isEmergency: boolean;
  lat: number; lng: number;
}
export interface MapShelter {
  id: string; name: string; city: string; address: string | null;
  phone: string | null; email: string | null; isVerified: boolean;
  logoUrl: string | null; lat: number; lng: number; slug: string;
  _count: { animals: number };
}

/** A jelölő buborékok szövegei – a szülő adja át lefordítva. */
export interface MapLabels {
  lost: string; found: string; stray: string;
  animalDog: string; animalCat: string; animalOther: string;
  unknownAnimal: string;
  shelterAnimals: (count: number) => string;
  shelterPage: string;
  emergency: string;
  website: string;
}

export const TYPE_COLOR: Record<string, string> = {
  LOST:  "#EF4444",
  FOUND: "#22C55E",
  STRAY: "#F97316",
};
export const SHELTER_COLOR   = "#2563EB";
export const VET_COLOR       = "#7C3AED";
export const VET_EMERGENCY_COLOR = "#DC2626";

/** A popupokba felhasználói szöveg kerül – HTML-be illesztés előtt escape-elni kell. */
function esc(value: string | null | undefined): string {
  return String(value ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/**
 * Bejelentés-jelölő: csepp alak a bejelentés típusának színével, benne az
 * állatfaj ikonja. Így a szín azt mondja meg, ELVESZETT/MEGTALÁLT/KÓBOR-e,
 * az ikon pedig azt, hogy kutyáról vagy macskáról van szó.
 */
function makeReportIcon(type: string, animalType: string) {
  const color = TYPE_COLOR[type] ?? "#6B7280";
  return L.divIcon({
    className: "",
    html: pinHtml(color, glyphForAnimal(animalType), 34),
    iconSize:   [34, 34],
    iconAnchor: [17, 34],
    popupAnchor:[0, -34],
  });
}

/** Kerek/négyzetes jelölő ikonnal – menhelyhez és állatorvoshoz. */
function makeBadgeIcon(color: string, glyph: MapGlyph, radius: string, size: number) {
  return L.divIcon({
    className: "",
    html: badgeHtml(color, glyph, radius, size),
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2 + 2)],
  });
}

const SHELTER_ICON = makeBadgeIcon(SHELTER_COLOR, "SHELTER", "9px", 34);

function makeVetIcon(isEmergency: boolean) {
  return isEmergency
    ? makeBadgeIcon(VET_EMERGENCY_COLOR, "VET_EMERGENCY", "50%", 32)
    : makeBadgeIcon(VET_COLOR, "VET", "50%", 32);
}

interface Props {
  reports:  MapReport[];
  shelters: MapShelter[];
  vets:     MapVet[];
  showReports:  boolean;
  showShelters: boolean;
  showVets:     boolean;
  typeFilter: string;
  labels: MapLabels;
  locale: string;
}

export default function AnimalMap({
  reports, shelters, vets, showReports, showShelters, showVets, typeFilter, labels, locale,
}: Props) {
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

    const typeLabel   = (t: string) => ({ LOST: labels.lost, FOUND: labels.found, STRAY: labels.stray }[t] ?? t);
    const animalLabel = (a: string) =>
      ({ DOG: labels.animalDog, CAT: labels.animalCat, OTHER: labels.animalOther }[a] ?? a);

    if (showReports) {
      const filtered = typeFilter ? reports.filter(r => r.type === typeFilter) : reports;
      filtered.forEach(r => {
        const marker = L.marker([r.lat, r.lng], { icon: makeReportIcon(r.type, r.animalType) });
        const img = r.imageUrl
          ? `<img src="${esc(r.imageUrl)}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px" />`
          : "";
        marker.bindPopup(`
          ${img}
          <div style="min-width:160px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="display:inline-flex;align-items:center;gap:4px;background:${TYPE_COLOR[r.type] ?? "#6B7280"};color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">
                ${glyphSvg(glyphForAnimal(r.animalType), 11)}
                ${esc(typeLabel(r.type))}
              </span>
              <span style="font-size:11px;color:#6B7280">${esc(animalLabel(r.animalType))}</span>
            </div>
            <div style="font-weight:700;font-size:14px;color:#111827">${esc(r.name ?? labels.unknownAnimal)}</div>
            ${r.breed ? `<div style="font-size:12px;color:#6B7280">${esc(r.breed)}</div>` : ""}
            <div style="font-size:12px;color:#374151;margin-top:4px">${esc(r.city)}</div>
            ${r.contactPhone ? `<div style="font-size:12px;color:#2563EB;margin-top:4px">${esc(r.contactName)}: ${esc(r.contactPhone)}</div>` : ""}
            <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${new Date(r.createdAt).toLocaleDateString(locale)}</div>
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
              <span style="font-weight:700;font-size:14px;color:#111827">${esc(s.name)}</span>
              ${s.isVerified ? '<span style="color:#16A34A;font-size:11px">&#10003;</span>' : ""}
            </div>
            <div style="font-size:12px;color:#6B7280">${esc(s.city)}${s.address ? `, ${esc(s.address)}` : ""}</div>
            <div style="font-size:12px;color:${SHELTER_COLOR};margin-top:2px">${esc(labels.shelterAnimals(s._count.animals))}</div>
            ${s.phone ? `<div style="font-size:12px;color:#374151;margin-top:2px">${esc(s.phone)}</div>` : ""}
            <a href="/shelters/${encodeURIComponent(s.slug)}" target="_blank"
              style="display:inline-block;margin-top:6px;font-size:12px;color:${SHELTER_COLOR};text-decoration:underline">
              ${esc(labels.shelterPage)} &rarr;
            </a>
          </div>
        `);
        marker.addTo(layerRef.current!);
      });
    }

    if (showVets) {
      vets.forEach(v => {
        const marker = L.marker([v.lat, v.lng], { icon: makeVetIcon(v.isEmergency) });
        marker.bindPopup(`
          <div style="min-width:170px">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              <span style="font-weight:700;font-size:14px;color:#111827">${esc(v.name)}</span>
              ${v.isEmergency
                ? `<span style="font-size:10px;font-weight:700;color:#B91C1C;background:#FEE2E2;padding:1px 6px;border-radius:999px">${esc(labels.emergency)}</span>`
                : ""}
            </div>
            <div style="font-size:12px;color:#6B7280">${esc(v.city)}, ${esc(v.address)}</div>
            ${v.openingHours ? `<div style="font-size:12px;color:#374151;margin-top:2px">${esc(v.openingHours)}</div>` : ""}
            ${v.phone ? `<div style="font-size:12px;color:#374151;margin-top:2px">${esc(v.phone)}</div>` : ""}
            ${v.website
              ? `<a href="${esc(v.website)}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;margin-top:6px;font-size:12px;color:${VET_COLOR};text-decoration:underline">${esc(labels.website)} &rarr;</a>`
              : ""}
          </div>
        `);
        marker.addTo(layerRef.current!);
      });
    }
  }, [reports, shelters, vets, showReports, showShelters, showVets, typeFilter, labels, locale]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", zIndex: 0 }} />;
}

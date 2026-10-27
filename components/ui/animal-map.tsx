"use client";

import { useEffect, useRef, useState } from "react";
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
  reportPage:  string;
  reportsHere: (count: number) => string;
  emergency: string;
  website: string;
}

import {
  SHELTER_COLOR, TYPE_COLOR, VET_COLOR, VET_EMERGENCY_COLOR,
} from "@/components/ui/map-colors";
import { safeHref } from "@/lib/safe-url";
import { groupByLocation } from "@/lib/map-groups";

// Külön modulból jönnek, hogy a jelmagyarázat ne ezen a fájlon keresztül
// férjen hozzájuk – lásd a map-colors.ts fejlécét.
export { SHELTER_COLOR, TYPE_COLOR, VET_COLOR, VET_EMERGENCY_COLOR };

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

/**
 * Több bejelentés egy ponton: a szokásos csepp, rajta a darabszám. Ha mind
 * egy típusú (pl. mind elveszett), annak a színe, különben semleges szürke.
 */
function makeGroupIcon(group: MapReport[]) {
  const sameType   = group.every(r => r.type === group[0].type);
  const sameAnimal = group.every(r => r.animalType === group[0].animalType);
  const color = sameType ? (TYPE_COLOR[group[0].type] ?? "#6B7280") : "#374151";
  const glyph = glyphForAnimal(sameAnimal ? group[0].animalType : "OTHER");
  return L.divIcon({
    className: "",
    html: `<div style="position:relative">${pinHtml(color, glyph, 34)}
      <span style="position:absolute;top:-6px;right:-8px;min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;
        display:flex;align-items:center;justify-content:center;background:#111827;color:#fff;border:2px solid #fff;
        border-radius:999px;font:700 11px/1 system-ui,sans-serif">${group.length}</span></div>`,
    iconSize:   [34, 34],
    iconAnchor: [17, 34],
    popupAnchor:[0, -34],
  });
}

/**
 * Országos nézetben több száz állatorvos van a térképen, és a teljes méretű
 * ikonok nagyjából 85%-a egymást takarta: amire a felhasználó rábökött, az
 * gyakran egy alatta lévő másik jelölő volt, a bejelentések pedig elvesztek
 * köztük. Ezért kis nagyításon az állatorvos csak egy kis pötty, és csak
 * közelebbről kap teljes ikont.
 */
const VET_FULL_ICON_ZOOM = 10;

function makeVetDot(isEmergency: boolean) {
  const color = isEmergency ? VET_EMERGENCY_COLOR : VET_COLOR;
  return L.divIcon({
    className: "",
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35)"></div>`,
    iconSize:   [12, 12],
    iconAnchor: [6, 6],
    popupAnchor:[0, -6],
  });
}

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
  // Csak a küszöb átlépésekor rajzolunk újra (különben minden nagyítás
  // bezárná a nyitott buborékot).
  const [vetFull, setVetFull] = useState(false);

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
    mapRef.current.on("zoomend", () => setVetFull((mapRef.current?.getZoom() ?? 0) >= VET_FULL_ICON_ZOOM));
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Re-render markers when filters change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    const typeLabel   = (t: string) => ({ LOST: labels.lost, FOUND: labels.found, STRAY: labels.stray }[t] ?? t);
    // A popup sima HTML, nem next-intl `Link`: a nyelvi előtagot kézzel
    // tesszük elé, különben az angol látogató a magyar oldalon kötne ki.
    const prefix = locale === "hu" ? "" : `/${locale}`;
    const animalLabel = (a: string) =>
      ({ DOG: labels.animalDog, CAT: labels.animalCat, OTHER: labels.animalOther }[a] ?? a);

    if (showReports) {
      const filtered = typeFilter ? reports.filter(r => r.type === typeFilter) : reports;
      groupByLocation(filtered).forEach(group => {
        // Egy helyen több bejelentés: egy jelölő, darabszámmal, listás buborékkal.
        if (group.length > 1) {
          const { lat, lng } = group[0];
          const marker = L.marker([lat, lng], { icon: makeGroupIcon(group), zIndexOffset: 2000 });
          const rows = group.map(r => `
            <a href="${prefix}/reports/${encodeURIComponent(r.id)}"
              style="display:flex;gap:8px;align-items:center;padding:6px 0;border-top:1px solid #F3F4F6;text-decoration:none;color:inherit">
              ${r.imageUrl
                ? `<img src="${esc(r.imageUrl)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;flex:none" />`
                : `<span style="width:40px;height:40px;border-radius:6px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:${TYPE_COLOR[r.type] ?? "#6B7280"}">${glyphSvg(glyphForAnimal(r.animalType), 18)}</span>`}
              <span style="min-width:0;flex:1">
                <span style="display:inline-block;background:${TYPE_COLOR[r.type] ?? "#6B7280"};color:#fff;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:700">${esc(typeLabel(r.type))}</span>
                <span style="display:block;font-weight:700;font-size:13px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name ?? labels.unknownAnimal)}${r.breed ? ` <span style="font-weight:400;color:#6B7280">· ${esc(r.breed)}</span>` : ""}</span>
                <span style="display:block;font-size:11px;color:#9CA3AF">${new Date(r.createdAt).toLocaleDateString(locale)}</span>
              </span>
              <span style="color:#9CA3AF;font-size:14px">&rsaquo;</span>
            </a>`).join("");
          marker.bindPopup(`
            <div style="min-width:220px">
              <div style="font-weight:700;font-size:13px;color:#111827">${esc(labels.reportsHere(group.length))}</div>
              <div style="font-size:12px;color:#6B7280;margin-bottom:4px">${esc(group[0].city)}</div>
              <div style="max-height:260px;overflow-y:auto">${rows}</div>
            </div>
          `, { maxWidth: 280 });
          marker.addTo(layerRef.current!);
          return;
        }

        const r = group[0];
        const marker = L.marker([r.lat, r.lng], { icon: makeReportIcon(r.type, r.animalType), zIndexOffset: 1500 });
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
            ${r.contactPhone ? `<div style="font-size:12px;margin-top:4px">${esc(r.contactName)}: <a href="tel:${esc(r.contactPhone.replace(/[^+\d]/g, ""))}" style="color:#2563EB">${esc(r.contactPhone)}</a></div>` : ""}
            <div style="font-size:11px;color:#9CA3AF;margin-top:4px">${new Date(r.createdAt).toLocaleDateString(locale)}</div>
            <a href="${prefix}/reports/${encodeURIComponent(r.id)}"
              style="display:inline-block;margin-top:6px;font-size:12px;font-weight:600;color:${TYPE_COLOR[r.type] ?? "#374151"};text-decoration:underline">
              ${esc(labels.reportPage)} &rarr;
            </a>
          </div>
        `);
        marker.addTo(layerRef.current!);
      });
    }

    if (showShelters) {
      shelters.forEach(s => {
        const marker = L.marker([s.lat, s.lng], { icon: SHELTER_ICON, zIndexOffset: 1000 });
        marker.bindPopup(`
          <div style="min-width:160px">
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">
              <span style="font-weight:700;font-size:14px;color:#111827">${esc(s.name)}</span>
              ${s.isVerified ? '<span style="color:#16A34A;font-size:11px">&#10003;</span>' : ""}
            </div>
            <div style="font-size:12px;color:#6B7280">${esc(s.city)}${s.address ? `, ${esc(s.address)}` : ""}</div>
            <div style="font-size:12px;color:${SHELTER_COLOR};margin-top:2px">${esc(labels.shelterAnimals(s._count.animals))}</div>
            ${s.phone ? `<div style="font-size:12px;margin-top:2px"><a href="tel:${esc(s.phone.replace(/[^+\d]/g, ""))}" style="color:#2563EB">${esc(s.phone)}</a></div>` : ""}
            <a href="${prefix}/shelters/${encodeURIComponent(s.slug)}"
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
        const marker = L.marker([v.lat, v.lng], {
          icon: vetFull ? makeVetIcon(v.isEmergency) : makeVetDot(v.isEmergency),
        });
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
            ${v.phone ? `<div style="font-size:12px;margin-top:2px"><a href="tel:${esc(v.phone.replace(/[^+\d]/g, ""))}" style="color:#2563EB">${esc(v.phone)}</a></div>` : ""}
            ${safeHref(v.website)
              ? `<a href="${esc(safeHref(v.website))}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;margin-top:6px;font-size:12px;color:${VET_COLOR};text-decoration:underline">${esc(labels.website)} &rarr;</a>`
              : ""}
          </div>
        `);
        marker.addTo(layerRef.current!);
      });
    }
  }, [reports, shelters, vets, showReports, showShelters, showVets, typeFilter, labels, locale, vetFull]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%", zIndex: 0 }} />;
}

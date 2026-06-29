"use client";

import { DashboardTour, type TourStep } from "@/components/onboarding/dashboard-tour";

const STEPS: TourStep[] = [
  {
    selector: null,
    title: "Üdv a vezérlőpultban! 🐾",
    body:  "Köszöntünk a menhelyed irányítópultján! Pár lépésben végigvezetünk a legfontosabb funkciókon. Bármikor kihagyhatod, és később újraindíthatod.",
  },
  {
    selector: '[data-tour="nav-overview"]',
    title: "Áttekintő",
    body:  "Itt látod a legfontosabb mutatókat: állatok száma, beérkező kérelmek, közelgő időpontok és az elemzési grafikonok.",
  },
  {
    selector: '[data-tour="group-animals"]',
    title: "Állatok kezelése",
    body:  "Itt veszed fel és kezeled az állatokat, a kenneleket, az etetési terveket, a készletet és a menhelyek közötti áthelyezéseket.",
  },
  {
    selector: '[data-tour="group-adoption"]',
    title: "Örökbefogadás",
    body:  "A beérkező örökbefogadási kérelmek, időpontfoglalások, utánkövetések és a saját kérdőív-sablonjaid kezelése.",
  },
  {
    selector: '[data-tour="group-community"]',
    title: "Közösség",
    body:  "Tegyél közzé posztokat, kezeld az önkénteseket és ideiglenes befogadókat, szervezz eseményeket, és válaszolj az üzenetekre.",
  },
  {
    selector: '[data-tour="group-donation"]',
    title: "Adományozás",
    body:  "Hozz létre havi támogatói csomagokat és gyűjtéseket, és kövesd nyomon az előfizetőidet.",
  },
  {
    selector: '[data-tour="group-settings"]',
    title: "Beállítások",
    body:  "A menhely adatai, logó és borítókép, valamint a Stripe fiók csatlakoztatása az adományok fogadásához. Ezt érdemes először kitölteni!",
  },
  {
    selector: null,
    title: "Készen állsz! 🎉",
    body:  "Ez minden, amit tudnod kell az induláshoz. A bal oldali menü alján lévő „Bemutató” gombbal bármikor újraindíthatod ezt a végigvezetést.",
  },
];

export function DashboardTourLauncher({ autoStart }: { autoStart: boolean }) {
  return <DashboardTour steps={STEPS} autoStart={autoStart} />;
}

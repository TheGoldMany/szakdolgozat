/**
 * Bemutató-adatok fotói (seed scriptek és az előnézeti feltöltés).
 *
 * MIÉRT NEM LOREMFLICKR: a korábbi `loremflickr.com` képeket a Vercel
 * képoptimalizálója nem tudja letölteni (OPTIMIZED_EXTERNAL_IMAGE_REQUEST_FAILED),
 * így az előnézetben minden bemutató-kép törött volt.
 *
 * Az Unsplash CDN stabil, a licenc ingyenes felhasználást enged. A listát
 * a `prisma/seed-preview.ts` futáskor egyenként ellenőrzi, és csak a
 * ténylegesen betöltődő képeket használja, így egy elírt vagy időközben
 * törölt fotó sem okoz törött képet.
 */

import type { AnimalType } from "@prisma/client";

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=800&q=75&auto=format&fit=crop`;

export const DEMO_IMAGE_HOST = "images.unsplash.com";

export const DEMO_IMAGE_POOL: Record<AnimalType, string[]> = {
  DOG: [
    u("1543466835-00a7907e9de1"),
    u("1587300003388-59208cc962cb"),
    u("1583511655857-d19b40a7a54e"),
    u("1517849845537-4d257902454a"),
    u("1561037404-61cd46aa615b"),
    u("1552053831-71594a27632d"),
    u("1548199973-03cce0bbc87b"),
    u("1537151625747-768eb6cf92b2"),
    u("1530281700549-e82e7bf110d6"),
    u("1477884213360-7e9d7dcc1e48"),
    u("1558788353-f76d92427f16"),
    u("1505628346881-b72b27e84530"),
    u("1534361960057-19889db9621e"),
    u("1518717758536-85ae29035b6d"),
  ],
  CAT: [
    u("1514888286974-6c03e2ca1dba"),
    u("1573865526739-10659fec78a5"),
    u("1495360010541-f48722b34f7d"),
    u("1518791841217-8f162f1e1131"),
    u("1574158622682-e40e69881006"),
    u("1592194996308-7b43878e84a6"),
    u("1526336024174-e58f5cdd8e13"),
    u("1494256997604-768d1f608cac"),
    u("1513245543132-31f507417b26"),
    u("1543852786-1cf6624b9987"),
  ],
  RABBIT: [
    u("1585110396000-c9ffd4e4b308"),
    u("1452857297128-d9c29adba80b"),
    u("1535241749838-299277b6305f"),
    u("1559214369-a6b1d7919865"),
  ],
  BIRD: [
    u("1552728089-57bdde30beb3"),
    u("1444464666168-49d633b86797"),
    u("1522926193341-e9ffd686c60f"),
  ],
  OTHER: [
    u("1425082661705-1834bfd09dca"),
    u("1548767797-d8c844163c4c"),
  ],
};

/** Determinisztikus választás: ugyanaz a kulcs mindig ugyanazt a képet adja. */
export function pickFrom<T>(list: T[], key: string): T | undefined {
  if (list.length === 0) return undefined;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/** Bemutató-képnek számít-e az URL (ezeket szabad a feltöltő cserélnie). */
export function isDemoImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("loremflickr.com") || url.includes(DEMO_IMAGE_HOST);
}

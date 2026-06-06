"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Oldalankénti súgó tartalom. Minden admin oldalhoz tartozik egy bejegyzés,
 * ami elmagyarázza, mit lehet az oldalon csinálni és hogyan működik.
 */
interface InfoContent {
  title: string;
  intro: string;
  points: { label: string; desc: string }[];
  tip?: string;
}

const PAGE_INFO: Record<string, InfoContent> = {
  inventory: {
    title: "Készletkezelés",
    intro: "Itt tartod nyilván a menhely takarmány-, gyógyszer-, kellék- és eszközkészletét. A rendszer figyeli a minimum szintet és a lejárati dátumokat.",
    points: [
      { label: "Tétel hozzáadása", desc: "A „Tétel hozzáadása” gombbal vehetsz fel új tételt: név, kategória, mértékegység, nyitókészlet, opcionális minimum szint és lejárati dátum." },
      { label: "Mozgás rögzítése", desc: "A „Mozgás” gombbal rögzíthetsz Bevételezést (IN, +), Felhasználást (OUT, –) vagy Leltári korrekciót (ADJUST – a tényleges darabszámra állít). OUT esetén nem mehet a készlet 0 alá." },
      { label: "Riasztások", desc: "Piros jelölés = alacsony készlet (jelenlegi < minimum), sárga = 7 napon belül lejár. Ezekről automatikus értesítést is kapsz." },
      { label: "Mozgástörténet", desc: "Minden tétel részletoldalán látható, ki, mikor, mennyit rögzített – így ellenőrizhető a nyilvántartás." },
    ],
    tip: "A KPI kártyák felül összesítik az összes tételt, az alacsony készletet és a hamarosan lejáró elemeket.",
  },
  applications: {
    title: "Örökbefogadási kérelmek",
    intro: "A menhelyedhez beérkező örökbefogadási kérelmek kezelése. Itt bírálod el a jelentkezőket.",
    points: [
      { label: "Kérelem megnyitása", desc: "Kattints egy kérelemre a részletek megtekintéséhez: lakókörülmények, tapasztalat, háztartás összetétele." },
      { label: "Státusz módosítása", desc: "Állítsd Elbírálás alatt → Elfogadva / Elutasítva állapotba. A jelentkező azonnal értesítést kap a döntésről." },
      { label: "Megjegyzés", desc: "Elutasításkor indoklást fűzhetsz hozzá, amit a jelentkező is lát." },
      { label: "Kérelmező értékelése", desc: "A jelentkező nevére kattintva megtekinthető a profilja és korábbi értékelései." },
    ],
    tip: "Jóváhagyáskor a rendszer automatikusan ütemez utánkövetési kérdőíveket (30 és 90 nap).",
  },
  animals: {
    title: "Állatok kezelése",
    intro: "A menhely összes állatának nyilvántartása. Itt adsz hozzá új állatot és frissíted az állapotukat.",
    points: [
      { label: "Állat hozzáadása", desc: "Az „Állat hozzáadása” gombbal: faj, fajta, kor, súly, leírás, fotók (max. 6) és egészségügyi jelölők (oltott, ivartalanított, mikrochipes)." },
      { label: "Státusz váltás", desc: "Soronként állítható: Elérhető, Függőben, Örökbefogadva, Átmeneti gondozás, Állatorvosi megfigyelés." },
      { label: "Egészségügyi napló", desc: "Az állat részletoldalán rögzíthető oltás, féregtelenítés, kezelés, állatorvosi vizit – az állatorvos nevével és a következő esedékességgel." },
      { label: "Dokumentumok", desc: "Az Iratok fülön PDF-ek tölthetők fel (oltási könyv, ivartalanítási igazolás)." },
    ],
    tip: "A jó leírás és minőségi fotók jelentősen növelik az örökbefogadás esélyét.",
  },
  appointments: {
    title: "Időpontok kezelése",
    intro: "A felhasználók által kért látogatási időpontok kezelése.",
    points: [
      { label: "Bejövő kérések", desc: "A Függőben lévő kéréseknél látod a kért időpontot, az érintett állatot és a felhasználó üzenetét." },
      { label: "Visszaigazolás", desc: "Erősítsd vissza vagy módosítsd a dátumot, és adj admin megjegyzést. A felhasználó értesítést kap." },
      { label: "Lezárás / Lemondás", desc: "Megtörtént találkozót jelölj Teljesítve állapotba; lemondáskor adj indoklást." },
    ],
    tip: "A visszaigazolt időpontot a felhasználó kötelezőnek tekinti – ha le kell mondani, értesítsd időben.",
  },
  volunteers: {
    title: "Önkéntesek kezelése",
    intro: "A menhely önkénteseinek és feladatainak kezelése.",
    points: [
      { label: "Kérelmek jóváhagyása", desc: "A Függőben lévő jelentkezők motivációja és képességei alapján fogadd el vagy utasítsd el a jelentkezést." },
      { label: "Feladatok meghirdetése", desc: "Új feladat: név, leírás, időpont, max. létszám. Az aktív önkéntesek látják és feljelentkezhetnek." },
      { label: "Jelenléti napló", desc: "Rögzítsd az alkalmankénti jelenlétet és az eltöltött órákat." },
      { label: "Inaktiválás", desc: "Aktív állapotból Inaktívba helyezhető önkéntes – az adatai megmaradnak." },
    ],
  },
  followups: {
    title: "Utánkövetések",
    intro: "Az örökbefogadás utáni jólléti kérdőívek nyomon követése.",
    points: [
      { label: "Automatikus ütemezés", desc: "Jóváhagyott kérelemhez a rendszer 30 és 90 napos utánkövetést ütemez." },
      { label: "Állapotok", desc: "Esedékes, Kitöltve, Lejárt. A lejártakat piros jelzés emeli ki." },
      { label: "Kitöltött kérdőívek", desc: "Megtekinthető a közérzet-értékelés (1–5 csillag), a szöveges megjegyzés és a feltöltött fotó." },
    ],
    tip: "Lejárt utánkövetésnél üzenetben emlékeztetheted az örökbefogadót.",
  },
  subscriptions: {
    title: "Előfizetők",
    intro: "A menhely havi támogatóinak listája.",
    points: [
      { label: "Aktív előfizetők", desc: "Látod az előfizető nevét, a csomag típusát és az előfizetés kezdetét." },
      { label: "Lemondás", desc: "Az előfizetést a felhasználó a saját profilján mondhatja le – adminként nem módosítható." },
    ],
    tip: "Az előfizetési csomagokat az „Előfizetési csomagok” oldalon hozhatod létre.",
  },
  tiers: {
    title: "Előfizetési csomagok",
    intro: "A havi támogatási csomagok létrehozása és kezelése.",
    points: [
      { label: "Csomag létrehozása", desc: "Add meg a csomag nevét, leírását és összegét (minimum 175 Ft/hó)." },
      { label: "Aktiválás", desc: "Az aktív csomagok megjelennek a menhely publikus profilján, ahol a látogatók előfizethetnek." },
      { label: "Stripe szükséges", desc: "Az adományok fogadásához a menhely beállításoknál csatlakoztatni kell a Stripe fiókot." },
    ],
  },
  forms: {
    title: "Kérvény sablonok",
    intro: "Egyedi örökbefogadási kérdőívek készítése.",
    points: [
      { label: "Új sablon", desc: "Adj hozzá szöveges mezőket vagy fájl-feltöltési mezőket a kérdőívhez." },
      { label: "Jóváhagyás", desc: "A sablon Super Admin jóváhagyása után válik használhatóvá." },
      { label: "Hozzárendelés", desc: "Jóváhagyott sablon rendelhető az állatokhoz, így az örökbefogadók egyedi kérdőívet töltenek ki." },
    ],
  },
  messages: {
    title: "Üzenetek",
    intro: "A felhasználókkal folytatott beszélgetések kezelése.",
    points: [
      { label: "Beszélgetések", desc: "Minden érdeklődő külön beszélgetésben jelenik meg, az érintett állattal együtt." },
      { label: "Válaszadás", desc: "Írj választ, vagy csatolj fájlt (PDF, kép, max. 10 MB)." },
      { label: "Olvasatlanok", desc: "Az olvasatlan üzenetek számlálója a fejlécben látható." },
    ],
  },
  shelters: {
    title: "Menhelyek (Platform)",
    intro: "Super Admin nézet: az összes menhely kezelése a platformon.",
    points: [
      { label: "Teljes lista", desc: "Látod az összes menhelyt (aktív, inaktív, hitelesített) és megnyithatod az adataikat." },
      { label: "Hitelesítés", desc: "Engedélyezheted vagy visszavonhatod a Hitelesített státuszt – ez külön jelzéssel jelenik meg a publikus listán." },
      { label: "Admin hozzárendelés", desc: "Menhelyhez több SHELTER_ADMIN felhasználó rendelhető." },
      { label: "Deaktiválás", desc: "Inaktiválással a menhely eltűnik a publikus listáról, de az adatok megmaradnak." },
    ],
  },
  campaigns: {
    title: "Jóváhagyások",
    intro: "Super Admin nézet: a menhelyek kampányainak és kérvény sablonjainak jóváhagyása.",
    points: [
      { label: "Kampányok", desc: "A jóváhagyásra váró kampányok leírása és célja alapján fogadd el (Aktív) vagy utasítsd el." },
      { label: "Kérvény sablonok", desc: "Ellenőrizd a kérdőív-mezőket, majd hagyd jóvá vagy utasítsd el." },
      { label: "Értesítés", desc: "A menhely adminisztrátora minden döntésről értesítést kap." },
    ],
  },
  overview: {
    title: "Áttekintő",
    intro: "A dashboard kezdőlapja a legfontosabb mutatókkal és elemzésekkel.",
    points: [
      { label: "KPI kártyák", desc: "Összes állat, elérhető állatok, beérkező kérelmek, aktív önkéntesek gyors áttekintése." },
      { label: "Analytics panelek", desc: "UC-01 örökbefogadási trend, UC-02 kapacitáskihasználtság, UC-03 bejelentések, UC-04 visszakerülési ráta." },
      { label: "Szűrő (Super Admin)", desc: "A menhely-jelölőnégyzetekkel szűkíthető, mely menhelyek adatait mutatja az elemzés." },
    ],
    tip: "Részletes útmutató minden funkcióhoz a Súgó oldalon érhető el.",
  },
  settings: {
    title: "Menhely beállításai",
    intro: "A menhely publikus adatainak és fizetési beállításainak szerkesztése.",
    points: [
      { label: "Alapadatok", desc: "Cím, telefonszám, e-mail, weboldal, leírás és örökbefogadási feltételek – azonnal megjelennek a publikus profilon." },
      { label: "Logó és borító", desc: "Logó (kb. 200×200 px) és borítókép (kb. 1200×400 px) feltöltése." },
      { label: "Kapacitás", desc: "A férőhelyek száma – ez jelenik meg a kapacitáskihasználtság panelen (UC-02)." },
      { label: "Stripe Connect", desc: "A fizetések fogadásához kötelező a Stripe fiók csatlakoztatása." },
    ],
  },
};

export function PageInfo({ page, className }: { page: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const content = PAGE_INFO[page];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!content) return null;

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Információ az oldalról"
        aria-expanded={open}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
          open
            ? "border-brand-300 bg-brand-50 text-brand-600"
            : "border-gray-200 text-gray-400 hover:border-brand-200 hover:text-brand-500"
        )}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 top-8 z-50 w-80 rounded-2xl border border-gray-100 bg-white p-5 shadow-xl sm:w-96">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                <Info className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">{content.title}</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Bezárás"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mb-3 text-xs leading-relaxed text-gray-500">{content.intro}</p>

          <div className="space-y-2.5">
            {content.points.map((p) => (
              <div key={p.label} className="flex gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{p.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {content.tip && (
            <div className="mt-3 rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 text-xs leading-relaxed text-brand-800">
              💡 {content.tip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

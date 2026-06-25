"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  PawPrint, Search, FileText, Heart, Bell, Building2, CreditCard, Upload,
  MessageCircle, ChevronRight, Users, CalendarDays, HandHeart, Package,
  ListChecks, BarChart2, Settings, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock, ArrowDownCircle, ArrowUpCircle, RotateCcw, Info,
  Home, Map, ArrowLeftRight, Star, MessagesSquare, Share2, Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types & primitives ────────────────────────────────────────────────────

type TabId = "user" | "admin" | "superadmin";

interface TocItem { id: string; label: string; icon: React.ElementType }

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
  { id: "user",       label: "Sima felhasználó",  icon: Users,       color: "text-brand-600 border-brand-500 bg-brand-50" },
  { id: "admin",      label: "Menhely admin",       icon: Building2,   color: "text-emerald-700 border-emerald-500 bg-emerald-50" },
  { id: "superadmin", label: "Super admin",          icon: ShieldCheck, color: "text-violet-700 border-violet-500 bg-violet-50" },
];

const TOC_USER: TocItem[] = [
  { id: "u-orokbefogadas", label: "Örökbefogadás menete",    icon: PawPrint       },
  { id: "u-kerelem",       label: "Kérelmeim kezelése",       icon: FileText       },
  { id: "u-ertesitesek",   label: "Értesítések",              icon: Bell           },
  { id: "u-idopontok",     label: "Időpontfoglalás",          icon: CalendarDays   },
  { id: "u-onkentesseg",   label: "Önkéntesség",              icon: HandHeart      },
  { id: "u-utankovetes",   label: "Utánkövetés",              icon: ListChecks     },
  { id: "u-adomanyozas",   label: "Adományozás",              icon: Heart          },
  { id: "u-kedvencek",     label: "Kedvenc állatok",           icon: Heart          },
  { id: "u-befogadas",     label: "Ideiglenes befogadás",      icon: Home           },
  { id: "u-esemenyek",     label: "Események",                 icon: CalendarDays   },
  { id: "u-terkep",        label: "Térkép",                    icon: Map            },
  { id: "u-bejelentes",    label: "Kóbor állat bejelentése",   icon: Bell           },
  { id: "u-uzenetek",      label: "Üzenetváltás",              icon: MessageCircle  },
];

const TOC_ADMIN: TocItem[] = [
  { id: "a-attekinto",    label: "Dashboard áttekintő",     icon: BarChart2      },
  { id: "a-allatok",      label: "Állatok kezelése",         icon: PawPrint       },
  { id: "a-kerelmek",     label: "Kérelmek kezelése",        icon: FileText       },
  { id: "a-idopontok",    label: "Időpontok kezelése",       icon: CalendarDays   },
  { id: "a-onkentesek",   label: "Önkéntesek kezelése",      icon: HandHeart      },
  { id: "a-keszlet",      label: "Készletkezelés",           icon: Package        },
  { id: "a-ertesitesek",  label: "Értesítések és riasztások", icon: Bell          },
  { id: "a-utankovetes",  label: "Utánkövetések",            icon: ListChecks     },
  { id: "a-posztok",      label: "Közösségi posztok",        icon: MessagesSquare },
  { id: "a-adomanyok",    label: "Adományok és kampányok",   icon: Heart          },
  { id: "a-elemzesek",    label: "Elemzések (Analytics)",    icon: BarChart2      },
  { id: "a-beallitasok",  label: "Menhely beállításai",       icon: Settings       },
  { id: "a-befogadok",    label: "Ideiglenes befogadók",      icon: Home           },
  { id: "a-kenneleks",    label: "Kennelek kezelése",          icon: Building2      },
  { id: "a-atelyezesek",  label: "Állat áthelyezések",         icon: ArrowLeftRight },
  { id: "a-esemenyek",    label: "Események kezelése",         icon: CalendarDays   },
];

const TOC_SUPER: TocItem[] = [
  { id: "s-platform",       label: "Platform menedzsment",     icon: ShieldCheck    },
  { id: "s-gyujtesek",      label: "Gyűjtések kezelése",        icon: Heart          },
  { id: "s-csomagok",       label: "Előfizetési csomagok",      icon: CheckCircle2   },
  { id: "s-elofizetesek",   label: "Előfizetések",              icon: Users          },
  { id: "s-menhelyek",      label: "Menhelyek kezelése",        icon: Building2      },
  { id: "s-elemzesek",      label: "Teljes analitika",          icon: BarChart2      },
];

// ── Reusable layout components ────────────────────────────────────────────

function Section({ id, icon: Icon, title, color, children }: {
  id: string; icon: React.ElementType; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className={cn("mb-5 flex items-center gap-3 rounded-2xl px-5 py-4", color)}>
        <Icon className="h-5 w-5 shrink-0" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="space-y-4 px-1">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{n}</div>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="mt-0.5 text-sm text-gray-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Note({ type = "info", children }: { type?: "info" | "warn" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 border-blue-100 text-blue-800",
    warn: "bg-amber-50 border-amber-100 text-amber-800",
    tip:  "bg-brand-50 border-brand-100 text-brand-800",
  };
  const icons = { info: Info, warn: AlertTriangle, tip: PawPrint };
  const Icon = icons[type];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm", styles[type])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}

function QuickLink({ icon: Icon, label, href }: { icon: React.ElementType; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm hover:border-brand-200 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="h-4 w-4 text-brand-600" />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </Link>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", color)}>{label}</span>;
}

// ── Content sections ──────────────────────────────────────────────────────

function UserContent() {
  return (
    <div className="space-y-10">

      {/* Örökbefogadás */}
      <Section id="u-orokbefogadas" icon={PawPrint} title="Örökbefogadás menete" color="bg-brand-50 text-brand-800">
        <div className="space-y-4">
          <Step n={1} title="Böngéssz az állatok között">
            Nyisd meg az <strong>Állatok</strong> oldalt és szűrj faj, méret, kor, helyszín alapján.
            Minden állatnál megtalálod a részletes leírást, fotókat, egészségügyi adatokat (oltott, ivartalanított, mikrochipes).
          </Step>
          <Step n={2} title="Nézd meg a menhely profilját">
            Az állat oldalán kattints a menhely nevére. Ott láthatod az örökbefogadási feltételeket,
            értékeléseket, és felveheted a kapcsolatot kérelem beadása előtt.
          </Step>
          <Step n={3} title="Regisztrálj / Jelentkezz be">
            A kérelem beadásához fiók szükséges. A regisztráció ingyenes, e-mailben visszaigazolják.
          </Step>
          <Step n={4} title="Küldj örökbefogadási kérelmet">
            Az állat oldalán kattints az <strong>„Örökbefogadási kérelem"</strong> gombra.
            Töltsd ki az adatlapot (lakókörülmények, tapasztalat, háztartás). Minél részletesebb, annál jobb.
          </Step>
          <Step n={5} title="Kövesd a kérelem állapotát">
            A <strong>Kérelmeim</strong> oldalon követheted a folyamatot: <Badge label="Folyamatban" color="bg-yellow-100 text-yellow-700" />,
            {" "}<Badge label="Értékelés alatt" color="bg-blue-100 text-blue-700" />,
            {" "}<Badge label="Jóváhagyva" color="bg-green-100 text-green-700" />,
            {" "}<Badge label="Elutasítva" color="bg-red-100 text-red-700" />.
            Minden változásról értesítést kapsz.
          </Step>
          <Step n={6} title="Személyes látogatás és átvétel">
            Jóváhagyás után a menhely időpontot egyeztet veled az állat személyes megtekintésére,
            majd az átvételre. Az időpontot a platformon is le lehet foglalni.
          </Step>
        </div>
        <Note type="tip">Üzenj a menhelynek az üzenetrendszeren keresztül, ha kérdésed van az állat kapcsán — még a kérelem beadása előtt.</Note>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <QuickLink icon={PawPrint} label="Állatok böngészése" href="/animals" />
          <QuickLink icon={FileText} label="Kérelmeim" href="/applications" />
        </div>
      </Section>

      {/* Kérelmeim */}
      <Section id="u-kerelem" icon={FileText} title="Kérelmeim kezelése" color="bg-blue-50 text-blue-800">
        <div className="space-y-4">
          <Step n={1} title="Kérelem visszavonása">
            Amíg a kérelem <Badge label="Folyamatban" color="bg-yellow-100 text-yellow-700" /> státuszban van,
            a Kérelmeim oldalon visszavonhatod. Visszavont kérelem nem nyitható meg újra.
          </Step>
          <Step n={2} title="Egyidejű kérelmek">
            Egyszerre több menhelyhez is adhatnak be kérelmet, de egy adott állathoz csak egyet.
            Ha jóváhagyást kapsz az egyiken, a többi automatikusan lejár.
          </Step>
          <Step n={3} title="Menhely megjegyzése">
            Elutasítás esetén a menhely indoklást fűzhet a döntéséhez. Ez az üzeneteid között jelenik meg.
          </Step>
        </div>
        <Note type="info">A kérelem adatai (lakókörülmények, tapasztalat) bizalmasan kezeltek – csak a menhely adminjei látják.</Note>
      </Section>

      {/* Értesítések */}
      <Section id="u-ertesitesek" icon={Bell} title="Értesítések" color="bg-amber-50 text-amber-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A platform automatikusan értesít az összes fontos eseményről. Az értesítések a fejlécben a csengő ikon mellett jelennek meg.
        </p>
        <div className="mt-4 space-y-3 rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Mit vált ki értesítést?</p>
          {[
            { icon: CheckCircle2, color: "text-green-500", label: "Kérelmed jóváhagyták" },
            { icon: Info,         color: "text-blue-500",  label: "Kérelmed elbírálás alatt van" },
            { icon: CalendarDays, color: "text-brand-500", label: "Időpontod visszaigazolták" },
            { icon: MessageCircle,color: "text-purple-500",label: "Új üzeneted érkezett" },
            { icon: ListChecks,   color: "text-orange-500",label: "Utánkövetési kérdőív esedékes" },
            { icon: HandHeart,    color: "text-pink-500",  label: "Önkéntes kérelmét jóváhagyták" },
          ].map(({ icon: Icon, color, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm text-gray-700">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-4 mt-4">
          <Step n={1} title="Értesítések megtekintése">
            Kattints a fejléc csengő ikonjára. Az olvasatlan értesítések száma pirossal jelenik meg.
            Egy értesítésre kattintva az érintett oldalra navigál.
          </Step>
          <Step n={2} title="Értesítések olvasottnak jelölése">
            Az összes értesítés olvasottnak jelölhető egyszerre a „Mind olvasva" gombbal, vagy egyenként.
          </Step>
        </div>
        <Note type="info">E-mail értesítők is küldésre kerülnek a fontos eseményekről (jóváhagyás, elutasítás, üzenet). Az e-mail küldés a menhely e-mail beállításaitól függ.</Note>
      </Section>

      {/* Időpontfoglalás */}
      <Section id="u-idopontok" icon={CalendarDays} title="Időpontfoglalás" color="bg-sky-50 text-sky-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Meglátogathatod a menhelyet és személyesen megismerheted az állat(oka)t, mielőtt kérelmet adsz be.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Időpont kérése">
            A menhely profiloldalán vagy egy állat részleteknél kattints az <strong>„Időpontfoglalás"</strong> gombra.
            Add meg a kívánt dátumot és időpontot, írd le a célod (pl. „Bodrit szeretném megismerni").
          </Step>
          <Step n={2} title="Visszaigazolás várása">
            A menhely adminisztrátor megerősíti, módosítja vagy visszautasítja az időpontot.
            Visszaigazolásról <Badge label="Időpontja visszaigazolva" color="bg-green-100 text-green-700" /> értesítést kapsz.
          </Step>
          <Step n={3} title="Időpontjaim megtekintése">
            Minden foglalásod az <strong>Időpontjaim</strong> oldalon látható státusszal:
            <Badge label="Függőben" color="bg-yellow-100 text-yellow-700 mx-1" />,
            <Badge label="Visszaigazolva" color="bg-green-100 text-green-700 mx-1" />,
            <Badge label="Teljesítve" color="bg-blue-100 text-blue-700 mx-1" />,
            <Badge label="Lemondva" color="bg-red-100 text-red-700 mx-1" />.
          </Step>
          <Step n={4} title="Lemondás">
            A visszaigazolt időpontot a <strong>Időpontjaim</strong> oldalon mondhatod le. Kérlek a menhely
            munkaterhelésére való tekintettel legalább 24 órával korábban tedd meg.
          </Step>
        </div>
        <QuickLink icon={CalendarDays} label="Időpontjaim" href="/appointments" />
      </Section>

      {/* Önkéntesség */}
      <Section id="u-onkentesseg" icon={HandHeart} title="Önkéntesség" color="bg-pink-50 text-pink-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Ha szeretnél rendszeresen segíteni egy menhelynek, önkéntesnek jelentkezhetsz. Az önkéntesek
          sétáltatnak, szocializálnak, segítenek rendezvényeken vagy adminisztrációban.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Jelentkezés">
            A menhely profiloldalán kattints az <strong>„Önkéntesnek jelentkezem"</strong> gombra.
            Add meg a motivációdat, képességeidet és mikor érsz rá. Minél részletesebb, annál jobb.
          </Step>
          <Step n={2} title="Jóváhagyás">
            A menhely admin átnézi a kérelmedet és jóváhagyja vagy elutasítja.
            Jóváhagyásról <Badge label="Önkéntes kérelme elfogadva" color="bg-green-100 text-green-700" /> értesítést kapsz.
          </Step>
          <Step n={3} title="Feladatok megtekintése">
            Aktív önkéntesként látod a menhely meghirdetett feladatait az <strong>Önkéntességem</strong> oldalon.
            Feladatra feljelentkezés után a menhely látja a részvételed.
          </Step>
          <Step n={4} title="Jelenléti napló">
            Minden alkalom után a menhely rögzíti a jelenlétedet és az eltöltött órákat. A saját statisztikád az önkéntesség oldalon látható.
          </Step>
        </div>
        <Note type="tip">Egy fiókkal több menhelyen is önkénteskedhetsz – minden menhelynél külön státusszal.</Note>
        <QuickLink icon={HandHeart} label="Önkéntességem" href="/volunteers" />
      </Section>

      {/* Utánkövetés */}
      <Section id="u-utankovetes" icon={ListChecks} title="Utánkövetés örökbefogadás után" color="bg-orange-50 text-orange-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Az örökbefogadás után a menhely rövid utánkövetési kérdőíveket küld, hogy megbizonyosodjon
          az állat jóllétéről az új otthonban.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Mikor kapok kérdőívet?">
            Az első utánkövetés általában 30 nappal az örökbefogadás után esedékes, majd 90 nappal.
            Ha esedékessé válik, <Badge label="Utánkövetési kérdőív esedékes" color="bg-orange-100 text-orange-700" /> értesítést kapsz.
          </Step>
          <Step n={2} title="Kitöltés">
            Az <strong>Utánkövetéseim</strong> oldalon töltsd ki: adj 1–5 csillagos értékelést az állat közérzetéről,
            és írj rövid szöveges megjegyzést (opcionális: fotó feltöltése).
          </Step>
          <Step n={3} title="Lejárt kérdőív">
            Ha a határidő elmúlt és még nem töltötted ki, az állapot <Badge label="Lejárt" color="bg-red-100 text-red-700" /> lesz.
            Ettől függetlenül ki lehet tölteni utólag is.
          </Step>
        </div>
        <QuickLink icon={ListChecks} label="Utánkövetéseim" href="/followups" />
      </Section>

      {/* Adományozás */}
      <Section id="u-adomanyozas" icon={Heart} title="Adományozás és előfizetés" color="bg-rose-50 text-rose-800">
        <div className="space-y-4">
          <Step n={1} title="Egyszeri adomány – Kampányok">
            A <strong>Támogatás</strong> oldalon böngészheted az aktív kampányokat. Válassz egyet, add meg
            az összeget (minimum 175 Ft) és fizess bankkártyával Stripe-on keresztül.
          </Step>
          <Step n={2} title="Havi előfizetés">
            A menhely profilján válaszd ki az előfizetési csomagot (pl. Barát: 2 500 Ft/hó).
            Az összeg havonta automatikusan levonódik. Bármikor lemondható a Profilodban.
          </Step>
          <Step n={3} title="Előfizetés lemondása">
            Profil → Előfizetéseim → Lemondás. A már kifizetett hónap végéig aktív marad.
          </Step>
        </div>
        <Note type="info">Minden fizetés biztonságos Stripe-on keresztül zajlik. Kártyaadataidat soha nem tároljuk.</Note>
      </Section>

      {/* Kedvencek */}
      <Section id="u-kedvencek" icon={Heart} title="Kedvenc állatok" color="bg-rose-50 text-rose-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A szív ikon segítségével bármely állat elmenthető a kedvencek közé, hogy könnyen megtaláld később.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Állat kedvencnek jelölése">
            Az állat kártyáján vagy részletoldalán kattints a szív ikonra. Az ikon betelik, jelezve hogy
            a kedvencek közé kerül. Bejelentkezés szükséges ehhez a funkcióhoz.
          </Step>
          <Step n={2} title="Kedvencek megtekintése">
            A <strong>Kedvenceim</strong> oldalon (fejléc → szív ikon, vagy menü) megtalálod az összes
            elmentett állatot. Szűrheted faj és státusz szerint.
          </Step>
          <Step n={3} title="Eltávolítás a kedvencek közül">
            A szív ikonra kattintva újra eltávolíthatod az állatot a kedvenceid közül. A kedvenceim oldalon
            is megjelenik ez a lehetőség.
          </Step>
        </div>
        <Note type="info">Ha egy kedvenc állat státusza megváltozik (pl. örökbe fogadták), az továbbra is látható a listában — így mindig nyomon követheted a korábban megjelölt állatokat.</Note>
        <QuickLink icon={Heart} label="Kedvenceim" href="/favorites" />
      </Section>

      {/* Ideiglenes befogadás */}
      <Section id="u-befogadas" icon={Home} title="Ideiglenes befogadás" color="bg-violet-50 text-violet-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Az ideiglenes befogadók (foster carers) átmenetileg otthont adnak egy állatnak, amíg az végleges
          örökbefogadóra vár. Ez különösen kismacskáknak, beteg állatoknak, vagy sérülteknek nyújt segítséget.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Befogadói profil létrehozása">
            Egy menhely profiloldalán kattints az <strong>„Ideiglenes befogadónak jelentkezem"</strong> gombra.
            Add meg a lakhatási körülményeidet, tapasztalataidat és elérhetőségedet.
          </Step>
          <Step n={2} title="Jóváhagyás">
            A menhely megvizsgálja a profilt és jóváhagyja vagy elutasítja. Döntésről értesítést kapsz.
            Jóváhagyott státusszal a menhely felajánlhat neked állatokat ideiglenesen.
          </Step>
          <Step n={3} title="Aktív befogadás">
            Ha egy állat nálad van ideiglenesen, az <strong>Ideiglenes befogadásaim</strong> oldalon
            követheted az ellátmány-naplót és a befogadás részleteit.
          </Step>
          <Step n={4} title="Ellátmány-napló">
            A befogadás során rögzítheted a felhasznált ellátmányokat (takarmány, gyógyszer stb.),
            amit a menhely nyilvántart a visszatérítéshez.
          </Step>
        </div>
        <Note type="tip">Egy fiókkal több menhelyen is lehetsz ideiglenes befogadó — minden menhelynél külön profil és státusz jön létre.</Note>
        <QuickLink icon={Home} label="Ideiglenes befogadásaim" href="/foster" />
      </Section>

      {/* Események */}
      <Section id="u-esemenyek" icon={CalendarDays} title="Események" color="bg-teal-50 text-teal-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A menhelyek nyílt napokat, örökbefogadási napokat, önkéntes napokat és gyűjtéseket szerveznek.
          Ezekre az <strong>Események</strong> oldalon tudsz regisztrálni.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Esemény böngészése">
            Az <strong>Események</strong> menüpontban megtalálod az összes közelgő eseményt. Szűrhetsz
            helyszín, típus és dátum szerint.
          </Step>
          <Step n={2} title="Regisztráció eseményre">
            Az esemény részletes oldalán kattints a <strong>„Részt veszek"</strong> gombra.
            Visszaigazolást kapsz e-mailben és az <strong>Értesítések</strong> között.
          </Step>
          <Step n={3} title="Regisztrációm megtekintése">
            Az esemény oldalán megtekintheted a regisztrációd állapotát:
            <Badge label="Regisztrált" color="bg-green-100 text-green-700 mx-1" />,
            <Badge label="Visszaigazolt" color="bg-blue-100 text-blue-700 mx-1" />,
            <Badge label="Lemondva" color="bg-red-100 text-red-700 mx-1" />.
          </Step>
          <Step n={4} title="Lemondás">
            Ha nem tudsz részt venni, a regisztrációd töröld az esemény oldalán.
            Kérjük ezt legalább 24 órával az esemény előtt tedd meg.
          </Step>
        </div>
        <QuickLink icon={CalendarDays} label="Események" href="/events" />
      </Section>

      {/* Térkép */}
      <Section id="u-terkep" icon={Map} title="Interaktív térkép" color="bg-sky-50 text-sky-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A <strong>Térkép</strong> oldalon vizuálisan böngészheted az elveszett, megtalált és kóbor állatok
          bejelentéseit, valamint a menhelyek elhelyezkedését.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Rétegek kapcsolása">
            A bal felső szűrőpanelen be- és kikapcsolhatod a Bejelentések és Menhelyek réteget.
            Mobilon a szűrő ikon megnyitja a panel.
          </Step>
          <Step n={2} title="Szűrés típus és státusz szerint">
            A panelen szűrhetsz bejelentéstípusra (Elveszett / Megtalált / Kóbor) és státuszra
            (Aktív / Lezárt / Összes).
          </Step>
          <Step n={3} title="Részletek megtekintése">
            Egy jelzőre (marker) kattintva megjelenik a bejelentés vagy menhely rövid összefoglalója.
            A részletes oldalra az összefoglalóból navigálhatsz.
          </Step>
          <Step n={4} title="Új bejelentés indítása">
            A térkép alján a <strong>„+ Új bejelentés"</strong> gomb megnyitja az új bejelentés űrlapot.
          </Step>
        </div>
        <QuickLink icon={Map} label="Térkép" href="/map" />
      </Section>

      {/* Bejelentés */}
      <Section id="u-bejelentes" icon={Bell} title="Kóbor állat bejelentése" color="bg-orange-50 text-orange-800">
        <div className="space-y-4">
          <Step n={1} title="Bejelentés indítása">
            A <strong>Bejelentések</strong> menüpontban kattints az „Új bejelentés" gombra.
            Válaszd ki a típust: Elveszett / Megtalált / Kóbor.
          </Step>
          <Step n={2} title="Adatok megadása">
            Adj meg annyit, amennyit tudsz: faj, szín, helyszín, leírás.
            Töltsd fel a fotót – ez a legfontosabb a megtaláláshoz.
          </Step>
          <Step n={3} title="Bejelentés kezelése">
            Ha valaki ráismer az állatodra, üzenetet tud küldeni. Ha megoldódott, zárd le a bejelentést.
          </Step>
        </div>
        <Note type="tip">A bejelentés regisztráció nélkül is benyújtható!</Note>
      </Section>

      {/* Üzenetek */}
      <Section id="u-uzenetek" icon={MessageCircle} title="Üzenetváltás" color="bg-purple-50 text-purple-800">
        <div className="space-y-4">
          <Step n={1} title="Üzenet küldése">
            Egy állat profiloldalán kattints az <strong>„Üzenet a menhelynek"</strong> gombra.
            A beszélgetés megjelenik az Üzeneteim oldalon.
          </Step>
          <Step n={2} title="Olvasatlan üzenetek">
            Az olvasatlan üzenetek száma pirossal jelenik meg a fejlécben az üzenet ikonjánál.
            Minden új üzenetről értesítést kapsz.
          </Step>
          <Step n={3} title="Csatolt fájlok">
            Üzenetekbe PDF-et, képet (max. 10 MB) is csatolhatsz.
            Például orvosi igazolást, vagy kérdőív-kitöltési segítséget.
          </Step>
        </div>
        <QuickLink icon={MessageCircle} label="Üzeneteim" href="/messages" />
      </Section>

    </div>
  );
}

function AdminContent() {
  return (
    <div className="space-y-10">

      {/* Dashboard áttekintő */}
      <Section id="a-attekinto" icon={BarChart2} title="Dashboard áttekintő" color="bg-emerald-50 text-emerald-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Bejelentkezés után az Admin dashboardon rögtön látod a legfontosabb mutatókat: aktív állatok száma,
          beérkező kérelmek, közelgő időpontok, alacsony készletriasztások és az analitikai panelek.
        </p>
        <div className="mt-3 space-y-4">
          <Step n={1} title="KPI kártyák">
            A tetején láthatók az összesített számok: összes állat, aktuálisan elérhető, örökbefogadásra váró kérelmek, aktív önkéntesek.
          </Step>
          <Step n={2} title="Analytics panelek (UC-01–04)">
            Görögj le az Elemzések szekcióhoz: örökbefogadási trend havi bontásban, kapacitáskihasználtság,
            bejelentési statisztikák, visszakerülési ráta. A szűrővel menhelyt választhatsz.
          </Step>
          <Step n={3} title="Gyors navigáció">
            A bal oldalsáv minden szekciót tartalmaz. Az értesítések csengője és a bejövő üzenetek ikonja
            a fejlécben mindig látható.
          </Step>
        </div>
      </Section>

      {/* Állatok kezelése */}
      <Section id="a-allatok" icon={PawPrint} title="Állatok kezelése" color="bg-brand-50 text-brand-800">
        <div className="space-y-4">
          <Step n={1} title="Új állat hozzáadása">
            Dashboard → Állatok → <strong>„Állat hozzáadása"</strong>. Töltsd ki az adatokat (faj, fajta, kor, súly, leírás),
            töltsd fel a fotókat (min. 1, max. 6), jelöld az egészségügyi adatokat. Az állat azonnal megjelenik a listán.
          </Step>
          <Step n={2} title="Státusz frissítése">
            Állat szerkesztésénél változtasd meg a státuszt:
            <Badge label="Elérhető" color="bg-green-100 text-green-700 mx-1" />,
            <Badge label="Függőben" color="bg-yellow-100 text-yellow-700 mx-1" />,
            <Badge label="Örökbefogadva" color="bg-blue-100 text-blue-700 mx-1" />,
            <Badge label="Átmeneti gondozás" color="bg-purple-100 text-purple-700 mx-1" />,
            <Badge label="Állatorvosi megfigyelés" color="bg-red-100 text-red-700 mx-1" />.
          </Step>
          <Step n={3} title="Egészségügyi bejegyzések">
            Az állat részletes oldalán az „Egészségügyi napló" szekciónál adhatod hozzá a bejegyzéseket:
            oltás, féregtelenítés, kezelés, állatorvosi vizit. Minden bejegyzéshez megadható az állatorvos neve és a következő esedékesség dátuma.
          </Step>
          <Step n={4} title="Dokumentumok feltöltése">
            Az állat profiljánál az Iratok fülön feltölthetsz PDF dokumentumokat (oltási könyv, ivartalanítási igazolás, stb.).
          </Step>
          <Step n={5} title="Szerkesztés és törlés">
            Bármely adat (leírás, fotók, egészségügyi adatok) szerkeszthető az állat részletoldalán a <strong>„Szerkesztés"</strong> gombbal.
            Törléskor az állat eltűnik a publikus listáról és a kapcsolódó kérelmek is törlődnek —
            örökbe fogadott állatnál inkább archivált státuszt alkalmazz.
          </Step>
        </div>
        <Note type="tip">A jó leírás és minőségi fotók szignifikánsan növelik az örökbefogadás esélyét.</Note>
      </Section>

      {/* Kérelmek */}
      <Section id="a-kerelmek" icon={FileText} title="Kérelmek kezelése" color="bg-blue-50 text-blue-800">
        <div className="space-y-4">
          <Step n={1} title="Beérkező kérelmek">
            Dashboard → Kérelmek. Az összes beérkező kérelem listázódik, láthatod a kérelmező nevét, az állatot
            és a benyújtás idejét. Kérelmező profiljára kattintva megtekintheted az értékeléseit is.
          </Step>
          <Step n={2} title="Státusz kezelés">
            Kérelem részletesén: Módosítsd a státuszt Értékelés alatt → Jóváhagyva / Elutasítva.
            Megjegyzést is hozzáfűzhetsz az elutasítás okáról. A kérelmező azonnal értesítést kap.
          </Step>
          <Step n={3} title="Kérvény sablon (Application Form)">
            Dashboard → Kérvény sablonok → Új sablon. Készíthetsz egyedi kérdőívet az örökbefogadóknak
            (szöveges mezők, fájl feltöltés). A sablon jóváhagyás után rendelhető hozzá állathoz.
          </Step>
          <Step n={4} title="Meghívó link küldése">
            Kérelem részletesén küldhetsz meghívó linket közvetlenül egy érdeklődőnek —
            a link automatikus kérelmet nyit meg a megadott állathoz.
          </Step>
          <Step n={5} title="Kérvény sablon szerkesztése és törlése">
            Jóváhagyás előtt a sablon szerkeszthető: mezők hozzáadhatók, eltávolíthatók, átnevezhetők.
            Jóváhagyott, állathoz rendelt sablon csak az összes hozzárendelés eltávolítása után törölhető.
          </Step>
        </div>
      </Section>

      {/* Időpontok */}
      <Section id="a-idopontok" icon={CalendarDays} title="Időpontok kezelése" color="bg-sky-50 text-sky-800">
        <div className="space-y-4">
          <Step n={1} title="Bejövő kérések">
            Dashboard → Időpontok. Az összes foglalási kérés látható
            <Badge label="Függőben" color="bg-yellow-100 text-yellow-700 mx-1" /> státusszal.
            Minden kérésnél látod a kért időpontot, az érintett állatot és a felhasználó üzenetét.
          </Step>
          <Step n={2} title="Visszaigazolás / Módosítás">
            Kattints a kérésre, és erősítsd vissza az időpontot (esetleg módosítsd a dátumot),
            adj admin megjegyzést (pl. „Szombaton 10:00 rendben"). A felhasználó értesítést kap.
          </Step>
          <Step n={3} title="Lemondás és lezárás">
            Ha az időpont megtörtént, jelöld <Badge label="Teljesítve" color="bg-blue-100 text-blue-700" /> státuszba.
            Lemondható az időpont is — ebben az esetben adj indoklást (a felhasználó megkapja üzenetben).
          </Step>
        </div>
        <Note type="warn">A visszaigazolt időpontok után a felhasználó kötelező érvényűnek tekinti — ha le kell mondani, értesítsd időben.</Note>
      </Section>

      {/* Önkéntesek */}
      <Section id="a-onkentesek" icon={HandHeart} title="Önkéntesek kezelése" color="bg-pink-50 text-pink-800">
        <div className="space-y-4">
          <Step n={1} title="Kérelmek jóváhagyása">
            Dashboard → Önkéntesek → Függőben lévők tab. Olvasd el a motivációt és képességeket,
            majd fogadd el vagy utasítsd el a kérelmet. A felhasználó értesítést kap.
          </Step>
          <Step n={2} title="Feladatok meghirdetése">
            Önkéntesek → <strong>„Új feladat"</strong>. Add meg a feladat nevét, leírását,
            időpontját és a max. létszámot. Az aktív önkéntesek látják és feljelentkezhetnek.
          </Step>
          <Step n={3} title="Jelenléti napló rögzítése">
            Az önkéntes sorában kattints a + Jelenlét gombra. Add meg a dátumot,
            az eltöltött órákat és egy rövid megjegyzést (pl. „Sétáltatás, takarítás").
          </Step>
          <Step n={4} title="Inaktívvá tétel">
            Ha egy önkéntes már nem aktív, módosítsd az állapotát
            <Badge label="Inaktív" color="bg-gray-100 text-gray-600 mx-1" /> státuszba.
            Így nem jelenik meg a feladatoknál, de az adatai megmaradnak.
          </Step>
          <Step n={5} title="Feladatok szerkesztése és törlése">
            A meghirdetett feladatok szerkeszthetők: leírás, időpont és maximális létszám módosítható.
            Feladat törlésekor a feljelentkezett önkéntesek értesítést kapnak a lemondásról.
          </Step>
        </div>
      </Section>

      {/* Készletkezelés */}
      <Section id="a-keszlet" icon={Package} title="Készletkezelés" color="bg-teal-50 text-teal-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A menhelyen nyilvántarthatod a takarmány-, gyógyszer-, kellék- és eszközkészletet.
          A rendszer figyeli a minimális szintet és a lejárati dátumokat.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Új tétel felvétele">
            Dashboard → Készlet → <strong>„Tétel hozzáadása"</strong>.
            Add meg a nevet, kategóriát (Takarmány / Gyógyszer / Kellékek / Tisztítószer / Eszköz / Egyéb),
            mértékegységet (kg, liter, db, tabletta stb.), nyitókészletet és opcionálisan a minimum szintet és a lejárati dátumot.
          </Step>
          <Step n={2} title="Mozgás rögzítése (IN / OUT / ADJUST)">
            A tétel sorában kattints a <strong>„Mozgás"</strong> gombra, vagy nyisd meg a részleteket:
            <ul className="mt-2 ml-3 space-y-1 text-xs text-gray-500 list-disc">
              <li><span className="flex items-center gap-1 inline-flex"><ArrowDownCircle className="h-3.5 w-3.5 text-green-500" /> <strong>Bevételezés (IN)</strong></span> — készletre vett mennyiség (pl. szállítmány érkezett)</li>
              <li><span className="flex items-center gap-1 inline-flex"><ArrowUpCircle className="h-3.5 w-3.5 text-red-500" /> <strong>Felhasználás (OUT)</strong></span> — kivett mennyiség (pl. heti adagolás); ha kevesebb a készlet, mint a kivét, a rendszer hibaüzenetet ad</li>
              <li><span className="flex items-center gap-1 inline-flex"><RotateCcw className="h-3.5 w-3.5 text-blue-500" /> <strong>Leltári korrekció (ADJUST)</strong></span> — beállítja a tényleges darabszámot; a rendszer kiszámolja az eltérést</li>
            </ul>
          </Step>
          <Step n={3} title="Riasztások értelmezése">
            A Készlet főoldalon piros badge jelzi az alacsony készletet (jelenlegi &lt; minimum),
            sárga badge a hamarosan lejáró tételt (7 napon belül). Ezekhez automatikus push-értesítés is küldésre kerül a menhely adminoknak.
          </Step>
          <Step n={4} title="Mozgástörténet">
            Minden tétel részletoldalán megtalálható a teljes mozgástörténet (ki, mikor, mennyit rögzített),
            így bármikor ellenőrizhető a nyilvántartás pontossága.
          </Step>
          <Step n={5} title="Szerkesztés és törlés">
            Szerkesztéssel módosíthatók a metaadatok (név, minimum, lejárat, megjegyzés),
            de a tényleges mennyiség csak mozgás rögzítésével változtatható. Törléskor a mozgástörténet is elvész.
          </Step>
        </div>
        <Note type="warn">A lejárati dátum riasztás csak akkor küldődik, ha egy mozgást rögzítesz az adott tétel kapcsán. Időszakos leltározást javasolt végezni ADJUST típusú korrekciókkal.</Note>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <QuickLink icon={Package} label="Készlet" href="/dashboard/inventory" />
          <QuickLink icon={Package} label="Új tétel" href="/dashboard/inventory/new" />
        </div>
      </Section>

      {/* Értesítések admin */}
      <Section id="a-ertesitesek" icon={Bell} title="Értesítések és riasztások" color="bg-amber-50 text-amber-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Az admin a saját menhelyére vonatkozó összes fontos eseményről értesítést kap.
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Admin értesítések típusai</p>
          {[
            { icon: FileText,      color: "text-blue-500",   label: "Új örökbefogadási kérelem érkezett" },
            { icon: CalendarDays,  color: "text-sky-500",    label: "Új időpontfoglalási kérés" },
            { icon: HandHeart,     color: "text-pink-500",   label: "Új önkéntes kérelmezte" },
            { icon: Package,       color: "text-red-500",    label: "Alacsony készletszint (ha minimum be van állítva)" },
            { icon: Clock,         color: "text-amber-500",  label: "Készlettétel hamarosan lejár (7 napon belül)" },
            { icon: Heart,         color: "text-rose-500",   label: "Új adomány érkezett" },
            { icon: MessageCircle, color: "text-purple-500", label: "Új üzenet a felhasználótól" },
            { icon: ListChecks,    color: "text-orange-500", label: "Utánkövetés érkezett (az örökbefogadó kitöltötte)" },
            { icon: Navigation,    color: "text-yellow-600", label: "Kóbor / elveszett / megtalált állat bejelentve 20 km-en belül" },
          ].map(({ icon: Icon, color, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm text-gray-700">
              <Icon className={cn("h-4 w-4 shrink-0", color)} />
              {label}
            </div>
          ))}
        </div>
        <div className="space-y-3 mt-4">
          <Step n={1} title="Értesítések helye">
            A fejléc csengő ikonjánál jelennek meg. A számlálón az olvasatlan értesítések darabszáma látható.
            Egy értesítésre kattintva az érintett oldalra navigál (pl. Kérelmek, Készlet).
          </Step>
          <Step n={2} title="Riasztások kezelése">
            Alacsony készlet riasztásnál navigálj a Készlet oldalra és rögzítsd a bevételezést, vagy módosítsd a minimum értéket.
            Lejárati riasztásnál döntsd el, hogy felhasználod-e a tételt, vagy törölni kell.
          </Step>
        </div>
      </Section>

      {/* Utánkövetések */}
      <Section id="a-utankovetes" icon={ListChecks} title="Utánkövetések kezelése" color="bg-orange-50 text-orange-800">
        <div className="space-y-4">
          <Step n={1} title="Automatikus ütemezés">
            Amikor egy kérelmet <Badge label="Jóváhagyva" color="bg-green-100 text-green-700" /> státuszba helyezel,
            a rendszer automatikusan ütemez két utánkövetési kérdőívet (30 és 90 napra).
          </Step>
          <Step n={2} title="Esedékes utánkövetések">
            Dashboard → Utánkövetések. Látod az összes esedékes, teljesített és lejárt utánkövetést.
            A lejártak piros jelzéssel kiemeltek — emlékeztetheted a felhasználót üzenet küldésével.
          </Step>
          <Step n={3} title="Kitöltött kérdőívek megtekintése">
            Utánkövetés sorában kattints a részletekre. Látod a közérzet-értékelést (1–5 csillag),
            a szöveges megjegyzést és az esetleg feltöltött fotót.
          </Step>
          <Step n={4} title="Manuális utánkövetés hozzáadása">
            A kérelem részletoldalán lehetőség van manuálisan is hozzáadni utánkövetési rekordot
            (pl. telefonos visszajelzés alapján).
          </Step>
        </div>
      </Section>

      {/* Közösségi posztok */}
      <Section id="a-posztok" icon={MessagesSquare} title="Közösségi posztok" color="bg-fuchsia-50 text-fuchsia-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A menhely nevében posztokat tehetsz közzé a platformon. A posztok a látogatók főoldalán
          megjelenő „Neked" (For You) feedben jelennek meg, és megoszthatók közösségi médiában is.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Poszt létrehozása">
            Dashboard → Posztok → Írd be a szöveget. Csatolhatsz képet, és egy entitást:
            valamelyik menhelyeden lévő <strong>állatot</strong>, <strong>eseményt</strong> vagy <strong>gyűjtést</strong>.
            A csatolt kártya a hírfolyamban kattintható.
          </Step>
          <Step n={2} title="Közzétesz és törlés">
            A „Közzétesz" gombra kattintva a poszt azonnal megjelenik a főoldalon.
            Szerkesztés nem lehetséges — ha hibás, töröld és hozz létre újat.
          </Step>
          <Step n={3} title="Lájkok és megosztás">
            A látogatók lájkolhatják a posztot (bejelentkezés szükséges).
            A megosztás gombbal Facebook, X (Twitter), WhatsApp vagy vágólapra másolva terjeszthető.
          </Step>
        </div>
        <Note type="tip">Az állat-kártyás posztok a leghatékonyabbak — közvetlen link az örökbefogadási oldalra.</Note>
        <QuickLink icon={MessagesSquare} label="Posztjaim" href="/dashboard/posts" />
      </Section>

      {/* Adományok */}
      <Section id="a-adomanyok" icon={Heart} title="Adományok és kampányok" color="bg-rose-50 text-rose-800">
        <div className="space-y-4">
          <Step n={1} title="Előfizetési csomagok létrehozása">
            Dashboard → Előfizetési csomagok → Csomag hozzáadása.
            Add meg a csomag nevét, leírását és összegét (minimum 175 Ft/hó).
            Az aktív csomagok megjelennek a menhely publikus profilján.
          </Step>
          <Step n={2} title="Kampány indítása">
            Dashboard → (Kampányok menü a navigációban). Új kampány célja, leírása, célosszege és
            határideje adható meg. A kampány Super Admin jóváhagyás után válik aktívvá és publikusan elérhetővé.
          </Step>
          <Step n={3} title="Előfizetések listája">
            Dashboard → Előfizetések. Látod az aktív és lemondott előfizetőket, a csomag típusát és az előfizetés kezdetét.
            Szükség esetén adminisztrátori lemondás is lehetséges a sorban lévő gombbal.
          </Step>
          <Step n={4} title="Stripe Connect beállítása">
            Dashboard → Menhely beállítások → Stripe fiók csatlakoztatása.
            Ez szükséges az adományok fogadásához. Az összeg automatikusan a menhely bankszámlájára kerül
            (4% platform kezelési díj levonásával).
          </Step>
          <Step n={5} title="Csomagok és kampányok szerkesztése és törlése">
            Az előfizetési csomagok neve, leírása és összege szerkeszthető. Aktív előfizetőkkel rendelkező
            csomag törlésekor az előfizetések az aktuális időszak végéig aktívak maradnak.
            Kampányok PENDING vagy REJECTED állapotban szerkeszthetők és törölhetők; ACTIVE kampány szerkesztése
            Super Admin jóváhagyást igényelhet.
          </Step>
        </div>
      </Section>

      {/* Elemzések */}
      <Section id="a-elemzesek" icon={BarChart2} title="Elemzések (Analytics)" color="bg-indigo-50 text-indigo-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A dashboard alján négy analitikai panel segíti a döntéshozatalt:
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-gray-100 bg-white p-4 text-sm">
          {[
            { title: "UC-01 Örökbefogadási trend", desc: "Havi lebontásban mutatja, hány állat lett örökbe fogadva, fajonkénti bontásban. Területdiagram + fajta-donut." },
            { title: "UC-02 Kapacitáskihasználtság", desc: "Menhelyenként mutatja az aktuális kihasználtságot a férőhelyek százalékában. Tartózkodási idő-histogram + SVG mérőóra." },
            { title: "UC-03 Bejelentési statisztika", desc: "Elveszett/megtalált/kóbor bejelentések megoszlása és városonkénti eloszlás." },
            { title: "UC-04 Visszakerülési ráta", desc: "Hány örökbefogadott állat kerül vissza. Lakástípus szerinti bontás és örökbefogadó-profil radarok." },
          ].map(({ title, desc }) => (
            <div key={title} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
              <p className="font-semibold text-gray-800">{title}</p>
              <p className="text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <Note type="info">A Super Admin az összes menhely adatát együtt vagy külön-külön szűrheti. A Menhely Admin csak a saját menhelyét látja.</Note>
      </Section>

      {/* Beállítások */}
      <Section id="a-beallitasok" icon={Settings} title="Menhely beállításai" color="bg-gray-50 text-gray-800">
        <div className="space-y-4">
          <Step n={1} title="Alap adatok">
            Dashboard → Menhely beállítás: Cím, telefonszám, e-mail, weboldal, leírás és örökbefogadási feltételek szerkesztése.
            A módosítások azonnal megjelennek a publikus profilon.
          </Step>
          <Step n={2} title="Logó és borítókép">
            A beállítások oldalon tölthető fel logó és borítókép.
            Javasolt méretek: logó 200×200 px, borítókép 1200×400 px.
          </Step>
          <Step n={3} title="Stripe Connect">
            A Stripe fiók csatlakoztatása nélkül az adományok és előfizetések nem működnek.
            Csatlakoztatás → Stripe onboarding felületen add meg a bankszámlát és cégadatokat.
          </Step>
          <Step n={4} title="Kapacitás beállítás">
            Add meg a menhely tényleges férőhelyei számát — ez jelenik meg a kapacitáskihasználtság panelen (UC-02).
          </Step>
        </div>
        <QuickLink icon={Settings} label="Menhely beállítások" href="/dashboard/settings" />
      </Section>

      {/* Ideiglenes befogadók */}
      <Section id="a-befogadok" icon={Home} title="Ideiglenes befogadók kezelése" color="bg-violet-50 text-violet-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A menhely kereshet és jóváhagyhat ideiglenes befogadókat (foster carers) az állatokhoz, akik
          átmenetileg otthont biztosítanak amíg az állat végleges örökbefogadóra vár.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Befogadói kérelmek kezelése">
            Dashboard → Ideiglenes befogadás → Függőben lévők. Tekintsd meg a kérelmező profilját
            (lakhatás, tapasztalat), és fogadd el vagy utasítsd el.
          </Step>
          <Step n={2} title="Befogadás hozzárendelése állathoz">
            Egy jóváhagyott befogadóhoz hozzárendelheted az adott állatot. Az állat státusza automatikusan
            <Badge label="Átmeneti gondozás" color="bg-purple-100 text-purple-700 mx-1" />-ra vált.
          </Step>
          <Step n={3} title="Ellátmány-napló megtekintése">
            A befogadó naplózza a felhasznált ellátmányokat. Dashboard → Ideiglenes befogadás → Ellátmány napló.
            Innen követhető, hogy mennyi takarmányt és gyógyszert igényel az adott állat.
          </Step>
          <Step n={4} title="Befogadás lezárása">
            Amikor az állat visszakerül a menhelyre (örökbefogadás előtt vagy más okból),
            zárd le a befogadási rekordot. A befogadó értesítést kap.
          </Step>
        </div>
        <QuickLink icon={Home} label="Ideiglenes befogadás" href="/dashboard/foster" />
      </Section>

      {/* Kennelek */}
      <Section id="a-kenneleks" icon={Building2} title="Kennelek kezelése" color="bg-amber-50 text-amber-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A kennel-modul segítségével nyilvántarthatod a menhely fizikai elhelyezési egységeit (kenneleket,
          ketreceket, szobákat) és azt, hogy melyik állat hol tartózkodik.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Kennel felvétele">
            Dashboard → Kennelek → <strong>„Kennel hozzáadása"</strong>.
            Add meg a kennel nevét, típusát (beltéri / kültéri / karantén) és kapacitását.
          </Step>
          <Step n={2} title="Állat hozzárendelése">
            Egy kennel részletoldalán rendelhetsz hozzá állatot. Egy kennel egyszerre annyi állatot
            tarthat, amennyit a kapacitása enged.
          </Step>
          <Step n={3} title="Kapacitáskihasználtság">
            A Dashboard UC-02 panelen látható, hogy az összes kennel milyen arányban foglalt.
            A piros jelzés a 100%-os kihasználtságot mutatja.
          </Step>
          <Step n={4} title="Szerkesztés és törlés">
            A kennel neve, típusa és kapacitása szerkeszthető a kennel részletoldalán.
            Törlés előtt minden hozzárendelt állatot el kell mozgatni — üres, karbantartáson kívüli kennel törölhető.
          </Step>
        </div>
        <Note type="info">A kennelek karbantartásba helyezhetők (maintenance state), ami ideiglenesen kizárja őket a kapacitásból.</Note>
        <QuickLink icon={Building2} label="Kennelek" href="/dashboard/kennels" />
      </Section>

      {/* Áthelyezések */}
      <Section id="a-atelyezesek" icon={ArrowLeftRight} title="Állat áthelyezések" color="bg-indigo-50 text-indigo-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Áthelyezések rögzítésével dokumentálhatsz menhely-közi állat-mozgásokat.
          A Super Admin az összes menhelyt érintő áthelyezést is látja.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Áthelyezés indítása">
            Dashboard → Áthelyezések → <strong>„Új áthelyezés"</strong>. Válaszd ki az állatot,
            a cél menhelyt, add meg a tervezett dátumot és az indokot.
          </Step>
          <Step n={2} title="Státusz követése">
            Az áthelyezés státuszai:
            <Badge label="Tervezett" color="bg-yellow-100 text-yellow-700 mx-1" />,
            <Badge label="Folyamatban" color="bg-blue-100 text-blue-700 mx-1" />,
            <Badge label="Teljesítve" color="bg-green-100 text-green-700 mx-1" />,
            <Badge label="Törölve" color="bg-red-100 text-red-700 mx-1" />.
            Teljesítés után az állat automatikusan a célmenhelyre kerül.
          </Step>
          <Step n={3} title="Dokumentumok">
            Áthelyezési engedélyek és egészségügyi dokumentumok csatolhatók az áthelyezési rekordhoz.
          </Step>
          <Step n={4} title="Szerkesztés és törlés">
            PLANNED státuszú áthelyezésnél módosítható a dátum és az indok.
            Törlés helyett inkább <Badge label="Törölve" color="bg-red-100 text-red-700 mx-1" /> státuszba helyezés
            ajánlott, hogy az előzmény megmaradjon.
          </Step>
        </div>
        <QuickLink icon={ArrowLeftRight} label="Áthelyezések" href="/dashboard/transfers" />
      </Section>

      {/* Események admin */}
      <Section id="a-esemenyek" icon={CalendarDays} title="Események kezelése" color="bg-teal-50 text-teal-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          Szervez nyílt napot, örökbefogadási napot, vagy önkéntes gyűjtést? Az Események modullal
          meghirdetheted, kezelheted a regisztrációkat és értesítheted a résztvevőket.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Esemény létrehozása">
            Dashboard → Események → <strong>„Új esemény"</strong>.
            Add meg a nevet, leírást, típust (OPEN_DAY, ADOPTION_DAY, VOLUNTEER_DAY, FUNDRAISER, OTHER),
            a helyszínt, dátumot és a maximális létszámot.
          </Step>
          <Step n={2} title="Regisztrációk kezelése">
            Az esemény részletoldalán látható az összes regisztrált személy.
            Minden regisztrációt manuálisan is visszaigazolhatsz vagy elutasíthatsz.
          </Step>
          <Step n={3} title="Értesítések résztvevőknek">
            Az esemény szerkesztésénél az „Értesítés küldése" gombbal értesítheted az összes
            regisztrált résztvevőt (pl. helyszínváltozás esetén).
          </Step>
          <Step n={4} title="Esemény lezárása">
            Az esemény után zárhatod le azt — a regisztrációk archiválódnak, a résztvevői lista megmarad.
          </Step>
          <Step n={5} title="Szerkesztés és törlés">
            Az esemény részletei (leírás, időpont, helyszín, maximális létszám) szerkeszthetők mindaddig,
            amíg az esemény le nincs zárva. Törlés esetén az összes regisztráció is törlődik —
            a résztvevők automatikus értesítést kapnak a lemondásról.
          </Step>
        </div>
        <QuickLink icon={CalendarDays} label="Események kezelése" href="/dashboard/events" />
      </Section>

    </div>
  );
}

function SuperAdminContent() {
  return (
    <div className="space-y-10">

      {/* Platform menedzsment */}
      <Section id="s-platform" icon={ShieldCheck} title="Platform menedzsment" color="bg-violet-50 text-violet-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A Super Admin a teljes platform felett rendelkezik: látja az összes menhelyt, felhasználót és tartalmat.
          A dashboard szűrővel bármely menhely adatait megtekintheti.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Összes menhely kezelése">
            Dashboard → Platform → Menhelyek. Látod a teljes listát (aktív, inaktív, hitelesített).
            Bármelyik menhely oldalára navigálhatsz, megnyithatod a dashboardjukat szűrővel.
          </Step>
          <Step n={2} title="Menhely létrehozása">
            A Menhelyek oldalon Super Adminként felvehetsz új menhelyt és kötheted össze a már regisztrált
            SHELTER_ADMIN jogosultságú felhasználóval (ShelterAdmin kapcsolat).
          </Step>
          <Step n={3} title="Menhely hitelesítése">
            A menhely profiljánál engedélyezheted vagy visszavonhatod a
            <Badge label="Hitelesített" color="bg-green-100 text-green-700 mx-1" /> státuszt.
            A hitelesített menhelyek külön jelzéssel jelennek meg a publikus listán.
          </Step>
          <Step n={4} title="Analytics összes menhelyre">
            A dashboard Analytics szekciójában a Super Admin az összes menhelyre kiterjedő adatokat lát.
            A menhely-jelölőnégyzetekkel szűkítheti az elemzést tetszőleges kombinációra.
          </Step>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <QuickLink icon={Building2} label="Menhelyek (Platform)" href="/dashboard/shelters" />
          <QuickLink icon={BarChart2} label="Dashboard" href="/dashboard" />
        </div>
      </Section>

      {/* Gyűjtések kezelése */}
      <Section id="s-gyujtesek" icon={Heart} title="Gyűjtések kezelése" color="bg-blue-50 text-blue-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A Gyűjtések oldal az összes menhelyen lévő kampányt mutatja, státusztól függetlenül.
          Innen jóváhagyhatók a beérkező kampányok és a kérvény-sablonok is.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Összes kampány megtekintése">
            Dashboard → Adományozás → Gyűjtések. Az oldal tetején státusz-szűrők láthatók:
            <Badge label="Összes" color="bg-gray-100 text-gray-600 mx-1" />,
            <Badge label="Jóváhagyásra vár" color="bg-yellow-100 text-yellow-700 mx-1" />,
            <Badge label="Aktív" color="bg-green-100 text-green-700 mx-1" />,
            <Badge label="Befejezett" color="bg-blue-100 text-blue-700 mx-1" />,
            <Badge label="Visszautasított" color="bg-red-100 text-red-600 mx-1" />.
            A táblázatban minden kampány neve, menhelye, összegyűlt és célösszege, státusza és dátuma látható.
          </Step>
          <Step n={2} title="Kampány jóváhagyása">
            Ha van PENDING kampány, az oldal alján megjelenik a jóváhagyás panel.
            Olvasd el a leírást és a célösszeget. Kattints az <strong>„Elfogad"</strong> gombra —
            a kampány ACTIVE státuszba kerül és azonnal megjelenik a nyilvános Támogatás oldalon.
            A menhely adminisztrátor értesítést kap.
          </Step>
          <Step n={3} title="Kampány elutasítása">
            A <strong>„Elutasít"</strong> gombra kattintva a kampány REJECTED státuszba kerül és nem
            jelenik meg nyilvánosan. A menhely adminisztrátor értesítést kap az elutasításról.
          </Step>
          <Step n={4} title="Kérvény sablonok jóváhagyása">
            Az oldal alján a PENDING_APPROVAL státuszú örökbefogadási kérdőív-sablonok is megjelennek.
            Ellenőrizd a mezőket (nincs-e szenzitív vagy jogellenesen gyűjtött adat), majd fogadd el vagy utasítsd el.
          </Step>
          <Step n={5} title="Értesítések a várakozókról">
            Ha új jóváhagyásra váró elem érkezik, a Super Admin push-értesítést kap
            <Badge label="Kampány jóváhagyásra vár" color="bg-yellow-100 text-yellow-700 mx-1" /> és
            <Badge label="Sablon jóváhagyásra vár" color="bg-yellow-100 text-yellow-700" /> típussal.
          </Step>
        </div>
        <QuickLink icon={Heart} label="Gyűjtések" href="/dashboard/campaigns" />
      </Section>

      {/* Előfizetési csomagok */}
      <Section id="s-csomagok" icon={CheckCircle2} title="Előfizetési csomagok áttekintése" color="bg-emerald-50 text-emerald-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A Super Admin read-only nézetben látja az összes menhely összes havi támogatói csomagját.
          Ez az oldal nem szerkeszthető — a csomagokat a menhely adminisztrátorok kezelik a saját dashboardjukon.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Csomagok áttekintése">
            Dashboard → Adományozás → Előfizetési csomagok. A táblázatban látható:
            csomag neve, menhely neve + városа, összeg (Ft/hó), aktív előfizetők száma, aktív/inaktív állapot.
            A sorok menhelyek szerint ABC-sorrendben, azon belül összeg szerint növekvően jelennek meg.
          </Step>
          <Step n={2} title="Kire vonatkozik?">
            Hasznos a platform bevételi struktúrájának áttekintésekor: melyik menhely mennyi előfizetővel rendelkezik,
            és milyen csomagokat kínál. Szerkesztéshez a menhely adminisztrátorát kell kérni.
          </Step>
        </div>
        <QuickLink icon={CheckCircle2} label="Előfizetési csomagok" href="/dashboard/tiers" />
      </Section>

      {/* Előfizetések */}
      <Section id="s-elofizetesek" icon={Users} title="Előfizetések kezelése" color="bg-violet-50 text-violet-800">
        <p className="text-sm text-gray-600 leading-relaxed">
          A Super Admin az összes menhely összes előfizetését látja egy helyen. Ez az oldal a Menhely Admin
          számára is elérhető, de ők csak a saját menhelyük előfizetéseit látják.
        </p>
        <div className="space-y-4 mt-3">
          <Step n={1} title="Előfizetések listája">
            Dashboard → Adományozás → Előfizetések. Minden sorban látható: előfizető neve, e-mail-je,
            csomag neve, <strong>menhely neve</strong> (csak Super Adminnál jelenik meg),
            összeg (HUF/hó), státusz, előfizetés kezdete.
          </Step>
          <Step n={2} title="Szűrés státusz szerint">
            Az oldal tetején szűrhetsz:
            <Badge label="Összes" color="bg-gray-100 text-gray-600 mx-1" />,
            <Badge label="Aktív" color="bg-green-100 text-green-700 mx-1" />,
            <Badge label="Lemondott" color="bg-red-100 text-red-600 mx-1" />.
          </Step>
          <Step n={3} title="Adminisztrátori lemondás">
            Aktív előfizetésnél a sor végén megjelenik a „Lemondás" gomb.
            Megerősítés után az előfizetés CANCELLED státuszba kerül.
            Ezt csak kivételes esetben alkalmazd (pl. felhasználói kérésre, visszaéléskor).
          </Step>
          <Step n={4} title="Adatok exportálása">
            Az Adományok CSV és Előfizetők CSV gombokkal exportálhatod a listát,
            pl. pénzügyi riporthoz vagy könyvelési célokra.
          </Step>
        </div>
        <QuickLink icon={Users} label="Előfizetések" href="/dashboard/subscriptions" />
      </Section>

      {/* Menhelyek kezelése */}
      <Section id="s-menhelyek" icon={Building2} title="Menhelyek kezelése" color="bg-emerald-50 text-emerald-800">
        <div className="space-y-4">
          <Step n={1} title="Menhely profil szerkesztése">
            A Super Admin bármely menhely adatait szerkesztheti (pl. helycím, kapacitás javítása),
            ha az adminisztrátor nem elérhető.
          </Step>
          <Step n={2} title="Admin hozzárendelése">
            A menhelyhez több SHELTER_ADMIN felhasználó rendelhető. Mindegyik teljes hozzáféréssel bír
            az adott menhely dashboardjához.
          </Step>
          <Step n={3} title="Menhely deaktiválása">
            Az isActive jelző kikapcsolásával a menhely eltűnik a publikus listáról,
            de az adatok megmaradnak és az admin bejelentkezhet.
          </Step>
        </div>
        <Note type="warn">A menhely törlése az összes kapcsolódó adatot (állatok, kérelmek, üzenetek, készlet) véglegesen törli. Inkább deaktiválást javasolt alkalmazni.</Note>
      </Section>

      {/* Elemzések */}
      <Section id="s-elemzesek" icon={BarChart2} title="Teljes analitika" color="bg-indigo-50 text-indigo-800">
        <div className="space-y-4">
          <Step n={1} title="Összes menhely egyidőben">
            A dashboard Analytics szekciójában alapértelmezetten az összes menhely adatai összesítve jelennek meg.
            A szűrőpanelen pipáld ki/be az egyes menhelyeket.
          </Step>
          <Step n={2} title="ETL frissítés">
            Az analitikai adatok az adattárházból (DWH) érkeznek. Az ETL-futtatással frissíthetők:
            <code className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">POST /api/etl</code>
            (védett endpoint, ETL_SECRET szükséges). Érdemes napi ütemezésbe tenni.
          </Step>
          <Step n={3} title="UC-01 – UC-04 értelmezése">
            Lásd a Menhely Admin Analytics szekcióban a részletes magyarázatot.
            Super Adminként az összes menhely cross-filter-ezhető.
          </Step>
        </div>
      </Section>

    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [tab, setTab] = useState<TabId>("user");

  useEffect(() => {
    if (status === "authenticated") {
      if (role === "SUPER_ADMIN")   setTab("superadmin");
      else if (role === "SHELTER_ADMIN") setTab("admin");
    }
  }, [status, role]);

  const visibleTabs = TABS.filter(t => {
    if (t.id === "superadmin") return role === "SUPER_ADMIN";
    if (t.id === "admin")      return role === "SHELTER_ADMIN" || role === "SUPER_ADMIN";
    return true;
  });

  const activeTab = visibleTabs.find(t => t.id === tab) ? tab : (visibleTabs[0]?.id ?? "user");
  const toc = activeTab === "user" ? TOC_USER : activeTab === "admin" ? TOC_ADMIN : TOC_SUPER;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Ismerd meg a platformot</h1>
          <p className="mt-2 text-gray-500">
            Válaszd ki a szerepkörödet, és lépj tovább a vonatkozó útmutatóhoz.
          </p>

          {/* Tab selector */}
          <div className="mt-6 inline-flex gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                  activeTab === t.id ? t.color + " border shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">

          {/* Sticky TOC */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Tartalom</p>
              <nav className="space-y-0.5">
                {toc.map(({ id, label, icon: Icon }) => (
                  <a key={id} href={`#${id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            {activeTab === "user"       && <UserContent />}
            {activeTab === "admin"      && <AdminContent />}
            {activeTab === "superadmin" && <SuperAdminContent />}

            {/* Footer CTA */}
            <div className="mt-10 rounded-2xl bg-brand-600 p-8 text-center text-white">
              <h3 className="text-xl font-bold">Nem találtad meg a választ?</h3>
              <p className="mt-2 text-sm text-brand-100">Írj nekünk és segítünk!</p>
              <a href="mailto:info@allatimenhelyek.hu"
                className="mt-4 inline-block rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors"
              >
                info@allatimenhelyek.hu
              </a>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

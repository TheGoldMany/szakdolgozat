import type { Tour } from "@/components/onboarding/tour";

/**
 * Oldalankénti bemutatók.
 *
 * MIÉRT EGY HELYEN: a bemutatót a `PageTour` komponens rakja ki, ami EGYSZER
 * van beépítve az elrendezésbe, és az útvonalból választja ki a megfelelő
 * lépéssorozatot. Így új bemutató felvételéhez nem kell hozzányúlni az
 * oldalhoz — elég ide egy bejegyzés (és a kiemelendő elemre egy `data-tour`).
 *
 * MIT ÍRJUNK EGY LÉPÉSBE: azt, ami a képernyőről NEM derül ki. „Itt vannak a
 * szűrők" fölösleges — az látszik. „A szűrő a címsorba kerül, tehát a
 * találatok megoszthatók" viszont hasznos. Ahol nincs ilyen, ott inkább ne
 * legyen lépés.
 *
 * A `data-tour` horgonyokat a kiemelendő elemre kell tenni. Ha egy horgony
 * hiányzik vagy épp rejtve van (pl. a fejléc menüje telefonon), a lépés
 * MAGÁTÓL kimarad — ezért lehet ugyanaz a bemutató asztali gépen és telefonon.
 */

/** Minden nyilvános bemutató, azonosító szerint. */
export const TOURS: Record<string, Tour> = {
  home: {
    id: "home",
    version: 1,
    title: "Kezdőlap",
    steps: [
      {
        selector: null,
        title: "Üdv az ÁllatiMenhelyek.hu-n!",
        body:  "Ez az oldal magyarországi menhelyek örökbefogadható állatait gyűjti egy helyre. Pár lépésben megmutatjuk, mit hol találsz. Bármikor kihagyhatod.",
      },
      {
        selector: '[data-tour="home-search"]',
        title: "Keresés",
        body:  "Írj be fajtát, nevet vagy várost. A keresés az állatlistára visz, ahol tovább szűkítheted a találatokat.",
      },
      {
        selector: '[data-tour="nav-animals"]',
        title: "Állatok",
        body:  "Az összes örökbefogadható állat, szűrhetően faj, méret, nem, település és tulajdonságok szerint — például oltott-e, vagy kijön-e gyerekkel.",
      },
      {
        selector: '[data-tour="nav-map"]',
        title: "Térkép",
        body:  "Menhelyek, elveszett és talált állatok bejelentései, valamint állatorvosi rendelők — mind egy térképen.",
      },
      {
        selector: '[data-tour="nav-reports"]',
        title: "Bejelentések",
        body:  "Elveszett vagy talált állatot itt jelenthetsz be. A közeli menhelyek automatikusan értesítést kapnak róla.",
      },
      {
        selector: null,
        title: "Ennyi az egész",
        body:  "A részletes leírásokat a lap alján lévő Súgóban találod, szerepkörök szerint. Ezt a bemutatót pedig bármikor újranézheted a fejléc kérdőjel gombjával.",
      },
    ],
  },

  animals: {
    id: "animals",
    version: 1,
    title: "Állatok böngészése",
    steps: [
      {
        selector: '[data-tour="animal-filters"]',
        title: "Szűrés",
        body:  "Faj, méret, nem, város és tulajdonságok szerint szűkíthetsz. A szűrők a webcímbe is bekerülnek, tehát a találati listát el tudod küldeni másnak.",
      },
      {
        selector: '[data-tour="favorite"]',
        title: "Kedvencek",
        body:  "A szív ikonnal elmentheted azt az állatot, akire visszatérnél. A kedvenceidet a profilodból éred el.",
      },
      {
        selector: null,
        title: "Ami a kártyán nem fér el",
        body:  "Az állat nevére kattintva látod a teljes leírást, az egészségügyi adatokat, és onnan tudsz kérelmet beadni, időpontot foglalni vagy üzenni a menhelynek.",
      },
    ],
  },

  animalDetail: {
    id: "animal-detail",
    version: 1,
    title: "Állat adatlapja",
    steps: [
      {
        selector: '[data-tour="animal-health"]',
        title: "Egészségügyi jelzők",
        body:  "Oltott, ivartalanított, chipezett — és hogy kijön-e gyerekkel, kutyával, macskával. A menhely tölti ki; ami nincs kiírva, arról nincs adat.",
      },
      {
        selector: '[data-tour="adopt"]',
        title: "Örökbefogadási kérelem",
        body:  "Innen indul az örökbefogadás. Ha előbb kérdeznél, ugyanitt tudsz üzenni a menhelynek vagy időpontot kérni személyes találkozóra.",
      },
      {
        selector: '[data-tour="sponsor"]',
        title: "Virtuális örökbefogadás",
        body:  "Ha most nem tudnád hazavinni, havi támogatással is segíthetsz. A támogatóként rendszeresen kapsz hírt róla.",
      },
      {
        selector: '[data-tour="animal-timeline"]',
        title: "Egészségügyi napló",
        body:  "Az oltások és kezelések időrendben. A menhely vezeti, így az örökbefogadás előtt látod az állat előzményeit.",
      },
    ],
  },

  shelterDetail: {
    id: "shelter-detail",
    version: 1,
    title: "Menhely oldala",
    steps: [
      {
        selector: '[data-tour="shelter-help"]',
        title: "Így tudsz segíteni",
        body:  "Önkéntesként rendszeresen bejársz segíteni; ideiglenes befogadóként átmenetileg otthont adsz egy állatnak, amíg gazdára talál. Mindkettőhöz a menhely jóváhagyása kell.",
      },
      {
        selector: '[data-tour="shelter-reviews"]',
        title: "Értékelések",
        body:  "Bejelentkezve te is értékelheted a menhelyet, egy–öt csillaggal és pár mondattal. Menhelyenként egy értékelésed lehet; ha meggondolnád magad, töröld és írj újat.",
      },
    ],
  },

  shelters: {
    id: "shelters",
    version: 1,
    title: "Menhelyek",
    steps: [
      {
        selector: null,
        title: "Menhelyek listája",
        body:  "Minden regisztrált, aktív menhely. A hitelesített jelzés azt jelenti, hogy az üzemeltető ellenőrizte a menhely adatait.",
      },
      {
        selector: null,
        title: "Mit találsz egy menhely oldalán",
        body:  "Az örökbefogadható állataikat, az örökbefogadás feltételeit, a valódi ügyfelektől származó értékeléseket, és innen tudsz önkéntesnek vagy ideiglenes befogadónak jelentkezni.",
      },
    ],
  },

  map: {
    id: "map",
    version: 1,
    title: "Térkép",
    steps: [
      {
        selector: '[data-tour="map-filters"]',
        title: "Rétegek és szűrők",
        body:  "Menhelyek, bejelentések és állatorvosok külön kapcsolhatók. A bejelentéseket típus (elveszett, talált, kóbor) és állapot szerint is szűkítheted.",
      },
      {
        selector: '[data-tour="map-filters-mobile"]',
        title: "Szűrők",
        body:  "Ezzel a gombbal nyílik a szűrőpanel: menhelyek, bejelentések és állatorvosok külön kapcsolhatók.",
      },
      {
        selector: null,
        title: "Jelölők",
        body:  "Egy jelölőre koppintva megjelenik a részlet: a menhelynél az örökbefogadható állatok száma és az oldalára vezető hivatkozás, a bejelentésnél a leírás és az elérhetőség.",
      },
    ],
  },

  reports: {
    id: "reports",
    version: 1,
    title: "Bejelentések",
    steps: [
      {
        selector: null,
        title: "Elveszett, talált, kóbor",
        body:  "Három fajta bejelentés van. Az elveszett a te állatod, a talált egy idegen állat, akit megtaláltál, a kóbor pedig gazdátlanul kóborló állat.",
      },
      {
        selector: '[data-tour="report-new"]',
        title: "Új bejelentés",
        body:  "Kötelező a leírás, a település és az elérhetőséged; fotót feltölteni érdemes, de nem kötelező. A KÓBOR bejelentésről a környékbeli menhelyek automatikusan értesítést kapnak, tehát nem kell külön telefonálnod.",
      },
      {
        selector: null,
        title: "Ha megkerült",
        body:  "A saját bejelentésedet lezárhatod, ha az állat megkerült — így nem marad fönn fölöslegesen, és nem keresik mások is.",
      },
    ],
  },

  events: {
    id: "events",
    version: 1,
    title: "Események",
    steps: [
      {
        selector: null,
        title: "Menhelyi programok",
        body:  "Örökbefogadási napok, nyílt napok, adománygyűjtések és önkéntes napok. Csak a közelgő, meghirdetett események látszanak.",
      },
      {
        selector: null,
        title: "Jelentkezés",
        body:  "A részleteknél tudsz jelentkezni, és megadhatod, hányan jöttök. Ha van létszámkorlát, a kísérők is beleszámítanak a helyekbe.",
      },
    ],
  },

  donate: {
    id: "donate",
    version: 1,
    title: "Támogatás",
    steps: [
      {
        selector: null,
        title: "Kétféle támogatás",
        body:  "Egyszeri adomány egy konkrét gyűjtésre, vagy havi támogatás, ami folyamatosan segíti a menhelyet. Mindkettő bankkártyával megy, a Stripe-on keresztül.",
      },
      {
        selector: null,
        title: "Mire megy a pénz",
        body:  "Minden gyűjtésnél látod a célt és az eddig összegyűlt összeget. A profilodon visszanézheted a támogatásaidat, és ott mondhatod le a havi előfizetést is.",
      },
    ],
  },

  applications: {
    id: "applications",
    version: 1,
    title: "Kérelmeim",
    steps: [
      {
        selector: null,
        title: "A kérelem útja",
        body:  "Függőben → Elbírálás alatt → Elfogadva vagy Elutasítva. Minden állapotváltásról értesítést kapsz, e-mailt pedig a végleges döntésről.",
      },
      {
        selector: null,
        title: "Visszavonás",
        body:  "Amíg a menhely nem kezdte el elbírálni, a kérelmedet visszavonhatod — például ha időközben másik állatot választottál.",
      },
    ],
  },

  appointments: {
    id: "appointments",
    version: 1,
    title: "Időpontjaim",
    steps: [
      {
        selector: null,
        title: "Kérés, nem foglalás",
        body:  "Az időpont akkor él, ha a menhely visszaigazolta. A kért és a visszaigazolt időpont eltérhet — a visszaigazolásról értesítést kapsz.",
      },
      {
        selector: null,
        title: "Lemondás",
        body:  "Ha mégsem tudsz menni, mondd le: a menhely így másnak tudja adni az idősávot.",
      },
    ],
  },

  messages: {
    id: "messages",
    version: 1,
    title: "Üzenetek",
    steps: [
      {
        selector: null,
        title: "Beszélgetés állatonként",
        body:  "Minden állathoz külön beszélgetés tartozik, még ha ugyanazzal a menhellyel is leveleztek. Így nem keverednek össze, ha többük iránt érdeklődsz.",
      },
      {
        selector: null,
        title: "Értesítés",
        body:  "Új üzenetről értesítést kapsz, és ha telepítetted a mobilalkalmazást, oda push értesítést is — hacsak ki nem kapcsoltad.",
      },
    ],
  },

  profile: {
    id: "profile",
    version: 1,
    title: "Profil",
    steps: [
      {
        selector: '[data-tour="profile-data"]',
        title: "Elérhetőségek",
        body:  "A menhely innen veszi a telefonszámodat és a címedet, amikor egy kérelmet elbírál. Érdemes kitölteni, mielőtt kérelmet adsz be.",
      },
      {
        selector: '[data-tour="adopter-profile"]',
        title: "Örökbefogadói bemutatkozás",
        body:  "Ez MINDEN kérelmedbe automatikusan bekerül, tehát egyszer kell megírni. A menhely ebből ismer meg téged, nem csak egy nevet lát.",
      },
      {
        selector: null,
        title: "A többi adatod",
        body:  "Lejjebb a támogatásaid, virtuális örökbefogadásaid és az örökbefogadási előzményed. A jelszóváltás, az adataid letöltése és a fióktörlés is itt van, a lap alján — és ugyanezek a Beállítások oldalon is.",
      },
    ],
  },

  favorites: {
    id: "favorites",
    version: 1,
    title: "Kedvenceim",
    steps: [
      {
        selector: null,
        title: "A jelölt állataid",
        body:  "Itt gyűlnek a szívvel megjelölt állatok. A jelölés csak neked látszik — a menhely nem kap róla értesítést.",
      },
    ],
  },

  notifications: {
    id: "notifications",
    version: 1,
    title: "Értesítések",
    steps: [
      {
        selector: null,
        title: "Minden egy helyen",
        body:  "Kérelem-, időpont-, üzenet- és közösségi értesítések. Az olvasatlanok elöl vannak, és egy kattintással mindet olvasottnak jelölheted.",
      },
      {
        selector: null,
        title: "Hova visznek",
        body:  "Az értesítésre kattintva oda jutsz, amiről szól — a kérelemhez, az időponthoz vagy a beszélgetéshez.",
      },
    ],
  },

  volunteers: {
    id: "volunteers",
    version: 1,
    title: "Önkéntességeim",
    steps: [
      {
        selector: null,
        title: "Jelentkezéseid állapota",
        body:  "Menhelyenként egy jelentkezésed lehet. Amíg elbírálás alatt van, még nem tudsz feladatra jelentkezni.",
      },
      {
        selector: null,
        title: "Feladatok",
        body:  "Aktív önkéntesként a menhely meghirdetett feladataira tudsz feljelentkezni. Új jelentkezéshez keresd fel a menhely oldalát.",
      },
    ],
  },

  foster: {
    id: "foster",
    version: 1,
    title: "Ideiglenes befogadás",
    steps: [
      {
        selector: null,
        title: "Mi ez pontosan",
        body:  "Az ideiglenes befogadó átmenetileg otthont ad egy állatnak, amíg gazdára talál. Hogy a menhely mit biztosít hozzá (eledel, állatorvos), azt velük kell egyeztetni — menhelyenként eltér.",
      },
      {
        selector: null,
        title: "Amit megadsz",
        body:  "Milyen állatot vállalsz, mekkorát, és tudsz-e elkülönítést biztosítani. Ha egyik állatfajt sem jelölöd meg, az azt jelenti: bármelyiket.",
      },
    ],
  },

  followups: {
    id: "followups",
    version: 1,
    title: "Utánkövetés",
    steps: [
      {
        selector: null,
        title: "Miért kérdezünk rá",
        body:  "Sikeres örökbefogadás után 1 héttel, 1 hónappal és 3 hónappal kérünk rövid visszajelzést. A menhely ebből tudja, hogy rendben van-e az állat.",
      },
      {
        selector: null,
        title: "Mit kell csinálni",
        body:  "Egy csillagos értékelés és pár mondat elég. Fotót is feltölthetsz — a menhelyeknek ez szokott a legnagyobb öröm lenni.",
      },
    ],
  },

  connections: {
    id: "connections",
    version: 1,
    title: "Ismerősök",
    steps: [
      {
        selector: null,
        title: "Miért van ismerős",
        body:  "A Napi állatok képfolyamában alapból az ismerőseid képeit látod. Az ismerősség kölcsönös: akkor jön létre, ha mindketten bejelöltétek egymást.",
      },
      {
        selector: null,
        title: "Keresés",
        body:  "Név szerint kereshetsz. A találat mellett rögtön látszik, hogy már ismerősök vagytok-e, vagy vár-e válaszra egy jelölés.",
      },
    ],
  },

  daily: {
    id: "daily",
    version: 1,
    title: "Napi állatok",
    steps: [
      {
        selector: null,
        title: "Napi kép",
        body:  "Képek az állataidról vagy a menhely lakóiról. A képfolyam 24 órás: ami ennél régebbi, kikerül belőle — de a naptárban bármikor visszanézhető.",
      },
      {
        selector: null,
        title: "Kit látsz",
        body:  "Alapból csak az ismerőseidet. Ha kéred, a rendszer ajánlott és felkapott képeket is mutat — ezt bármikor visszavonhatod.",
      },
    ],
  },
};

/** Útvonal → bemutató. A mintázatos találatok a pontos egyezés UTÁN jönnek. */
const EXACT: Record<string, string> = {
  "/":                   "home",
  "/animals":            "animals",
  "/shelters":           "shelters",
  "/map":                "map",
  "/reports":            "reports",
  "/events":             "events",
  "/donate":             "donate",
  "/applications":       "applications",
  "/appointments":       "appointments",
  "/messages":           "messages",
  "/profile":            "profile",
  "/favorites":          "favorites",
  "/notifications":      "notifications",
  "/volunteers":         "volunteers",
  "/foster":             "foster",
  "/followups":          "followups",
  "/profile/ismerosok":  "connections",
  "/profile/napi":       "daily",
};

/**
 * Mintázatos útvonalak.
 *
 * A sorrend számít: az első találat nyer. Az aloldalak (`/animals/{slug}`)
 * ezért állnak a lista elején — a `/animals` pontos egyezés már fentebb
 * lekezelte a listaoldalt.
 */
const PATTERNS: { test: RegExp; tour: string }[] = [
  { test: /^\/animals\/[^/]+$/,  tour: "animalDetail" },
  { test: /^\/shelters\/[^/]+$/, tour: "shelterDetail" },
];

/**
 * Bemutatók, amikhez van állandó webcím.
 *
 * A Súgó ebből építi a listáját. Az aloldalak bemutatói (állat, menhely)
 * KIMARADNAK: azokhoz konkrét állat vagy menhely kell, tehát nincs egy
 * általános cím, amire el lehetne vinni a felhasználót.
 */
export function listedTours(): { tour: Tour; href: string }[] {
  return Object.entries(EXACT)
    .map(([href, key]) => ({ tour: TOURS[key], href }))
    .filter((e): e is { tour: Tour; href: string } => !!e.tour)
    .sort((a, b) => a.tour.title.localeCompare(b.tour.title, "hu"));
}

/**
 * Melyik bemutató tartozik ehhez az útvonalhoz?
 *
 * A nyelvi előtagot NEM kell levágni: a hívó a `@/i18n/navigation`
 * `usePathname`-jét használja, ami már előtag nélküli utat ad.
 */
export function tourForPath(pathname: string): Tour | null {
  const path = pathname.replace(/\/+$/, "") || "/";

  const exact = EXACT[path];
  if (exact) return TOURS[exact] ?? null;

  for (const { test, tour } of PATTERNS) {
    if (test.test(path)) return TOURS[tour] ?? null;
  }
  return null;
}

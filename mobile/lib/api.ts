import * as SecureStore from "expo-secure-store";

/**
 * A backend címe.
 *
 * Build időben behelyettesített környezeti változóból jön (Expo SDK 56:
 * `EXPO_PUBLIC_` előtagú változók a `process.env`-ből érhetők el), így lokális
 * fejlesztéshez nem kell a fájlt átírni — elég egy `.env` a mobile/ mappában.
 *
 * FIGYELEM: a tartalék érték szándékosan a `www`-s változat, mert eddig is az
 * volt. A projektben nyitott ügy, hogy a webes `NEXT_PUBLIC_APP_URL`, a Stripe
 * webhook-végpont és ez a konstans ugyanarra a gazdagépre mutat-e. Ezt NEM
 * döntöm el itt: egy éles URL csendben átírása rosszabb, mint a jelenlegi
 * állapot megtartása. Amikor kiderül, melyik a helyes, itt és a Vercel
 * környezeti változóiban EGYSZERRE kell javítani.
 */
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://www.allatimenhelyek.hu";

/** Mi történt? Ebből tud a felület értelmes üzenetet írni. */
export type ApiErrorKind =
  | "offline"       // a kérés el sem ért a szerverig
  | "unauthorized"  // lejárt vagy érvénytelen munkamenet
  | "notFound"      // nincs ilyen tartalom
  | "client"        // a kérés hibás volt (egyéb 4xx)
  | "server";       // a szerver hibázott (5xx vagy értelmezhetetlen válasz)

/**
 * Hálózati hiba a hívó számára felismerhető formában.
 *
 * Korábban minden hiba `new Error("HTTP 500")`-ként jött, a `fetch` dobása
 * pedig ugyanúgy `Error`-ként — tehát a felület nem tudta megkülönböztetni a
 * „nincs net"-et a szerverhibától, és a felhasználó minden esetre ugyanazt az
 * üzenetet kapta (vagy semmit).
 */
export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    /** A HTTP állapotkód, ha eljutottunk odáig. */
    public readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Magyar üzenet, amit ki lehet írni a felhasználónak. */
  get userMessage(): string {
    switch (this.kind) {
      case "offline":      return "Nincs internetkapcsolat. Ellenőrizd a hálózatot.";
      case "unauthorized": return "A munkamenet lejárt, jelentkezz be újra.";
      case "notFound":     return "A keresett tartalom nem található.";
      case "server":       return "A szerver most nem elérhető. Próbáld újra később.";
      case "client":       return this.message || "A kérés nem sikerült.";
    }
  }
}

/**
 * Lejárt munkamenet kezelése.
 *
 * Az `AuthProvider` regisztrálja ide a kijelentkeztetést. Így nem kell a
 * React-kontextust importálni ebbe a fájlba (az körkörös import lenne), a
 * 401-es válasz mégis ki tudja jelentkeztetni a felhasználót.
 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("session_token");
}

/** A hibaválasz törzsében lévő magyar üzenet, ha van. */
async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // Nem JSON a válasz (pl. proxy hibalapja) – marad az általános üzenet.
  }
  return `HTTP ${res.status}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // A `fetch` csak akkor dob, ha a kérés el sem ért a szerverig.
    throw new ApiError("offline", null, "Nincs internetkapcsolat.");
  }

  if (res.status === 401 || res.status === 403) {
    // A tárolt token érvénytelen – ne maradjon a felhasználó félig
    // bejelentkezett állapotban, ahol minden hívása elhasal.
    onUnauthorized?.();
    throw new ApiError("unauthorized", res.status, await errorMessage(res));
  }
  if (res.status === 404) {
    throw new ApiError("notFound", 404, await errorMessage(res));
  }
  if (res.status >= 500) {
    throw new ApiError("server", res.status, await errorMessage(res));
  }
  if (!res.ok) {
    throw new ApiError("client", res.status, await errorMessage(res));
  }

  // Üres törzs (204, vagy DELETE tartalom nélkül): a `res.json()` ilyenkor
  // dobna, pedig a művelet sikerült.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("server", res.status, "A szerver válasza értelmezhetetlen.");
  }
}

// ── Lekérdezés és lapozás ──────────────────────────────

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * Paraméterek URL-re fűzése, az üres értékeket kihagyva.
 *
 * A jelenlegi végpontok elnézik az üres értéket (`?type=` ugyanazt adja, mint
 * a szűrő nélküli kérés), de ez a megvalósítás véletlene, nem ígéret: a route
 * `...(type && { type })`-ot ír, és az üres sztring történetesen hamis. Egy
 * szigorúbban validáló végpont ugyanerre 400-at adna.
 *
 * Ezért a kihagyást ITT végezzük el, és nem támaszkodunk a szerver
 * elnézésére — a cím is olvashatóbb marad a naplókban.
 */
export function withQuery(path: string, params: QueryParams = {}): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/** A webes lapozott végpontok metaadata. */
export interface PageInfo {
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

/** Egy adag elem és a lapozás állapota, végponttól függetlenül azonos alakban. */
export interface Page<T> {
  items: T[];
  info:  PageInfo;
}

/**
 * Oldalszámos lista lekérése.
 *
 * A webes végpontok a tömböt SAJÁT néven adják vissza (`animals`, `users`, …),
 * a lapozást pedig `pagination` alatt. Ha ezt minden hívó maga bontaná ki, a
 * listakezelő kód sem lehetne közös — ezért itt egyszer normalizáljuk.
 *
 * A hiányzó `pagination` nem hiba: több végpont sima tömböt ad. Ilyenkor egy
 * egyoldalas leírást gyártunk, hogy a hívónak ne kelljen két esetet kezelnie.
 */
export async function getPage<T>(
  path: string, key: string, params: QueryParams = {},
): Promise<Page<T>> {
  const raw = await request<Record<string, unknown>>(withQuery(path, params));

  const items = Array.isArray(raw[key]) ? (raw[key] as T[]) : [];
  const info  = (raw.pagination as PageInfo | undefined) ?? {
    total: items.length, page: 1, limit: items.length, totalPages: 1,
  };
  return { items, info };
}

/**
 * Sima tömböt adó végpont beburkolása egyoldalas lapba.
 *
 * Így a lista-komponensek egyetlen alakot ismernek, akkor is, ha a végpont nem
 * lapoz (menhelyek, értesítések, beszélgetések).
 */
export async function getAllAsPage<T>(path: string, params: QueryParams = {}): Promise<Page<T>> {
  const items = await request<T[]>(withQuery(path, params));
  const list  = Array.isArray(items) ? items : [];
  return { items: list, info: { total: list.length, page: 1, limit: list.length, totalPages: 1 } };
}

/** Kurzoros lapozás – a hírfolyam-jellegű végpontok ezt az alakot adják. */
export interface CursorPage<T> {
  items:      T[];
  nextCursor: string | null;
}

/**
 * Kurzoros lista lekérése.
 *
 * Miért kell a kettő egymás mellett? Mert a webes API mindkettőt használja:
 * az állatlista oldalszámos, a hírfolyam kurzoros. Nem a mobil dolga eldönteni,
 * melyik a jobb — a meglévő végpontokhoz kell illeszkedni.
 */
export async function getCursorPage<T>(
  path: string, key: string, params: QueryParams = {},
): Promise<CursorPage<T>> {
  const raw = await request<Record<string, unknown>>(withQuery(path, params));
  return {
    items:      Array.isArray(raw[key]) ? (raw[key] as T[]) : [],
    nextCursor: (raw.nextCursor as string | null | undefined) ?? null,
  };
}

// ── Animals ────────────────────────────────────────────
export interface AnimalImage { url: string; isPrimary: boolean }
export interface AnimalShelter { id: string; name: string; city: string }
export interface Animal {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  gender: string;
  age: number | null;
  size: string | null;
  status: string;
  description: string | null;
  images: AnimalImage[];
  shelter: AnimalShelter;
  shelterId: string;
  createdAt: string;
}

/**
 * `type` és nem `interface`: a TypeScript csak a type aliasoknak ad implicit
 * index-szignatúrát, tehát csak így adható át a `QueryParams`-ot váró
 * `getPage`-nek anélkül, hogy castolni kellene.
 */
export type AnimalFilters = {
  page?:      number;
  type?:      string;
  status?:    string;
  size?:      string;
  gender?:    string;
  q?:         string;
  shelterId?: string;
};

/** Állatlista – a közös `Page` alakban, hogy a listakezelő kód újrahasznosítható legyen. */
export function getAnimals(filters: AnimalFilters = {}): Promise<Page<Animal>> {
  return getPage<Animal>("/api/animals", "animals", filters);
}

export interface AnimalDetail extends Animal {
  arrivedAt: string | null;
  vaccinated: boolean;
  neutered: boolean;
  chipped: boolean;
  color: string | null;
}

export function getAnimal(id: string): Promise<AnimalDetail> {
  return request<AnimalDetail>(`/api/animals/${id}`);
}

// ── Shelters ───────────────────────────────────────────
export interface Shelter {
  id: string;
  /**
   * A végpont eddig is adta (`SHELTER_PUBLIC_SELECT`), csak nem volt itt
   * felvéve. Azért kell: az önkéntes- és befogadói jelentkezések a menhelyet
   * `{ name, city, slug }` alakban adják vissza, azonosító nélkül — a „már
   * jelentkeztem ide" kiszűrése csak slug alapján lehetséges.
   */
  slug: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
  logoUrl: string | null;
  lat: number | null;
  lng: number | null;
}

export function getShelters(): Promise<Shelter[]> {
  return request<Shelter[]>("/api/shelters");
}

export function getShelter(id: string): Promise<Shelter> {
  return request<Shelter>(`/api/shelters/${id}`);
}

// ── Térkép ─────────────────────────────────────────────

/**
 * A térkép adatai.
 *
 * A `lat`/`lng` az adatbázisban nullázható, itt mégis `number`: a `/api/map`
 * végpont KIZÁRJA a koordináta nélküli sorokat (`lat: { not: null }`), tehát
 * amit visszaad, arra mindig rá lehet tenni egy jelölőt. Ha `number | null`
 * lenne, minden jelölőnél fölösleges ellenőrzést kellene írni.
 */
export interface MapReport {
  id: string; type: string; animalType: string;
  name: string | null; breed: string | null;
  city: string; description: string;
  imageUrl: string | null;
  lat: number; lng: number;
  status: string; createdAt: string;
  contactPhone: string | null; contactName: string | null;
}

export interface MapShelter {
  id: string; name: string; city: string;
  address: string | null; phone: string | null; email: string | null;
  isVerified: boolean; logoUrl: string | null;
  lat: number; lng: number; slug: string;
  /** Az örökbefogadható állatok száma – a végpont `_count.animals` néven adja. */
  _count: { animals: number };
}

export interface MapVet {
  id: string; name: string; city: string;
  address: string | null; phone: string | null; website: string | null;
  openingHours: string | null; isEmergency: boolean;
  lat: number; lng: number;
}

export interface MapData {
  reports:  MapReport[];
  shelters: MapShelter[];
  vets:     MapVet[];
}

/**
 * A térkép összes rétege EGY kérésben.
 *
 * A végpont szándékosan nem lapoz: a térképnek egyszerre kell látnia
 * mindent, ami a nézetben lehet. A bejelentésekre 500-as felső korlát van
 * szerver oldalon.
 */
export function getMapData(params: { type?: string; status?: string } = {}): Promise<MapData> {
  return request<MapData>(withQuery("/api/map", params));
}

// ── Ismerősök ──────────────────────────────────────────

/** Egy ember a kapcsolataim között. */
export interface ConnectionPerson {
  /** A KAPCSOLAT azonosítója, nem a felhasználóé – az elfogadás/törlés ezt kéri. */
  connectionId: string;
  id:    string;
  name:  string | null;
  image: string | null;
  city:  string | null;
}

export interface ConnectionLists {
  /** Kölcsönösen elfogadott ismerősök. */
  accepted: ConnectionPerson[];
  /** Nekem érkezett, válaszra váró jelölések. */
  incoming: ConnectionPerson[];
  /** Amiket én küldtem, és még nem fogadták el. */
  outgoing: ConnectionPerson[];
}

export function getConnections(): Promise<ConnectionLists> {
  return request<ConnectionLists>("/api/connections");
}

/**
 * A keresés találata és a hozzá tartozó kapcsolat állapota.
 *
 * Az állapot AZÉRT jön a találattal együtt, mert enélkül minden találatra
 * külön kérdést kellene feltenni, hogy a lista tudja, melyik gombot mutassa.
 */
export interface UserSearchHit {
  id:    string;
  name:  string | null;
  image: string | null;
  city:  string | null;
  role:  string;
  connection: {
    /** "none" | "connected" | "declined" | "outgoing" | "incoming" */
    state: string;
    /** A kapcsolat azonosítója, ha már van sor. */
    id: string | null;
  };
}

/** A kereséshez szükséges legrövidebb szöveg – a szerver ennél rövidebbre üres listát ad. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Felhasználók keresése név szerint.
 *
 * Bejelentkezés kell hozzá: a névsor ne legyen kívülről lekérdezhető. A szerver
 * percenként 30 keresést enged; ennél sűrűbb gépelésnél 429 jön, ezért a
 * képernyő késleltetve keres, nem minden leütésre.
 */
export function searchUsers(q: string): Promise<{ results: UserSearchHit[]; tooShort?: boolean }> {
  return request<{ results: UserSearchHit[]; tooShort?: boolean }>(
    withQuery("/api/users/search", { q }),
  );
}

/**
 * Bejelölés — vagy a másik fél jelölésének elfogadása.
 *
 * A KÖLCSÖNÖS JELÖLÉS MAGA AZ ELFOGADÁS: ha a másik már bejelölt minket, a mi
 * jelölésünk nem új kérés, hanem igen. Ezt a válasz `outcome` mezője mondja
 * meg, ezért érdemes kiírni, ne csak „elküldve"-t mutatni.
 */
export type ConnectOutcome =
  | "requested" | "accepted" | "already_pending" | "already_connected" | "self";

export function connectWith(userId: string): Promise<{ outcome: ConnectOutcome; id?: string }> {
  return request<{ outcome: ConnectOutcome; id?: string }>("/api/connections", {
    method: "POST",
    body:   JSON.stringify({ userId }),
  });
}

/** Válasz egy érkezett jelölésre. A `connectionId` kell hozzá, nem a felhasználó azonosítója. */
export function respondToConnection(connectionId: string, action: "accept" | "decline"): Promise<unknown> {
  return request(`/api/connections/${connectionId}`, {
    method: "PATCH",
    body:   JSON.stringify({ action }),
  });
}

/** Kapcsolat megszüntetése vagy a saját, még el nem fogadott jelölés visszavonása. */
export function removeConnection(connectionId: string): Promise<unknown> {
  return request(`/api/connections/${connectionId}`, { method: "DELETE" });
}

// ── Önkéntesség és ideiglenes befogadás ────────────────

/** A séma `AnimalType` értékei. Pontosan ez az öt van. */
export const ANIMAL_TYPES = ["DOG", "CAT", "RABBIT", "BIRD", "OTHER"] as const;
export type AnimalTypeValue = (typeof ANIMAL_TYPES)[number];

export interface VolunteerRecord {
  id: string;
  /** "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" */
  status: string;
  motivation: string | null;
  skills: string | null;
  availability: string | null;
  createdAt: string;
  shelter: { name: string; city: string; slug: string };
  /** Felvett feladatok. A `task` a feladat adatait tartalmazza. */
  assignments: { id: string; task: { title: string; scheduledAt: string | null; status: string } }[];
}

export interface FosterRecord {
  id: string;
  /** "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED" */
  status: string;
  preferredTypes: AnimalTypeValue[];
  maxWeightKg: number | null;
  canQuarantine: boolean;
  motivation: string | null;
  createdAt: string;
  shelter: { name: string; city: string; slug: string };
  /** A nálam lévő állatok. */
  fosteredAnimals: { id: string; name: string; slug: string }[];
}

/** A saját önkéntes jelentkezéseim, menhelyenként egy. */
export function getMyVolunteering(): Promise<VolunteerRecord[]> {
  return request<VolunteerRecord[]>("/api/volunteers");
}

/** A saját ideiglenes befogadói profiljaim, menhelyenként egy. */
export function getMyFostering(): Promise<FosterRecord[]> {
  return request<FosterRecord[]>("/api/foster");
}

export interface VolunteerInput {
  shelterId:    string;
  motivation?:  string;
  skills?:      string;
  availability?: string;
}

/**
 * Jelentkezés önkéntesnek.
 *
 * Menhelyenként egy jelentkezés lehet: a szerver 409-et ad, ha már van.
 * Ezért a felület a már jelentkezett menhelyeket kiveszi a választhatók közül.
 */
export function applyAsVolunteer(data: VolunteerInput): Promise<unknown> {
  return request("/api/volunteers", { method: "POST", body: JSON.stringify(data) });
}

export interface FosterInput {
  shelterId:      string;
  preferredTypes?: AnimalTypeValue[];
  maxWeightKg?:   number;
  canQuarantine?: boolean;
  motivation?:    string;
}

/** Jelentkezés ideiglenes befogadónak. Menhelyenként szintén egy. */
export function applyAsFoster(data: FosterInput): Promise<unknown> {
  return request("/api/foster", { method: "POST", body: JSON.stringify(data) });
}

// ── Események ──────────────────────────────────────────

export interface EventRegistration {
  eventId: string;
  /** "REGISTERED" | "CANCELLED" */
  status:  string;
  /** Kísérők száma a jelentkezőn felül. */
  guests:  number;
}

export interface EventItem {
  id: string; slug: string; title: string; description: string;
  type: string; location: string;
  startsAt: string; endsAt: string | null;
  capacity: number | null;
  imageUrl: string | null;
  status: string;
  shelter: { id: string; name: string; city: string; slug: string };
  /** Az AKTÍV jelentkezők SZÁMA (fejek) – a lemondott már nem számít. */
  _count: { registrations: number };
  /**
   * A ténylegesen elfoglalt helyek: jelentkezők + kísérőik.
   *
   * Ez NEM ugyanaz, mint a `_count.registrations`: a kapacitást a jelentkező
   * és a kísérői EGYÜTT töltik ki, a szerver is így ellenőrzi. A fejek számát
   * a „hányan jönnek" kiírásához, ezt a szabad helyek számításához használd.
   */
  takenSpots: number;
  /** A saját jelentkezésem, ha van. Kijelentkezve mindig `null`. */
  registration: EventRegistration | null;
}

/** Közzétett, közelgő események. Bejelentkezés nélkül is működik. */
export function getEvents(): Promise<{ events: EventItem[] }> {
  return request<{ events: EventItem[] }>("/api/events/public");
}

/** Egy esemény azonosító vagy slug alapján. */
export function getEvent(idOrSlug: string): Promise<{ event: EventItem }> {
  return request<{ event: EventItem }>(`/api/events/public/${idOrSlug}`);
}

/**
 * Jelentkezés egy eseményre.
 *
 * A végpont AZONOSÍTÓT vár az útvonalban, nem slugot — ezért kell a
 * részletezőnek az `event.id`, nem elég, amivel megnyitották.
 */
export function registerForEvent(eventId: string, data: { guests?: number; note?: string } = {}): Promise<unknown> {
  return request(`/api/events/${eventId}/register`, {
    method: "POST",
    body:   JSON.stringify(data),
  });
}

/** A saját jelentkezés lemondása. */
export function cancelEventRegistration(eventId: string): Promise<unknown> {
  return request(`/api/events/${eventId}/register`, { method: "DELETE" });
}

// ── Applications ───────────────────────────────────────
export interface ApplicationInput {
  animalId: string;
  homeType: string;
  hasGarden: boolean;
  hasChildren: boolean;
  hasPets: boolean;
  motivation: string;
}

export function submitApplication(data: ApplicationInput): Promise<{ id: string }> {
  return request<{ id: string }>("/api/applications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface MyApplication {
  id: string;
  status: string;
  createdAt: string;
  animal: { id: string; name: string; type: string; images: AnimalImage[] };
}

export function getMyApplications(): Promise<MyApplication[]> {
  return request<MyApplication[]>("/api/applications/my");
}

/**
 * Kérelem visszavonása (US-03-F).
 *
 * A szerver CSAK `PENDING` állapotban engedi, és 409-cel utasít el minden
 * mást — ezt nem duplikáljuk itt kliensoldali ellenőrzéssel, mert a státusz
 * közben megváltozhat (a menhely épp elbírálás alá vehette). A felület a
 * gombot elrejti, ami elég; a döntést a szerver hozza.
 */
export function withdrawApplication(id: string): Promise<unknown> {
  return request(`/api/applications/${id}`, { method: "PATCH" });
}

// ── Örökbefogadási kérvény (dinamikus űrlap) ───────────

/**
 * A kérdőív mezőtípusai.
 *
 * A séma `FieldType` enumját tükrözi (prisma/schema.prisma). SZÁNDÉKOSAN nincs
 * a mobilban rögzített kérdéssor: a menhely a dashboardon állítja össze a saját
 * kérdőívét, és a mobil azt jeleníti meg, amit a szerver ad. Egy lemásolt,
 * statikus űrlap az első kérdésmódosításnál elavulna.
 */
export type FieldType = "TEXT" | "TEXTAREA" | "IMAGE" | "FILE";

export interface ApplyField {
  id:       string;
  label:    string;
  type:     FieldType;
  required: boolean;
  order:    number;
}

export interface ApplyForm {
  animalName:      string;
  animalSlug:      string;
  animalImage:     string | null;
  formTitle:       string;
  formDescription: string | null;
  fields:          ApplyField[];
}

/** Egy mezőre adott válasz: szöveg VAGY feltöltött fájl címe. */
export interface ApplyResponse {
  fieldId:  string;
  value?:   string;
  fileUrl?: string;
}

/**
 * A meghívóhoz tartozó kérdőív.
 *
 * A meghívó egy beszélgetés-üzenetként érkezik (`Message.inviteToken`), ezért
 * a mobilban a beszélgetés a belépési pont — ugyanúgy, ahogy a weben.
 *
 * 404: érvénytelen vagy lejárt meghívó. 409: már felhasználták.
 */
export function getApplyForm(token: string): Promise<ApplyForm> {
  return request<ApplyForm>(`/api/apply/${token}`);
}

/** A kitöltött kérdőív beküldése. A kötelező mezőket a szerver is ellenőrzi. */
export function submitApplyForm(
  token: string, responses: ApplyResponse[],
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/apply/${token}`, {
    method: "POST",
    body:   JSON.stringify({ responses }),
  });
}

/** A webes kitöltő címe – fájlt igénylő mezőnél ide irányítunk. */
export function applyWebUrl(token: string): string {
  return `${BASE_URL}/apply/${token}`;
}

// ── Favourites ─────────────────────────────────────────
export function getFavoriteIds(): Promise<{ animalIds: string[] }> {
  return request<{ animalIds: string[] }>("/api/favorites");
}

export function addFavorite(animalId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>("/api/favorites", {
    method: "POST",
    body: JSON.stringify({ animalId }),
  });
}

export function removeFavorite(animalId: string): Promise<unknown> {
  return request(`/api/favorites/${animalId}`, { method: "DELETE" });
}

/**
 * A kedvenc állatok teljes adata.
 *
 * A `/api/favorites` SZÁNDÉKOSAN csak azonosítókat ad vissza (a webes kedvencek
 * oldal szerver-komponens, és közvetlenül az adatbázisból kérdez), tehát az
 * állatokat darabonként kell lekérni. Ez N+1 kérés — kedvenclistánál ez néhány
 * elem, tehát elfogadható, de nem skálázódik százas nagyságrendre.
 *
 * Ha ez egyszer szűk lesz, a helyes megoldás nem itt van: a `/api/animals`
 * végpontnak kellene egy `?ids=` szűrő. Most azért nem így csináljuk, mert új
 * végpont írása nélkül kell megoldani.
 *
 * A hibás azonosítókat kihagyjuk a `Promise.allSettled`-del: egy törölt állat
 * miatt ne boruljon az egész lista.
 */
export async function getFavoriteAnimals(): Promise<Animal[]> {
  const { animalIds } = await getFavoriteIds();
  if (animalIds.length === 0) return [];

  const results = await Promise.allSettled(animalIds.map((id) => getAnimal(id)));
  return results
    .filter((r): r is PromiseFulfilledResult<AnimalDetail> => r.status === "fulfilled")
    .map((r) => r.value);
}

// ── Notifications ──────────────────────────────────────
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  notifications: Notification[];
  /** Az ÖSSZES olvasatlan száma, nem csak a most lekérteké. */
  unreadCount:   number;
}

/**
 * Értesítések.
 *
 * A végpont `{ notifications, unreadCount }` OBJEKTUMOT ad, nem tömböt — ez a
 * típus korábban tömbként volt megadva, tehát egy `.map()` futásidőben
 * elhasalt volna. (Képernyő még nem használta, ezért nem derült ki.)
 *
 * A sorrendet a szerver adja: előbb az olvasatlanok, azon belül a legújabb —
 * ezért itt nem rendezünk újra.
 */
export function getNotifications(params: {
  filter?: "unread";
  limit?:  number;
} = {}): Promise<NotificationList> {
  return request<NotificationList>(withQuery("/api/notifications", params));
}

export function markNotificationRead(id: string): Promise<unknown> {
  return request(`/api/notifications/${id}`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return request("/api/notifications/read-all", { method: "POST" });
}

// ── Push ───────────────────────────────────────────────

/**
 * Az eszköz regisztrálása push értesítésre.
 *
 * A szerver a tokent egyedi kulcsként kezeli: ha ugyanezen a telefonon más
 * jelentkezik be, a token átkerül hozzá — az előző felhasználó nem kapja
 * tovább az értesítéseit erre a készülékre.
 */
export function registerPushToken(token: string, platform: "ios" | "android"): Promise<unknown> {
  return request("/api/notifications/push-token", {
    method: "POST",
    body:   JSON.stringify({ token, platform }),
  });
}

/** Leregisztrálás kijelentkezéskor. */
export function deletePushToken(token: string): Promise<unknown> {
  return request("/api/notifications/push-token", {
    method: "DELETE",
    body:   JSON.stringify({ token }),
  });
}

// ── Messaging ──────────────────────────────────────────
export interface Conversation {
  id: string;
  updatedAt: string;
  animal:  { name: string; slug: string; images: AnimalImage[] } | null;
  shelter: { name: string; slug: string } | null;
  /** A legutóbbi üzenet – a végpont `take: 1`-gyel adja, időrendben csökkenőn. */
  messages: Message[];
  /** Olvasatlanok száma; a szerver egyetlen aggregált lekérdezéssel számolja. */
  unreadCount: number;
}

export interface Message {
  id: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  readAt: string | null;
  /** "TEXT" vagy meghívó-üzenet. A séma alapértelmezése "TEXT". */
  type: string;
  /**
   * Kérvény-meghívó azonosítója, ha ez egy meghívó-üzenet.
   *
   * A /api/conversations/[id]/invite egy Message sort hoz létre ezzel a
   * mezővel, a messages végpont pedig `include`-dal kérdez — tehát a token
   * benne van a válaszban. Ez a mobil EGYETLEN útja a kérvény-kitöltőhöz: a
   * /api/applications/my szándékosan nem adja vissza a tokent.
   */
  inviteToken: string | null;
  sender: { id: string; name: string | null; role: string };
}

export function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/api/conversations");
}

/**
 * Beszélgetés indítása egy állathoz.
 *
 * A szerver ugyanahhoz az állat–felhasználó párhoz nem nyit másodikat
 * (`animalId_userId` egyedi kulcs), tehát ez biztonsággal hívható akkor is,
 * ha már van beszélgetés — a meglévőt adja vissza.
 */
export function startConversation(animalId: string): Promise<Conversation> {
  return request<Conversation>("/api/conversations", {
    method: "POST",
    body:   JSON.stringify({ animalId }),
  });
}

export function getMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/api/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, content: string): Promise<Message> {
  return request<Message>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function getUnreadCount(): Promise<{ count: number }> {
  return request<{ count: number }>("/api/messages/unread");
}

// ── Bejelentések (elveszett / talált / kóbor) ──────────

/** A séma ReportType enumja. */
export type ReportType = "LOST" | "FOUND" | "STRAY";

/**
 * Új bejelentés (docs/09-reports-map.md, US-09-A).
 *
 * A kötelező mezők a szerver zod-sémájából jönnek: `description` legalább 10
 * karakter, `contactName` legalább 2, a `city`, `contactPhone` és
 * `contactEmail` nem lehet üres. A képek opcionálisak, legfeljebb 6.
 */
export interface ReportInput {
  type:         ReportType;
  animalType:   string;
  description:  string;
  city:         string;
  contactName:  string;
  contactPhone: string;
  contactEmail: string;
  name?:        string;
  breed?:       string;
  color?:       string;
  gender?:      "MALE" | "FEMALE" | "UNKNOWN";
  address?:     string;
  imageUrls?:   string[];
  lat?:         number;
  lng?:         number;
}

export function createReport(data: ReportInput): Promise<{ id: string }> {
  return request<{ id: string }>("/api/reports", {
    method: "POST",
    body:   JSON.stringify(data),
  });
}

// ── Napi állat ─────────────────────────────────────────

/**
 * Napi kép feltöltése.
 *
 * A kép 24 óra után kiesik a folyamból, de a szerző a profilján naptárban
 * visszanézheti — ezért a feltöltés nem visszavonhatatlan döntés.
 */
export function createDailyPost(data: {
  imageUrl: string;
  caption?: string | null;
  animalId?: string | null;
}): Promise<{ id: string }> {
  return request<{ id: string }>("/api/daily-posts", {
    method: "POST",
    body:   JSON.stringify(data),
  });
}

// ── Profile ────────────────────────────────────────────

/** A push kapcsolók. A típus → kategória leképezés a szerveren (`lib/push.ts`) él. */
export interface NotificationPrefs {
  /** Üzenetek és válaszok. */
  pushMessages:    boolean;
  /** Ügyintézés: kérelem, időpont, utánkövetés. */
  pushCaseUpdates: boolean;
  /** Közösség: ismerős-jelölés, napi kép kedvelése. */
  pushCommunity:   boolean;
}

export interface Profile extends NotificationPrefs {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  image: string | null;
  emailNotifications: boolean;

  // ── Örökbefogadói bemutatkozás ──────────────────────
  // Az EMBERRE vonatkozik, nem egy konkrét állatra, ezért a profilon él:
  // egyszer kell megírni, és minden kérelembe automatikusan bekerül.
  bio: string | null;
  /** "HOUSE" | "APARTMENT" | "OTHER" */
  homeType: string | null;
  hasGarden: boolean | null;
  hasChildren: boolean | null;
  hasPets: boolean | null;
  adoptionExperience: string | null;

  /**
   * Van-e jelszava a fióknak.
   *
   * A szerver SOHA nem adja ki a jelszó-hasht, csak ezt. A social login-nal
   * készült fióknak nincs jelszava, ott a jelszóváltoztató űrlapnak sincs
   * értelme.
   */
  hasPassword: boolean;
}

/** A lakhatás típusa – a séma pontosan ezt a három értéket fogadja el. */
export const HOME_TYPES = ["HOUSE", "APARTMENT", "OTHER"] as const;
export type HomeType = (typeof HOME_TYPES)[number];

/**
 * A saját profil.
 *
 * A bejelentkezéskor kapott adat csak az azonosítót, nevet és szerepkört
 * tartalmazza — a kapcsolók állását nem. Enélkül a beállítások képernyő
 * mindig bekapcsolva mutatná őket, akkor is, ha a felhasználó kikapcsolta.
 */
export function getProfile(): Promise<{ user: Profile }> {
  return request<{ user: Profile }>("/api/profile");
}

export function updateProfile(
  data: Partial<Pick<Profile,
    "name" | "phone" | "address" | "city" | "emailNotifications"
    | "pushMessages" | "pushCaseUpdates" | "pushCommunity"
    | "bio" | "homeType" | "hasGarden" | "hasChildren" | "hasPets"
    | "adoptionExperience">>,
): Promise<{ user: Profile }> {
  return request<{ user: Profile }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Profilkép mentése.
 *
 * Külön végpont, mert a kép a Vercel Blob tárolóba megy (`/api/upload`), és
 * csak a kész CÍMET kell a profilhoz kötni — a `PATCH /api/profile` nem fogad
 * el `image` mezőt.
 */
export function updateAvatar(image: string): Promise<{ image: string }> {
  return request<{ image: string }>("/api/profile/avatar", {
    method: "PATCH",
    body:   JSON.stringify({ image }),
  });
}

/**
 * Jelszó megváltoztatása.
 *
 * A végpont korábban csak böngésző-munkamenetet fogadott el; most `Bearer`
 * tokennel is működik. Social login-nal készült fióknál 400-at ad.
 */
export function changePassword(currentPassword: string, newPassword: string): Promise<unknown> {
  return request("/api/auth/change-password", {
    method: "POST",
    body:   JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── Appointments ───────────────────────────────────────
export interface Appointment {
  id: string;
  status: string;
  proposedAt: string;
  confirmedAt: string | null;
  note: string | null;
  shelter: { name: string; city: string; slug: string };
  animal:  { name: string; slug: string } | null;
}

export function getMyAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>("/api/appointments");
}

/**
 * Egy időpont részletei.
 *
 * A kérelmező ÉS a menhely adminja is lekérheti — a végpont mindkettőt
 * engedi, mást nem. A `user` mező ezért van benne: az admin képernyőnek
 * tudnia kell, ki kéri az időpontot.
 */
export interface AppointmentDetail extends Appointment {
  user: { name: string | null; email: string } | null;
}

export function getAppointment(id: string): Promise<AppointmentDetail> {
  return request<AppointmentDetail>(`/api/appointments/${id}`);
}

/**
 * Időpontkérés (docs/05-appointments.md, US-05-A).
 *
 * A `proposedAt` ISO-8601 időbélyeg — a szerver `z.string().datetime()`-mal
 * validálja, tehát a `Date.toISOString()` alakja kell, nem helyi formátum.
 * A menhely az `animalId`-t is ellenőrzi: ha az állat nem ehhez a menhelyhez
 * tartozik, 400-at ad.
 */
export function requestAppointment(data: {
  shelterId: string;
  animalId?: string;
  proposedAt: string;
  note?: string;
}): Promise<Appointment> {
  return request<Appointment>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Saját időpont lemondása (US-05-E).
 *
 * A végpont művelet-alapú (`action`), nem státuszt fogad: a szerver dönti el,
 * mi következik az adott állapotból. A jogosultságot is ő ellenőrzi.
 */
export function cancelAppointment(id: string): Promise<unknown> {
  return request(`/api/appointments/${id}`, {
    method: "PATCH",
    body:   JSON.stringify({ action: "CANCEL" }),
  });
}

// ── Auth ───────────────────────────────────────────────
export interface AuthUser {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  // Szándékosan nem a `request()`-en megy: itt még nincs token, és a 401 NEM
  // lejárt munkamenetet jelent, hanem rossz jelszót — kijelentkeztetni sem kell.
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/auth/mobile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError("offline", null, "Nincs internetkapcsolat.");
  }

  if (res.status === 401 || res.status === 400) {
    throw new ApiError("client", res.status, "Hibás e-mail vagy jelszó.");
  }
  if (!res.ok) {
    throw new ApiError(res.status >= 500 ? "server" : "client", res.status, await errorMessage(res));
  }
  return res.json();
}

// ── Fiók törlése ───────────────────────────────────────

/**
 * A saját fiók törlése.
 *
 * Az Apple minden olyan appnál megköveteli, ahol fiókot lehet létrehozni.
 * Visszafordíthatatlan: a szerver azonnal anonimizálja a személyes adatokat,
 * lemondja az aktív Stripe-előfizetéseket, és érvényteleníti a munkameneteket —
 * ezért a felület KÖTELEZŐEN kér megerősítést, mielőtt ide eljut.
 */
export function deleteAccount(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>("/api/auth/delete-account", { method: "DELETE" });
}

/** A webes adatvédelmi tájékoztató címe – mindkét store kéri, hogy elérhető legyen. */
export const PRIVACY_URL = `${BASE_URL}/adatvedelem`;
/** Általános szerződési feltételek. */
export const TERMS_URL = `${BASE_URL}/aszf`;

// ── Menhely admin áttekintő ────────────────────────────
export interface AdminApplication {
  id: string; status: string; createdAt: string;
  user:   { name: string | null; email: string } | null;
  animal: { name: string; slug: string };
}

export interface AdminAppointment {
  id: string; status: string; proposedAt: string;
  confirmedAt: string | null; note: string | null;
  user:   { name: string | null; email: string } | null;
  animal: { name: string; slug: string } | null;
}

export interface ShelterAdminOverview {
  shelter: { id: string; name: string };
  counts: {
    pendingApplications: number;
    upcomingAppointments: number;
    availableAnimals: number;
  };
  pendingApplications:  AdminApplication[];
  upcomingAppointments: AdminAppointment[];
}

export function getShelterAdminOverview(): Promise<ShelterAdminOverview> {
  return request<ShelterAdminOverview>("/api/shelter-admin/overview");
}

/**
 * Egy kérelem a döntéshez.
 *
 * Az áttekintő csak nevet és státuszt ad — dönteni csak a válaszok
 * ismeretében lehet, ezért kell a külön lekérés.
 */
export interface AdminApplicationDetail {
  id: string;
  /** "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED" | "INVITED" | "WITHDRAWN" */
  status: string;
  message: string | null;
  /** "HOUSE" | "APARTMENT" | "OTHER" */
  homeType: string | null;
  hasGarden: boolean | null;
  hasChildren: boolean | null;
  hasPets: boolean | null;
  experience: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string; name: string | null; email: string;
    phone: string | null; city: string | null; bio: string | null;
  } | null;
  animal: { id: string; name: string; slug: string; shelterId: string };
}

export function getAdminApplication(id: string): Promise<{ application: AdminApplicationDetail }> {
  return request<{ application: AdminApplicationDetail }>(`/api/dashboard/applications/${id}`);
}

/**
 * Döntés egy kérelemről.
 *
 * A végpont HÁROM státuszt fogad el: REVIEWING, APPROVED, REJECTED. A döntés
 * értesítést és e-mailt is küld a kérelmezőnek, jóváhagyásnál pedig
 * utánkövetést ütemez — ezért nem visszavonható egy újabb állításssal.
 */
export function decideApplication(
  id: string,
  status: "REVIEWING" | "APPROVED" | "REJECTED",
  reviewNotes?: string,
): Promise<unknown> {
  return request(`/api/dashboard/applications/${id}`, {
    method: "PATCH",
    body:   JSON.stringify({ status, reviewNotes }),
  });
}

/**
 * Időpont visszaigazolása a menhely részéről.
 *
 * A `confirmedAt` KÖTELEZŐ és ISO időbélyeg: a menhely nem csak rábólint, hanem
 * megmondja, mikorra várja a látogatót — ez lehet a kért időpont, de más is.
 */
export function confirmAppointment(id: string, confirmedAt: string, adminNote?: string): Promise<unknown> {
  return request(`/api/appointments/${id}`, {
    method: "PATCH",
    body:   JSON.stringify({ action: "CONFIRM", confirmedAt, adminNote }),
  });
}

/** Időpont elutasítása. A kérelmező értesítést kap az indoklással. */
export function rejectAppointment(id: string, adminNote?: string): Promise<unknown> {
  return request(`/api/appointments/${id}`, {
    method: "PATCH",
    body:   JSON.stringify({ action: "REJECT", adminNote }),
  });
}

/** Megtörtént látogatás lezárása. */
export function completeAppointment(id: string): Promise<unknown> {
  return request(`/api/appointments/${id}`, {
    method: "PATCH",
    body:   JSON.stringify({ action: "COMPLETE" }),
  });
}

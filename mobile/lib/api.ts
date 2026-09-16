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

export interface AnimalListResponse {
  animals: Animal[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export function getAnimals(params: {
  page?: number;
  type?: string;
  status?: string;
  size?: string;
  gender?: string;
  q?: string;
  shelterId?: string;
} = {}): Promise<AnimalListResponse> {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => [k, String(v)])
    )
  ).toString();
  return request<AnimalListResponse>(`/api/animals${qs ? `?${qs}` : ""}`);
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

export function getNotifications(): Promise<Notification[]> {
  return request<Notification[]>("/api/notifications");
}

export function markNotificationRead(id: string): Promise<unknown> {
  return request(`/api/notifications/${id}`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return request("/api/notifications/read-all", { method: "POST" });
}

// ── Messaging ──────────────────────────────────────────
export interface Conversation {
  id: string;
  updatedAt: string;
  animal:  { id: string; name: string; slug: string; images: AnimalImage[] } | null;
  shelter: { id: string; name: string } | null;
}

export interface Message {
  id: string;
  content: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  readAt: string | null;
  sender: { id: string; name: string | null; role: string };
}

export function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/api/conversations");
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

// ── Profile ────────────────────────────────────────────
export interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
}

export function updateProfile(data: Partial<Pick<Profile, "name" | "phone" | "address" | "city">>): Promise<{ user: Profile }> {
  return request<{ user: Profile }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
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

import * as SecureStore from "expo-secure-store";

export const BASE_URL = "https://www.allatimenhelyek.hu";

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("session_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
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
  const res = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Hibás e-mail vagy jelszó");
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

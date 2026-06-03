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

// ── Auth ───────────────────────────────────────────────
export async function apiLogin(
  email: string,
  password: string
): Promise<{ token: string; user: { id: string; name: string; email: string } }> {
  const res = await fetch(`${BASE_URL}/api/auth/mobile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Hibás e-mail vagy jelszó");
  return res.json();
}

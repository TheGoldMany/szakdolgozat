import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Always render at request time — requires a live DB connection
export const dynamic = "force-dynamic";

const BASE = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Statikus, publikus oldalak
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/animals",
    "/shelters",
    "/events",
    "/reports",
    "/map",
    "/donate",
  ].map((path) => ({
    url:        `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority:   path === "" ? 1 : 0.8,
  }));

  // Dinamikus tartalom – csak ami publikusan elérhető
  const [animals, shelters, events] = await Promise.all([
    prisma.animal.findMany({
      where:   { status: "AVAILABLE" },
      select:  { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take:    5000,
    }),
    prisma.shelter.findMany({
      where:   { isActive: true },
      select:  { slug: true, updatedAt: true },
    }),
    prisma.event.findMany({
      where:   { status: "PUBLISHED" },
      select:  { slug: true, updatedAt: true },
    }),
  ]);

  const animalRoutes: MetadataRoute.Sitemap = animals.map((a) => ({
    url:             `${BASE}/animals/${a.slug}`,
    lastModified:    a.updatedAt,
    changeFrequency: "weekly",
    priority:        0.6,
  }));

  const shelterRoutes: MetadataRoute.Sitemap = shelters.map((s) => ({
    url:             `${BASE}/shelters/${s.slug}`,
    lastModified:    s.updatedAt,
    changeFrequency: "weekly",
    priority:        0.7,
  }));

  const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
    url:             `${BASE}/events/${e.slug}`,
    lastModified:    e.updatedAt,
    changeFrequency: "weekly",
    priority:        0.5,
  }));

  return [...staticRoutes, ...animalRoutes, ...shelterRoutes, ...eventRoutes];
}

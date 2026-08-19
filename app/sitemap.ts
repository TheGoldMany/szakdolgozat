import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site-url";
import { publishedWhere } from "@/lib/articles";
import { tagSlug } from "@/lib/seo";

// Always render at request time — requires a live DB connection
export const dynamic = "force-dynamic";

const BASE = siteUrl();

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
    "/articles",
  ].map((path) => ({
    url:        `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority:   path === "" ? 1 : 0.8,
  }));

  // Dinamikus tartalom – csak ami publikusan elérhető
  const [animals, shelters, events, articles] = await Promise.all([
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
    // A cikkek eddig hiányoztak a sitemapból – emiatt a kereső csak
    // hivatkozásokon keresztül találhatta meg őket, jóval lassabban.
    // Csak a már megjelent cikkek kerülnek be: az időzített még nem létezik
    // nyilvánosan, a piszkozat pedig soha.
    prisma.post.findMany({
      where:   { ...publishedWhere(), NOT: { slug: null } },
      select:  { slug: true, updatedAt: true, publishedAt: true, tags: true },
      orderBy: { publishedAt: "desc" },
      take:    5000,
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

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url:             `${BASE}/articles/${a.slug}`,
    // A lastmod a kereső számára a legfontosabb jelzés arról, hogy érdemes
    // újra beolvasni az oldalt.
    lastModified:    a.updatedAt,
    changeFrequency: "monthly",
    priority:        0.7,
  }));

  // Címszó-gyűjtőoldalak: belső hivatkozásokat adnak a cikkeknek.
  const tagSlugs = new Map<string, Date>();
  for (const article of articles) {
    for (const tag of article.tags) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      const current = tagSlugs.get(slug);
      if (!current || current < article.updatedAt) tagSlugs.set(slug, article.updatedAt);
    }
  }
  const tagRoutes: MetadataRoute.Sitemap = [...tagSlugs].map(([slug, updatedAt]) => ({
    url:             `${BASE}/articles/cimke/${slug}`,
    lastModified:    updatedAt,
    changeFrequency: "weekly",
    priority:        0.4,
  }));

  return [
    ...staticRoutes, ...animalRoutes, ...shelterRoutes,
    ...eventRoutes, ...articleRoutes, ...tagRoutes,
  ];
}

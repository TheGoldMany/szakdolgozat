import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { routing } from "@/i18n/routing";

const BASE = siteUrl();

const PRIVATE = [
  "/dashboard", "/auth", "/profile", "/messages", "/notifications", "/favorites",
  "/appointments", "/applications", "/followups", "/apply",
];

export default function robots(): MetadataRoute.Robots {
  // A nem magyar nyelvek előtaggal élnek (`/en/auth/login`), ezért a tiltást
  // minden nyelvi előtaggal fel kell sorolni, különben csak a magyar érvényes.
  const prefixes = ["", ...routing.locales.filter((l) => l !== routing.defaultLocale).map((l) => `/${l}`)];
  return {
    rules: {
      userAgent: "*",
      allow:     "/",
      disallow: ["/api", ...prefixes.flatMap((p) => PRIVATE.map((path) => p + path))],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

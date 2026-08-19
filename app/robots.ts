import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

const BASE = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow:     "/",
      disallow: [
        "/dashboard",
        "/api",
        "/auth",
        "/profile",
        "/messages",
        "/notifications",
        "/favorites",
        "/appointments",
        "/applications",
        "/followups",
        "/apply",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

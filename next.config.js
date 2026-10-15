const withNextIntl = require("next-intl/plugin")("./i18n/request.ts");

/**
 * Biztonsági fejlécek minden válaszra.
 *
 * Eddig EGY SEM volt. A legfontosabbak és hogy mit védenek:
 *
 *  • HSTS — a böngésző a jövőben magától HTTPS-sel kéri az oldalt, egy
 *    nyilvános wifin sem lehet sima HTTP-re visszaterelni. A `preload`
 *    SZÁNDÉKOSAN hiányzik: az a böngészők beégetett listájára jelentkezés,
 *    amiből kikerülni hónapokig tart — azt külön döntésként kell meghozni.
 *  • frame-ancestors / X-Frame-Options — más oldal nem ágyazhat be minket egy
 *    láthatatlan keretbe (kattintásrablás: „kattints ide" → valójában a mi
 *    „Fiók törlése" gombunk).
 *  • nosniff — a böngésző nem találgatja a tartalom típusát; egy feltöltött,
 *    képnek álcázott HTML-fájl nem fut le szkriptként.
 *  • Referrer-Policy — más oldalra kattintva csak a domain megy át, a teljes
 *    URL (benne pl. egy jelszó-visszaállító token) nem.
 *  • Permissions-Policy — a kamera, mikrofon és helymeghatározás tiltva; az
 *    oldal egyiket sem használja, így egy esetleges beinjektált szkript sem.
 *
 * MIÉRT NINCS `script-src` a CSP-ben: a Next 14 inline szkripteket ír a
 * lapra, nonce nélkül tehát csak `'unsafe-inline'`-nal működne — az pedig
 * épp az XSS ellen nem véd semmit. A beállított irányelvek (keretezés, `<base>`
 * tag, beágyazott pluginok) önmagukban is valódi védelmet adnak, és semmit
 * nem törnek el. A `form-action` is szándékosan hiányzik: a Chrome az
 * átirányításokra is alkalmazza, és ezzel a Google/Facebook belépést blokkolná.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Az `X-Powered-By: Next.js` fejléc ingyen adja meg a támadónak a
  // keretrendszert, amire a célzott sebezhetőségeket keresheti.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  images: {
    /**
     * Csak a saját tárhelyről és a valóban használt forrásokból.
     *
     * Eddig `hostname: "**"` állt itt: a képoptimalizáló BÁRMELYIK internetes
     * képet letöltötte és átméretezte a mi Vercel-keretünk terhére — vagyis az
     * oldal nyitott képproxyként működött bárki számára.
     */
    remotePatterns: [
      // Saját feltöltések (Vercel Blob)
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Google és Facebook profilképek (közösségi belépésnél a NextAuth menti)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      // Bemutató-adatok képei (prisma/seed*.ts)
      { protocol: "https", hostname: "loremflickr.com" },
    ],
    // AVIF SZÁNDÉKOSAN NINCS. A Next.js 15.5.24 előtti verzióiban az AVIF
    // feldolgozása a képoptimalizálóban hitelesítés nélküli távoli
    // kódfuttatást enged (GHSA-2xp9-vwfh-vxw4, kritikus). A WebP a legtöbb
    // böngészőben hasonló méretet ad, a különbség nem éri meg ezt a felületet.
    formats: ["image/webp"],
    // Optimalizált képek cache-elése 1 napig (kevesebb ismételt optimalizálás)
    minimumCacheTTL: 86400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // A Next 15-ben kikerült az `experimental` alól (régi neve:
  // `serverComponentsExternalPackages`).
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

module.exports = withNextIntl(nextConfig);

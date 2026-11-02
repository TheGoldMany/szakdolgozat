import type { Metadata, Viewport } from "next";
import { fontVariables } from "@/lib/fonts";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PageTransition } from "@/components/layout/page-transition";
import { DailyLauncher } from "@/components/daily/daily-launcher";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CookieBanner } from "@/components/ui/cookie-banner";
import { PageTour } from "@/components/onboarding/page-tour";
import { routing } from "@/i18n/routing";
import { Suspense } from "react";
import "../globals.css";
import { siteUrl } from "@/lib/site-url";


export const viewport: Viewport = {
  themeColor: "#187f3b",
  // Az oldalnak csak világos témája van. Az „only light” megtiltja, hogy a
  // böngésző (pl. Chrome Androidon, Samsung Internet) automatikusan
  // besötétítse: az kiszámíthatatlanul invertálja a színeket és a képeket,
  // és az űrlapmezők is sötétek lennének a világos kártyákon.
  colorScheme: "only light",
  width: "device-width",
  initialScale: 1,
  // A `cover` nélkül iOS-en az `env(safe-area-inset-*)` mindig 0. Ilyenkor az
  // alsó menüsáv nem tudja kitölteni a kezdőképernyő-csík alatti sávot, és
  // amikor a Safari címsora behúzódik, a görgetett tartalom ott kilátszik a
  // sáv alatt. A széleken (fekvő nézetben a kivágás mellett) a body és a
  // fejléc saját padding-je tartja bent a tartalmat (globals.css, header).
  viewportFit: "cover",
};

/**
 * A `metadataBase` nélkül a Next a relatív OG- és kanonikus címeket nem tudja
 * teljes URL-lé alakítani: a közösségi megosztás kép nélkül jelenik meg, és a
 * kanonikus megjelölés is hiányos marad. Egy helyről, a `siteUrl()`-ből jön,
 * hogy a sitemapban és az oldalakon ugyanaz a cím szerepeljen.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "ÁllatiMenhelyek.hu",
    template: "%s | ÁllatiMenhelyek.hu",
  },
  description: "Találd meg új legjobb barátod! Böngéssz örökbefogadható állatok között magyarországi menhelyekről.",
};

export default async function LocaleLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  if (!routing.locales.includes(locale as "hu" | "en" | "de" | "pl")) {
    notFound();
  }

  // E nélkül a next-intl a kérés fejlécéből olvassa a nyelvet, és ez minden
  // oldalt dinamikussá tett: a `revalidate` beállítások hatástalanok voltak,
  // minden látogatás új renderelést és adatbázis-lekérést jelentett. Az
  // oldalaknak is hívniuk kell (párhuzamosan renderelnek); amelyik nem hívja,
  // vagy munkamenetet olvas, az továbbra is dinamikus marad.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Suspense><Header /></Suspense>
            {/* pt-16 = a fix fejléc magassága (h-16), így nincs fehér csík alatta */}
            <main className="min-h-[60vh] pt-16">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
            {/* Alsó térköz, hogy a fix mobil-navigáció ne takarja a tartalmat.
                A magasság a sáv magassága + a készülék alsó biztonsági sávja. */}
            <div
              className="md:hidden"
              style={{ height: "calc(3.5rem + env(safe-area-inset-bottom))" }}
              aria-hidden
            />
            <Suspense><MobileBottomNav /></Suspense>
            <Suspense><DailyLauncher /></Suspense>
            <CookieBanner />
            {/* Az oldalhoz tartozó bemutató. EGY példány, az útvonalból
                választja ki a lépéseket – így egyetlen oldalról sem maradhat le. */}
            <Suspense><PageTour /></Suspense>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

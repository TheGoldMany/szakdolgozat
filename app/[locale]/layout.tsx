import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "ÁllatiMenhelyek.hu",
    template: "%s | ÁllatiMenhelyek.hu",
  },
  description: "Találd meg új legjobb barátod! Böngéssz örökbefogadható állatok között magyarországi menhelyekről.",
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as "hu" | "en" | "de" | "pl")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        {/* JavaScript nélkül a görgetésre megjelenő blokkok sosem kapnának
            jelzést, hogy láthatóvá váljanak – ilyenkor egyszerűen látszanak. */}
        <noscript>
          <style>{".reveal-pending{opacity:1!important}"}</style>
        </noscript>
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

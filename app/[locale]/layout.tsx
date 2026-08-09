import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CookieBanner } from "@/components/ui/cookie-banner";
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
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <Suspense><Header /></Suspense>
            <main className="pt-20">{children}</main>
            <Footer />
            {/* Alsó térköz, hogy a fix mobil-navigáció ne takarja a tartalmat */}
            <div className="h-16 md:hidden" aria-hidden />
            <Suspense><MobileBottomNav /></Suspense>
            <CookieBanner />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SUPPORTED_LOCALES = ["hu", "en", "de", "pl"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

async function loadMessages(locale: SupportedLocale) {
  switch (locale) {
    case "en": return (await import("@/messages/en.json")).default;
    case "de": return (await import("@/messages/de.json")).default;
    case "pl": return (await import("@/messages/pl.json")).default;
    default:   return (await import("@/messages/hu.json")).default;
  }
}

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard");

  const role = session.user.role;
  if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  // Read locale from cookie set by next-intl middleware (NEXT_LOCALE cookie)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value ?? "hu";
  const locale: SupportedLocale = (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale)
    ? (cookieLocale as SupportedLocale)
    : "hu";

  const messages = await loadMessages(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <div className="flex min-h-screen flex-col bg-gray-50">
              <Suspense><Header /></Suspense>

              <div className="mx-auto mt-16 flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
                <aside className="w-full shrink-0 lg:w-60">
                  <SidebarNav role={role} />
                </aside>
                <main className="flex-1 min-w-0">{children}</main>
              </div>

              <Footer />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

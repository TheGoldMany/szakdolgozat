import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import huMessages from "@/messages/hu.json";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard");

  const role = session.user.role;
  if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  return (
    <html lang="hu" className={inter.variable}>
      <body>
        <NextIntlClientProvider locale="hu" messages={huMessages}>
          <Providers>
            <div className="flex min-h-screen flex-col bg-gray-50">
              <Suspense><Header /></Suspense>

              <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
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

import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { ArrowLeft, LogOut } from "lucide-react";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
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
        <Providers>
          <div className="min-h-screen bg-gray-50">

            {/* Top bar */}
            <header className="sticky top-0 z-30 border-b border-gray-100 bg-white shadow-sm">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Főoldal
                  </Link>
                  <span className="text-gray-300">/</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {role === "SUPER_ADMIN" ? "Főadmin panel" : "Admin panel"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-sm text-gray-500 sm:block">{session.user.name ?? session.user.email}</span>
                  <Link
                    href="/api/auth/signout"
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Kijelentkezés
                  </Link>
                </div>
              </div>
            </header>

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">

              <aside className="w-full shrink-0 lg:w-60">
                <SidebarNav role={role} />
              </aside>

              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

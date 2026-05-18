import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/components/providers";
import { LayoutDashboard, ClipboardList, PawPrint, MessageCircle, Building2, Settings, Heart, ClipboardCheck, ArrowLeft, LogOut, FileText, Users } from "lucide-react";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" } };

const NAV = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Áttekintés",             roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/applications", icon: ClipboardList,   label: "Kérelmek",               roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/animals",      icon: PawPrint,        label: "Állatok",                roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/messages",     icon: MessageCircle,   label: "Üzenetek",               roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/settings",     icon: Settings,        label: "Menhely beállítás",      roles: ["SHELTER_ADMIN"] },
  { href: "/dashboard/shelters",     icon: Building2,       label: "Menhelyek",              roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/tiers",        icon: Heart,           label: "Előfizetések",           roles: ["SHELTER_ADMIN"] },
  { href: "/dashboard/campaigns",    icon: ClipboardCheck,  label: "Jóváhagyások",           roles: ["SUPER_ADMIN"] },
  { href: "/dashboard/forms",        icon: FileText,        label: "Kérvény sablonok",        roles: ["SHELTER_ADMIN"] },
  { href: "/dashboard/subscriptions", icon: Users,           label: "Előfizetők",              roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard");

  const role = session.user.role;
  if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  const visibleNav = NAV.filter((item) => item.roles.includes(role));

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

              <aside className="w-full shrink-0 lg:w-56">
                <nav className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {role === "SUPER_ADMIN" ? "Főadmin" : "Admin"}
                  </p>
                  {visibleNav.map(({ href, icon: Icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </nav>
              </aside>

              <main className="flex-1 min-w-0">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

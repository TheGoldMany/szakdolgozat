import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LayoutDashboard, ClipboardList, PawPrint, MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Dashboard" } };

const NAV = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Áttekintés" },
  { href: "/dashboard/applications", icon: ClipboardList,   label: "Kérelmek" },
  { href: "/dashboard/animals",      icon: PawPrint,        label: "Állatok" },
  { href: "/dashboard/messages",     icon: MessageCircle,   label: "Üzenetek" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login?callbackUrl=/dashboard");

  const role = session.user.role;
  if (role !== "SHELTER_ADMIN" && role !== "SUPER_ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">

        {/* Oldalsáv */}
        <aside className="w-full shrink-0 lg:w-56">
          <nav className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {role === "SUPER_ADMIN" ? "Főadmin" : "Admin"}
            </p>
            {NAV.map(({ href, icon: Icon, label }) => (
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

        {/* Tartalom */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

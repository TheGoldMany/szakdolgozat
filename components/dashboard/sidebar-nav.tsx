"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, PawPrint, MessageCircle, Building2,
  Settings, Heart, ClipboardCheck, FileText, Users, CalendarDays, HandHeart,
  ListChecks, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IconType = typeof LayoutDashboard;

interface NavItem { href: string; icon: IconType; label: string; roles: string[] }
interface NavGroup { title: string | null; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Áttekintés", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    title: "Örökbefogadás",
    items: [
      { href: "/dashboard/applications", icon: ClipboardList, label: "Kérelmek",        roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/animals",      icon: PawPrint,      label: "Állatok",         roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/appointments", icon: CalendarDays,  label: "Időpontok",        roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/volunteers",   icon: HandHeart,     label: "Önkéntesek",       roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/followups",    icon: ListChecks,    label: "Utánkövetések",    roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/inventory",    icon: Package,       label: "Készlet",           roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/forms",        icon: FileText,      label: "Kérvény sablonok", roles: ["SHELTER_ADMIN"] },
    ],
  },
  {
    title: "Kommunikáció",
    items: [
      { href: "/dashboard/messages", icon: MessageCircle, label: "Üzenetek", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    title: "Adományozás",
    items: [
      { href: "/dashboard/tiers",         icon: Heart, label: "Előfizetési csomagok", roles: ["SHELTER_ADMIN"] },
      { href: "/dashboard/subscriptions", icon: Users, label: "Előfizetők",           roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/dashboard/shelters",  icon: Building2,      label: "Menhelyek",    roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/campaigns", icon: ClipboardCheck, label: "Jóváhagyások", roles: ["SUPER_ADMIN"] },
    ],
  },
  {
    title: "Beállítások",
    items: [
      { href: "/dashboard/settings", icon: Settings, label: "Menhely adatai", roles: ["SHELTER_ADMIN"] },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();

  const groups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(role)) }))
    .filter(g => g.items.length > 0);

  return (
    <nav className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {groups.map((group, gi) => (
        <div key={gi} className={cn(gi > 0 && "mt-4")}>
          {group.title && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(({ href, icon: Icon, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-brand-500" : "text-gray-400")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

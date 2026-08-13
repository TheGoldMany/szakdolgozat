"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ClipboardList, PawPrint, MessageCircle, Building2,
  Settings, Heart, ClipboardCheck, FileText, Users, CalendarDays, HandHeart,
  ListChecks, Package, DoorOpen, Home, CalendarHeart, ArrowRightLeft, UtensilsCrossed,
  UserCog, MessagesSquare, Sparkles, ShieldCheck, ScrollText, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type IconType = typeof LayoutDashboard;

interface NavItem { href: string; icon: IconType; labelKey: string; roles: string[] }
interface NavGroup { titleKey: string | null; tourKey?: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: null,
    tourKey: "nav-overview",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, labelKey: "navOverview", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    titleKey: "groupAnimals",
    tourKey: "group-animals",
    items: [
      { href: "/dashboard/animals",   icon: PawPrint,        labelKey: "navAnimals",   roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/kennels",   icon: DoorOpen,        labelKey: "navKennels",   roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/feeding",   icon: UtensilsCrossed, labelKey: "navFeeding",   roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/inventory", icon: Package,         labelKey: "navInventory", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/transfers", icon: ArrowRightLeft,  labelKey: "navTransfers", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    titleKey: "groupAdoption",
    tourKey: "group-adoption",
    items: [
      { href: "/dashboard/applications", icon: ClipboardList, labelKey: "navApplications", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/appointments", icon: CalendarDays,  labelKey: "navAppointments", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/followups",    icon: ListChecks,    labelKey: "navFollowups",    roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/forms",        icon: FileText,      labelKey: "navForms",        roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    titleKey: "groupCommunity",
    tourKey: "group-community",
    items: [
      { href: "/dashboard/posts",      icon: MessagesSquare, labelKey: "navPosts",      roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/volunteers", icon: HandHeart,      labelKey: "navVolunteers", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/foster",     icon: Home,           labelKey: "navFoster",     roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/events",     icon: CalendarHeart,  labelKey: "navEvents",     roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/messages",   icon: MessageCircle,  labelKey: "navMessages",   roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    titleKey: "groupDonation",
    tourKey: "group-donation",
    items: [
      { href: "/dashboard/tiers",         icon: Heart,          labelKey: "navTiers",         roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/campaigns",     icon: ClipboardCheck, labelKey: "navCampaigns",     roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/subscriptions", icon: Users,          labelKey: "navSubscriptions", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
  {
    titleKey: "groupPlatform",
    tourKey: "group-platform",
    items: [
      { href: "/dashboard/approvals", icon: ShieldCheck, labelKey: "navApprovals", roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/shelters",  icon: Building2,   labelKey: "navShelters",  roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/users",     icon: Users,       labelKey: "navUsers",     roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/vets",      icon: Stethoscope, labelKey: "navVets",      roles: ["SUPER_ADMIN"] },
      { href: "/dashboard/audit",     icon: ScrollText,  labelKey: "navAudit",     roles: ["SUPER_ADMIN"] },
    ],
  },
  {
    titleKey: "groupSettings",
    tourKey: "group-settings",
    items: [
      { href: "/profile/admin",      icon: UserCog, labelKey: "navProfileAdmin",    roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
      { href: "/dashboard/settings", icon: Settings, labelKey: "navShelterSettings", roles: ["SHELTER_ADMIN", "SUPER_ADMIN"] },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ role }: { role: string }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");

  const groups = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(i => i.roles.includes(role)) }))
    .filter(g => g.items.length > 0);

  return (
    <nav className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      {groups.map((group, gi) => (
        <div key={gi} className={cn(gi > 0 && "mt-4")} data-tour={group.tourKey}>
          {group.titleKey && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {t(group.titleKey)}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map(({ href, icon: Icon, labelKey }) => {
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
                  {t(labelKey)}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Bemutató (tutoriál) újraindítása */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("start-dashboard-tour"))}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-gray-400" />
          {t("navRestartTour")}
        </button>
      </div>
    </nav>
  );
}

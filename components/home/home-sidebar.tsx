import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Calendar, HandHeart, Building2, MapPin, FileWarning, PawPrint, Star } from "lucide-react";

export interface SidebarEvent {
  id: string; title: string; slug: string; startsAt: string; location: string;
}
export interface SidebarCampaign {
  id: string; title: string; targetAmount: number; raisedAmount: number;
}
export interface SidebarShelter {
  id: string; name: string; slug: string; city: string;
  logoUrl: string | null; animalCount: number;
}

function Card({
  icon: Icon, title, href, linkLabel, children,
}: {
  icon: typeof Calendar; title: string; href?: string; linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Icon className="h-4 w-4 text-brand-500" />
          {title}
        </h2>
        {href && linkLabel && (
          <Link href={href} className="text-xs font-semibold text-brand-600 hover:underline">
            {linkLabel}
          </Link>
        )}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

/**
 * Főoldali oldalsáv – a folyam melletti helyet tölti ki hasznos tartalommal
 * nagy képernyőn. Mobilon a folyam alá kerül.
 */
export function HomeSidebar({
  events, campaigns, shelters,
}: {
  events: SidebarEvent[];
  campaigns: SidebarCampaign[];
  shelters: SidebarShelter[];
}) {
  return (
    <aside className="space-y-4">

      {/* Gyorslinkek */}
      <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/animals",     Icon: PawPrint,    label: "Állatok"   },
            { href: "/shelters",    Icon: Building2,   label: "Menhelyek" },
            { href: "/map",         Icon: MapPin,      label: "Térkép"    },
            { href: "/reports/new", Icon: FileWarning, label: "Bejelentés" },
          ].map(({ href, Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 px-2 py-3 text-xs font-medium text-gray-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Közelgő események */}
      {events.length > 0 && (
        <Card icon={Calendar} title="Közelgő események" href="/events" linkLabel="Összes">
          <ul className="space-y-1">
            {events.slice(0, 4).map((e) => {
              const d = new Date(e.startsAt);
              return (
                <li key={e.id}>
                  <Link href={`/events/${e.slug}`} className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                      <span className="text-[9px] font-semibold uppercase leading-none">
                        {d.toLocaleDateString("hu-HU", { month: "short" })}
                      </span>
                      <span className="text-base font-black leading-tight">
                        {d.toLocaleDateString("hu-HU", { day: "numeric" })}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-gray-800">{e.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">{e.location}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Aktív gyűjtések */}
      {campaigns.length > 0 && (
        <Card icon={HandHeart} title="Aktív gyűjtések" href="/donate" linkLabel="Összes">
          <ul className="space-y-3">
            {campaigns.slice(0, 4).map((c) => {
              const pct = Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100));
              return (
                <li key={c.id}>
                  <Link href={`/donate/${c.id}`} className="block rounded-xl p-2 transition-colors hover:bg-gray-50">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-gray-800">{c.title}</p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-pink-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {c.raisedAmount.toLocaleString("hu-HU")} Ft · {pct}%
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Kiemelt menhelyek */}
      {shelters.length > 0 && (
        <Card icon={Building2} title="Menhelyek" href="/shelters" linkLabel="Összes">
          <ul className="space-y-1">
            {shelters.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link href={`/shelters/${s.slug}`} className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-gray-50">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-brand-50">
                    {s.logoUrl
                      ? <Image src={s.logoUrl} alt={s.name} fill className="object-cover" sizes="32px" />
                      : <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-brand-600">{s.name[0]}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">{s.name}</p>
                    <p className="truncate text-[11px] text-gray-400">{s.city}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-gray-400">
                    <Star className="h-3 w-3" />
                    {s.animalCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </aside>
  );
}

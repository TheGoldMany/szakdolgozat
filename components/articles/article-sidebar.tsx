import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Newspaper, PawPrint, HandHeart, Clock } from "lucide-react";

export interface SidebarArticle {
  id:    string;
  slug:  string | null;
  title: string;
  imageUrl: string | null;
  publishedAt: string | null;
  readingMinutes: number;
}
export interface SidebarAnimal {
  id: string; name: string; slug: string;
  breed: string | null; city: string; imageUrl: string | null;
}
export interface SidebarCampaign {
  id: string; title: string; targetAmount: number; raisedAmount: number;
}

function Card({
  icon: Icon, title, href, linkLabel, children,
}: {
  icon: typeof Newspaper; title: string; href: string; linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Icon className="h-4 w-4 text-brand-500" />
          {title}
        </h2>
        <Link href={href} className="text-xs font-semibold text-brand-600 hover:underline">
          {linkLabel}
        </Link>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

/**
 * A cikkoldal melletti sáv: a lényeges tartalmak, amik olvasás után
 * továbbvezetik az olvasót — további cikkek, gazdira váró állatok, gyűjtések.
 */
export function ArticleSidebar({
  articles, animals, campaigns,
}: {
  articles:  SidebarArticle[];
  animals:   SidebarAnimal[];
  campaigns: SidebarCampaign[];
}) {
  return (
    <aside className="space-y-4">

      {articles.length > 0 && (
        <Card icon={Newspaper} title="További cikkek" href="/articles" linkLabel="Összes">
          <ul className="space-y-1">
            {articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.slug ? `/articles/${a.slug}` : "/articles"}
                  className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-gray-50"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    {a.imageUrl ? (
                      <Image src={a.imageUrl} alt={a.title} fill className="object-cover" sizes="48px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <Newspaper className="h-4 w-4 text-brand-300" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-gray-800">{a.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock className="h-3 w-3 shrink-0" />
                      {a.readingMinutes} perc
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {animals.length > 0 && (
        <Card icon={PawPrint} title="Gazdira várnak" href="/animals" linkLabel="Összes">
          <ul className="space-y-1">
            {animals.map((a) => (
              <li key={a.id}>
                <Link href={`/animals/${a.slug}`} className="flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-gray-50">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    {a.imageUrl ? (
                      <Image src={a.imageUrl} alt={a.name} fill className="object-cover" sizes="40px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <PawPrint className="h-4 w-4 text-brand-300" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">{a.name}</p>
                    <p className="truncate text-[11px] text-gray-400">{a.breed ?? a.city}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {campaigns.length > 0 && (
        <Card icon={HandHeart} title="Aktív gyűjtések" href="/donate" linkLabel="Összes">
          <ul className="space-y-3">
            {campaigns.map((c) => {
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
    </aside>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { PawPrint, Calendar, HandHeart, MapPin, Loader2, AlertTriangle } from "lucide-react";
import { PostCard, type FeedPost } from "@/components/feed/post-card";
import { ShareButton } from "@/components/ui/share-button";

export interface AnimalRailItem { id: string; name: string; slug: string; breed: string | null; city: string; imageUrl: string | null; shelterName: string; shelterLogoUrl: string | null }
export interface EventRailItem  { id: string; title: string; slug: string; startsAt: string; location: string }
export interface CampaignRailItem { id: string; title: string; slug: string; targetAmount: number; raisedAmount: number; imageUrl: string | null; shelter: { name: string; slug: string; logoUrl: string | null } | null; user: { name: string | null; image: string | null } | null }
export interface ReportRailItem { id: string; type: string; animalType: string; city: string; imageUrl: string | null }

export type FeedItem =
  | { kind: "post";      post: FeedPost }
  | { kind: "animals";   animals: AnimalRailItem[] }
  | { kind: "events";    events: EventRailItem[] }
  | { kind: "campaigns"; campaigns: CampaignRailItem[] }
  | { kind: "reports";   reports: ReportRailItem[] };

const REPORT_LABEL: Record<string, string> = { LOST: "Elveszett", FOUND: "Megtalált", STRAY: "Kóbor" };
const ANIMAL_LABEL: Record<string, string> = { DOG: "Kutya", CAT: "Macska", RABBIT: "Nyúl", BIRD: "Madár", OTHER: "Egyéb" };

function Rail({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs font-semibold text-brand-700 hover:underline">{linkLabel}</Link>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

export function FeedClient({ initialItems, initialCursor }: { initialItems: FeedItem[]; initialCursor: string | null }) {
  const [items, setItems]   = useState<FeedItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?cursor=${cursor}&limit=10`);
      const data = await res.json();
      setItems((prev) => [...prev, ...data.posts.map((post: FeedPost) => ({ kind: "post" as const, post }))]);
      setCursor(data.nextCursor);
    } catch {
      /* csendes hiba – a felhasználó újra próbálhatja */
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => {
        switch (item.kind) {
          case "post":
            return <PostCard key={`post-${item.post.id}`} post={item.post} />;

          case "animals":
            return (
              <Rail key={`animals-${i}`} title="Új lakók" href="/animals" linkLabel="Összes">
                {item.animals.map((a) => (
                  <Link key={a.id} href={`/animals/${a.slug}`}
                    className="w-36 shrink-0 overflow-hidden rounded-xl border border-gray-100 transition-shadow hover:shadow-md flex flex-col">
                    <div className="relative h-28 w-full bg-gray-50">
                      {a.imageUrl
                        ? <Image src={a.imageUrl} alt={a.name} fill className="object-cover" sizes="144px" />
                        : <span className="flex h-full items-center justify-center"><PawPrint className="h-8 w-8 text-brand-200" /></span>}
                    </div>
                    <div className="p-2 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
                      <p className="truncate text-xs text-gray-500">{a.breed ?? a.city}</p>
                    </div>
                    {/* Shelter avatar + name */}
                    <div className="flex items-center gap-1.5 border-t border-gray-50 px-2 py-1.5">
                      <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-gray-100">
                        {a.shelterLogoUrl
                          ? <Image src={a.shelterLogoUrl} alt={a.shelterName} fill className="object-cover" sizes="16px" />
                          : <span className="flex h-full w-full items-center justify-center text-[7px] font-bold text-gray-400">{a.shelterName[0]}</span>}
                      </div>
                      <span className="truncate text-[10px] text-gray-400">{a.shelterName}</span>
                    </div>
                  </Link>
                ))}
              </Rail>
            );

          case "events":
            return (
              <Rail key={`events-${i}`} title="Közelgő események" href="/events" linkLabel="Összes">
                {item.events.map((e) => (
                  <div key={e.id} className="flex w-56 shrink-0 flex-col rounded-xl border border-gray-100 p-3">
                    <Link href={`/events/${e.slug}`} className="flex items-start gap-2">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><Calendar className="h-5 w-5" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900">{e.title}</span>
                        <span className="flex items-center gap-1 truncate text-xs text-gray-500">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {new Date(e.startsAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} · {e.location}
                        </span>
                      </span>
                    </Link>
                    <div className="mt-2 self-end">
                      <ShareButton url={`/events/${e.slug}`} title={e.title} />
                    </div>
                  </div>
                ))}
              </Rail>
            );

          case "campaigns":
            return (
              <Rail key={`campaigns-${i}`} title="Aktív gyűjtések" href="/donate" linkLabel="Összes">
                {item.campaigns.map((c) => {
                  const pct = Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100));
                  const avatar = c.shelter?.logoUrl ?? c.user?.image ?? null;
                  const label  = c.shelter?.name ?? c.user?.name ?? null;
                  return (
                    <div key={c.id} className="flex w-48 shrink-0 flex-col rounded-xl border border-gray-100 overflow-hidden">
                      <Link href={`/donate/${c.id}`} className="block">
                        {/* Campaign image */}
                        <div className="relative h-28 w-full bg-gradient-to-br from-pink-400 to-rose-600">
                          {c.imageUrl
                            ? <Image src={c.imageUrl} alt={c.title} fill className="object-cover" sizes="192px" />
                            : <span className="flex h-full items-center justify-center"><HandHeart className="h-8 w-8 text-white/60" /></span>}
                          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-pink-700">{pct}%</span>
                        </div>
                        <div className="p-2.5">
                          <p className="line-clamp-2 text-sm font-semibold text-gray-900 leading-snug">{c.title}</p>
                          <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <span className="block h-full rounded-full bg-pink-500" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">{c.raisedAmount.toLocaleString("hu-HU")} Ft</span>
                        </div>
                      </Link>
                      {/* Shelter / user avatar + name */}
                      {label && (
                        <div className="flex items-center gap-1.5 border-t border-gray-50 px-2.5 py-2">
                          <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-gray-100">
                            {avatar
                              ? <Image src={avatar} alt={label} fill className="object-cover" sizes="20px" />
                              : <span className="flex h-full w-full items-center justify-center text-[8px] font-bold text-gray-400">{label[0]}</span>}
                          </div>
                          <span className="truncate text-xs text-gray-500">{label}</span>
                          <div className="ml-auto">
                            <ShareButton url={`/donate/${c.id}`} title={c.title} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Rail>
            );

          case "reports":
            return (
              <Rail key={`reports-${i}`} title="Friss bejelentések" href="/reports" linkLabel="Összes">
                {item.reports.map((r) => (
                  <Link key={r.id} href={`/reports/${r.id}`}
                    className="w-36 shrink-0 overflow-hidden rounded-xl border border-gray-100 transition-shadow hover:shadow-md">
                    <div className="relative h-28 w-full bg-gray-50">
                      {r.imageUrl
                        ? <Image src={r.imageUrl} alt="" fill className="object-cover" sizes="144px" />
                        : <span className="flex h-full items-center justify-center"><AlertTriangle className="h-8 w-8 text-red-200" /></span>}
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {REPORT_LABEL[r.type] ?? r.type}
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{ANIMAL_LABEL[r.animalType] ?? r.animalType}</p>
                      <p className="truncate text-xs text-gray-500">{r.city}</p>
                    </div>
                  </Link>
                ))}
              </Rail>
            );
        }
      })}

      {cursor && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Több betöltése
          </button>
        </div>
      )}
    </div>
  );
}

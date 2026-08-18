"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  PawPrint, Calendar, HandHeart, MapPin, Loader2,
  AlertTriangle, Newspaper,
} from "lucide-react";
import { PostCard, type FeedPost } from "@/components/feed/post-card";
import { ShareButton } from "@/components/ui/share-button";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AnimalRailItem {
  id: string; name: string; slug: string; breed: string | null;
  city: string; imageUrl: string | null;
  shelterName: string; shelterLogoUrl: string | null;
}
export interface EventRailItem {
  id: string; title: string; slug: string; startsAt: string; location: string;
}
export interface CampaignRailItem {
  id: string; title: string; slug: string;
  targetAmount: number; raisedAmount: number; imageUrl: string | null;
  shelter: { name: string; slug: string; logoUrl: string | null } | null;
  user:    { name: string | null; image: string | null } | null;
}
export interface ReportRailItem {
  id: string; type: string; animalType: string; city: string; imageUrl: string | null;
}

export interface FeedClientProps {
  animals:       AnimalRailItem[];
  campaigns:     CampaignRailItem[];
  events:        EventRailItem[];
  reports:       ReportRailItem[];
  initialPosts:  FeedPost[];
  initialCursor: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const REPORT_LABEL_KEY: Record<string, string> = { LOST: "lost", FOUND: "found", STRAY: "stray" };
const ANIMAL_LABEL_KEY: Record<string, string> = { DOG: "dog", CAT: "cat", RABBIT: "rabbit", BIRD: "bird", OTHER: "other" };

const REPORT_COLOR: Record<string, string> = {
  LOST:  "bg-red-500",
  FOUND: "bg-green-500",
  STRAY: "bg-orange-500",
};

// ── Rail wrapper ─────────────────────────────────────────────────────────────

function Rail({
  icon: Icon, iconColor, title, href, linkLabel, children,
}: {
  icon: React.ElementType; iconColor: string;
  title: string; href: string; linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", iconColor)}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        </div>
        <Link href={href} className="text-xs font-semibold text-brand-600 hover:underline">{linkLabel} →</Link>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-4 py-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

// ── Animal card ───────────────────────────────────────────────────────────────

function AnimalCard({ a }: { a: AnimalRailItem }) {
  return (
    <Link
      href={`/animals/${a.slug}`}
      className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-shadow hover:shadow-md"
    >
      <div className="relative h-32 w-full bg-gray-100">
        {a.imageUrl
          ? <Image src={a.imageUrl} alt={a.name} fill className="object-cover" sizes="144px" />
          : <span className="flex h-full items-center justify-center"><PawPrint className="h-8 w-8 text-brand-200" /></span>}
      </div>
      <div className="flex flex-1 flex-col bg-white px-2.5 pt-2 pb-1.5">
        <p className="truncate text-sm font-semibold text-gray-900">{a.name}</p>
        <p className="truncate text-xs text-gray-400">{a.breed ?? a.city}</p>
      </div>
      <div className="flex items-center gap-1.5 border-t border-gray-50 bg-white px-2.5 py-1.5">
        <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {a.shelterLogoUrl
            ? <Image src={a.shelterLogoUrl} alt={a.shelterName} fill className="object-cover" sizes="16px" />
            : <span className="flex h-full w-full items-center justify-center text-[7px] font-bold text-gray-400">{a.shelterName[0]}</span>}
        </div>
        <span className="truncate text-[10px] text-gray-400">{a.shelterName}</span>
      </div>
    </Link>
  );
}

// ── Campaign card ─────────────────────────────────────────────────────────────

function CampaignCard({ c, locale }: { c: CampaignRailItem; locale: string }) {
  const pct    = Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100));
  const avatar = c.shelter?.logoUrl ?? c.user?.image ?? null;
  const label  = c.shelter?.name ?? c.user?.name ?? null;

  return (
    <div className="flex w-48 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md">
      <Link href={`/donate/${c.id}`} className="block">
        <div className="relative h-28 w-full bg-gradient-to-br from-pink-400 to-rose-600">
          {c.imageUrl
            ? <Image src={c.imageUrl} alt={c.title} fill className="object-cover" sizes="192px" />
            : <span className="flex h-full items-center justify-center"><HandHeart className="h-8 w-8 text-white/50" /></span>}
          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-pink-700 shadow-sm">
            {pct}%
          </span>
        </div>
        <div className="px-2.5 pt-2 pb-1.5">
          <p className="line-clamp-2 text-xs font-semibold leading-snug text-gray-900">{c.title}</p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-gray-400">{c.raisedAmount.toLocaleString(locale)} Ft</p>
        </div>
      </Link>
      {label && (
        <div className="flex items-center gap-1.5 border-t border-gray-50 px-2.5 py-1.5">
          <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {avatar
              ? <Image src={avatar} alt={label} fill className="object-cover" sizes="16px" />
              : <span className="flex h-full w-full items-center justify-center text-[7px] font-bold text-gray-400">{label[0]}</span>}
          </div>
          <span className="min-w-0 flex-1 truncate text-[10px] text-gray-400">{label}</span>
          <ShareButton url={`/donate/${c.id}`} title={c.title} />
        </div>
      )}
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ e, locale }: { e: EventRailItem; locale: string }) {
  const date = new Date(e.startsAt);
  const day   = date.toLocaleDateString(locale, { day: "numeric" });
  const month = date.toLocaleDateString(locale, { month: "short" });

  return (
    <div className="flex w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md">
      <Link href={`/events/${e.slug}`} className="flex gap-3 p-3">
        {/* Calendar day block */}
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-purple-50 text-purple-700">
          <span className="text-[10px] font-semibold uppercase leading-none">{month}</span>
          <span className="text-xl font-black leading-tight">{day}</span>
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{e.title}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-gray-400">
            <MapPin className="h-3 w-3 shrink-0" />{e.location}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-end border-t border-gray-50 px-3 py-1.5">
        <ShareButton url={`/events/${e.slug}`} title={e.title} />
      </div>
    </div>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

function ReportCard({
  r, reportLabel, animalLabel,
}: {
  r: ReportRailItem;
  reportLabel: (type: string) => string;
  animalLabel: (type: string) => string;
}) {
  return (
    <Link
      href={`/reports/${r.id}`}
      className="flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 transition-shadow hover:shadow-md"
    >
      <div className="relative h-28 w-full bg-gray-100">
        {r.imageUrl
          ? <Image src={r.imageUrl} alt="" fill className="object-cover" sizes="144px" />
          : <span className="flex h-full items-center justify-center"><AlertTriangle className="h-8 w-8 text-red-200" /></span>}
        <span className={cn("absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white", REPORT_COLOR[r.type] ?? "bg-gray-500")}>
          {reportLabel(r.type)}
        </span>
      </div>
      <div className="bg-white px-2.5 py-2">
        <p className="truncate text-sm font-semibold text-gray-900">{animalLabel(r.animalType)}</p>
        <p className="truncate text-xs text-gray-400">{r.city}</p>
      </div>
    </Link>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gray-200" />
      <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
        <Newspaper className="h-3 w-3 text-gray-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function FeedClient({
  animals, campaigns, events, reports,
  initialPosts, initialCursor,
}: FeedClientProps) {
  const t        = useTranslations("home");
  const tCommon  = useTranslations("common");
  const tReports = useTranslations("reports");
  const tAnimals = useTranslations("animals");
  const tArt     = useTranslations("articles");
  const locale   = useLocale();

  const reportLabel = (type: string) =>
    REPORT_LABEL_KEY[type] ? tReports(REPORT_LABEL_KEY[type]) : type;
  const animalLabel = (type: string) =>
    ANIMAL_LABEL_KEY[type] ? tAnimals(ANIMAL_LABEL_KEY[type]) : type;

  const [posts, setPosts]   = useState<FeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/posts?cursor=${cursor}&limit=10`);
      const data = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch {
      /* csendes hiba */
    } finally {
      setLoading(false);
    }
  }

  const hasContent = animals.length || campaigns.length || events.length || reports.length;

  return (
    <div className="space-y-4">

      {/* ── Tartalom railek (mindig legfelül, legújabb) ──── */}
      {hasContent > 0 && (
        <div className="space-y-4">
          {animals.length > 0 && (
            <Rail icon={PawPrint} iconColor="bg-brand-50 text-brand-600" title={t("feedNewAnimals")} href="/animals" linkLabel={tCommon("all")}>
              {animals.map((a) => <AnimalCard key={a.id} a={a} />)}
            </Rail>
          )}
          {campaigns.length > 0 && (
            <Rail icon={HandHeart} iconColor="bg-pink-50 text-pink-600" title={t("feedCampaigns")} href="/donate" linkLabel={tCommon("all")}>
              {campaigns.map((c) => <CampaignCard key={c.id} c={c} locale={locale} />)}
            </Rail>
          )}
          {events.length > 0 && (
            <Rail icon={Calendar} iconColor="bg-purple-50 text-purple-600" title={t("feedEvents")} href="/events" linkLabel={tCommon("all")}>
              {events.map((e) => <EventCard key={e.id} e={e} locale={locale} />)}
            </Rail>
          )}
          {reports.length > 0 && (
            <Rail icon={AlertTriangle} iconColor="bg-red-50 text-red-500" title={t("feedReports")} href="/reports" linkLabel={tCommon("all")}>
              {reports.map((r) => <ReportCard key={r.id} r={r} reportLabel={reportLabel} animalLabel={animalLabel} />)}
            </Rail>
          )}
        </div>
      )}

      {/* ── Cikkek ─────────────────────────────── */}
      {posts.length > 0 && (
        <>
          <SectionDivider label={tArt("title")} />
          <div className="space-y-4">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        </>
      )}

      {/* ── Több betöltése ────────────────────────────────── */}
      {cursor && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {tCommon("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}

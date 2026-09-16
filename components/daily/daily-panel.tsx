"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Heart, Loader2, PawPrint, Plus, Sparkles, X, CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DailyComposer } from "@/components/daily/daily-composer";

type Tab = "friends" | "recommended" | "trending";

interface Post {
  id:        string;
  imageUrl:  string;
  caption:   string | null;
  createdAt: string;
  author:    { id: string; name: string | null; image: string | null };
  animal:    { id: string; name: string; slug: string } | null;
  likeCount: number;
  likedByMe: boolean;
}

/** Óra-pontos „mennyi idővel ezelőtt" – a feed 24 órás, ennél finomabb nem kell. */
function useAgo() {
  const t = useTranslations("daily");
  return (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
    return h < 1 ? t("timeAgoJustNow") : t("timeAgoHours", { h });
  };
}

function PostCard({ post, onToggle }: { post: Post; onToggle: (id: string) => void }) {
  const t   = useTranslations("daily");
  const ago = useAgo();

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        {post.author.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.author.image} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-600">
            {post.author.name?.[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        <Link href={`/users/${post.author.id}`} className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">
            {post.author.name ?? "—"}
          </span>
          <span className="block text-[11px] text-gray-400">{ago(post.createdAt)}</span>
        </Link>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.imageUrl}
        alt={post.caption ?? ""}
        loading="lazy"
        className="aspect-square w-full bg-gray-100 object-cover"
      />

      <footer className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggle(post.id)}
            aria-label={post.likedByMe ? t("unlikeLabel") : t("likeLabel")}
            aria-pressed={post.likedByMe}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium transition-colors",
              post.likedByMe ? "text-rose-600 hover:bg-rose-50" : "text-gray-500 hover:bg-gray-100",
            )}
          >
            <Heart className={cn("h-4 w-4", post.likedByMe && "animate-pop fill-rose-600")} />
            {post.likeCount > 0 && post.likeCount}
          </button>

          {post.animal && (
            <Link
              href={`/animals/${post.animal.slug}`}
              className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
            >
              <PawPrint className="h-3 w-3" />
              {post.animal.name}
            </Link>
          )}
        </div>
        {post.caption && (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{post.caption}</p>
        )}
      </footer>
    </article>
  );
}

/**
 * A Napi állatok panel tartalma: funkciómagyarázó, feltöltő és a három feed.
 *
 * A „felfedező" fülek beleegyezéshez kötöttek. A kapu a szerveren is ott van,
 * ez itt csak a felület oldala: alapból csak azt látja valaki, akit ismer, és
 * a továbblépés az ő döntése — nem mi hozzuk meg helyette.
 */
export function DailyPanel({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("daily");

  const [introSeen, setIntroSeen]       = useState<boolean | null>(null);
  const [expanded, setExpanded]         = useState(false);
  const [tab, setTab]                   = useState<Tab>("friends");
  const [posts, setPosts]               = useState<Post[] | null>(null);
  const [showCompose, setShowCompose]   = useState(false);
  const [askConsent, setAskConsent]     = useState(false);

  const load = useCallback(async (which: Tab) => {
    setPosts(null);
    try {
      const res  = await fetch(`/api/daily-posts?tab=${which}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setPosts([]); return; }
      setPosts(json.posts ?? []);
      if (typeof json.introSeen    === "boolean") setIntroSeen(json.introSeen);
      if (typeof json.feedExpanded === "boolean") setExpanded(json.feedExpanded);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => { if (loggedIn) load(tab); }, [loggedIn, tab, load]);

  async function savePrefs(patch: { introSeen?: boolean; feedExpanded?: boolean }) {
    try {
      const res = await fetch("/api/daily-posts/prefs", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error(t("networkError"));
    }
  }

  async function toggleLike(id: string) {
    // Optimista: a szív azonnal váltson, a szám a szerver válaszából javul.
    setPosts((prev) => prev?.map((p) => p.id === id
      ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
      : p) ?? prev);
    try {
      const res  = await fetch(`/api/daily-posts/${id}/like`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      setPosts((prev) => prev?.map((p) => p.id === id
        ? { ...p, likedByMe: json.liked, likeCount: json.likeCount }
        : p) ?? prev);
    } catch {
      // Visszaállítás: a szerver a hiteles forrás.
      setPosts((prev) => prev?.map((p) => p.id === id
        ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
        : p) ?? prev);
      toast.error(t("networkError"));
    }
  }

  if (!loggedIn) {
    return (
      <div className="px-6 py-12 text-center">
        <Sparkles className="mx-auto h-9 w-9 text-gray-300" />
        <p className="mt-4 text-sm text-gray-600">{t("loginRequired")}</p>
        <Link
          href="/auth/login"
          className="press mt-5 inline-block rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("introStart")}
        </Link>
      </div>
    );
  }

  // ── Funkciómagyarázó (első megnyitáskor) ────────────────────────────────
  if (introSeen === false) {
    return (
      <div className="px-5 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" />
          <h3 className="text-base font-bold text-gray-900">{t("introTitle")}</h3>
        </div>
        <p className="text-sm leading-relaxed text-gray-700">{t("introLead")}</p>
        <ul className="mt-4 space-y-3">
          {[t("introPoint1"), t("introPoint2"), t("introPoint3")].map((point, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-gray-600">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                {i + 1}
              </span>
              {point}
            </li>
          ))}
        </ul>
        <Button
          className="mt-6 w-full"
          onClick={async () => { setIntroSeen(true); await savePrefs({ introSeen: true }); }}
        >
          {t("introStart")}
        </Button>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; locked: boolean }[] = [
    { key: "friends",     label: t("tabFriends"),     locked: false },
    { key: "recommended", label: t("tabRecommended"), locked: !expanded },
    { key: "trending",    label: t("tabTrending"),    locked: !expanded },
  ];

  const emptyText = tab === "friends" ? t("emptyFriends")
    : tab === "recommended" ? t("emptyRecommended") : t("emptyTrending");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Fülek */}
      <div className="flex shrink-0 gap-1 border-b border-gray-100 px-3 pb-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              if (item.locked) { setAskConsent(true); return; }
              setTab(item.key);
            }}
            aria-current={tab === item.key ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.key ? "bg-brand-600 text-white"
                : item.locked ? "text-gray-300"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {showCompose
          ? <DailyComposer onPosted={() => { setShowCompose(false); setTab("friends"); load("friends"); }} />
          : (
            <Button variant="outline" className="w-full" onClick={() => setShowCompose(true)}>
              <Plus className="h-4 w-4" />
              {t("composeOpen")}
            </Button>
          )}

        {posts === null && (
          <p className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </p>
        )}

        {posts?.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">{emptyText}</p>
        )}

        {posts?.map((post) => (
          <PostCard key={post.id} post={post} onToggle={toggleLike} />
        ))}

        {/* A beleegyezés-kérdés akkor jön elő, amikor az ismerősök elfogytak –
            vagy ha valaki egy zárt fülre koppint. Nem az első képernyőn:
            előbb lássa, mi ez, és csak utána döntsön a kiterjesztésről. */}
        {(askConsent || (tab === "friends" && !expanded && posts?.length === 0)) && (
          <div className="animate-fade-in-up rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
            <h4 className="text-sm font-bold text-gray-900">{t("consentTitle")}</h4>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{t("consentBody")}</p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  setExpanded(true); setAskConsent(false);
                  await savePrefs({ feedExpanded: true });
                  setTab("recommended");
                }}
              >
                {t("consentAccept")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAskConsent(false)}>
                {t("consentDecline")}
              </Button>
            </div>
          </div>
        )}

        {/* Visszavonás – a beleegyezés ne legyen egyirányú utca. */}
        {expanded && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href="/profile/napi"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t("calendarTitle")}
            </Link>
            <button
              type="button"
              onClick={async () => {
                setExpanded(false); setTab("friends");
                await savePrefs({ feedExpanded: false });
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {t("consentRevoke")}
            </button>
          </div>
        )}

        {!expanded && (
          <div className="pt-2">
            <Link
              href="/profile/napi"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t("calendarTitle")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export { X as DailyCloseIcon };

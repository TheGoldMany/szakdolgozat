import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Building2, Calendar, PawPrint, HandHeart, MapPin, Clock, ArrowRight } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { LikeButton } from "@/components/feed/like-button";
import { ShareButton } from "@/components/ui/share-button";

export interface FeedPost {
  id:        string;
  title:     string;
  slug:      string | null;
  excerpt:   string | null;
  content:   string;
  imageUrl:  string | null;
  createdAt: string;
  readingMinutes: number;
  /** A cikk köthető menhelyhez, de nem kötelező. */
  shelter:   { id: string; name: string; slug: string; logoUrl: string | null; city: string } | null;
  author:    { id: string; name: string | null; image: string | null } | null;
  animal:    { id: string; name: string; slug: string; images: { url: string }[] } | null;
  event:     { id: string; slug: string; title: string; startsAt: string; location: string } | null;
  campaign:  { id: string; slug: string; title: string; targetAmount: number; raisedAmount: number } | null;
  _count:    { likes: number };
  likedByMe: boolean;
}

/** Cikk-előnézet a hírfolyamban: cím, bevezető és átvezetés a teljes cikkre. */
export function PostCard({ post }: { post: FeedPost }) {
  const href = post.slug ? `/articles/${post.slug}` : null;
  // Bevezető hiányában a szöveg elejét mutatjuk, hogy legyen mit olvasni
  const lead = post.excerpt ?? (post.content.length > 220 ? `${post.content.slice(0, 220)}…` : post.content);

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Fejléc: szerző, illetve a kapcsolódó menhely, ha van */}
      <div className="flex items-center gap-3 px-4 pt-4">
        {post.shelter ? (
          <Link href={`/shelters/${post.shelter.slug}`} className="shrink-0">
            {post.shelter.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.shelter.logoUrl} alt={post.shelter.name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <Building2 className="h-5 w-5" />
              </span>
            )}
          </Link>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <PawPrint className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          {post.shelter ? (
            <Link href={`/shelters/${post.shelter.slug}`} className="block truncate text-sm font-semibold text-gray-900 hover:underline">
              {post.shelter.name}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-gray-900">
              {post.author?.name ?? "ÁllatiMenhelyek"}
            </p>
          )}
          <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
            {post.shelter ? `${post.shelter.city} · ` : ""}
            {timeAgo(post.createdAt)}
            <span className="text-gray-300">·</span>
            <Clock className="h-3 w-3 shrink-0" />
            {post.readingMinutes} perc
          </p>
        </div>
      </div>

      {/* Cím + bevezető */}
      <div className="px-4 py-3">
        {href ? (
          <Link href={href} className="block">
            <h2 className="text-lg font-bold leading-snug text-gray-900 transition-colors hover:text-brand-600">
              {post.title}
            </h2>
          </Link>
        ) : (
          <h2 className="text-lg font-bold leading-snug text-gray-900">{post.title}</h2>
        )}
        {lead && <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{lead}</p>}
      </div>

      {/* Borítókép */}
      {post.imageUrl && (
        href ? (
          <Link href={href} className="block">
            <div className="relative aspect-[4/3] w-full bg-gray-50">
              <Image src={post.imageUrl} alt={post.title} fill className="object-cover" sizes="(max-width:640px) 100vw, 640px" />
            </div>
          </Link>
        ) : (
          <div className="relative aspect-[4/3] w-full bg-gray-50">
            <Image src={post.imageUrl} alt={post.title} fill className="object-cover" sizes="(max-width:640px) 100vw, 640px" />
          </div>
        )
      )}

      {/* Hivatkozott entitás kivonata */}
      {post.animal && (
        <Link href={`/animals/${post.animal.slug}`}
          className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2.5 transition-colors hover:bg-gray-100">
          {post.animal.images[0]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.animal.images[0].url} alt={post.animal.name} className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-700"><PawPrint className="h-5 w-5" /></span>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-brand-700">Örökbefogadható</p>
            <p className="truncate text-sm font-semibold text-gray-900">{post.animal.name}</p>
          </div>
        </Link>
      )}

      {post.event && (
        <Link href={`/events/${post.event.slug}`}
          className="mx-4 mt-3 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-2.5 transition-colors hover:bg-gray-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600"><Calendar className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">{post.event.title}</p>
            <p className="flex items-center gap-1 truncate text-xs text-gray-500">
              <MapPin className="h-3 w-3 shrink-0" />
              {new Date(post.event.startsAt).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} · {post.event.location}
            </p>
          </div>
        </Link>
      )}

      {post.campaign && (() => {
        const pct = Math.min(100, Math.round((post.campaign.raisedAmount / post.campaign.targetAmount) * 100));
        return (
          <Link href={`/donate/${post.campaign.id}`}
            className="mx-4 mt-3 block rounded-xl border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100">
            <div className="flex items-center gap-2">
              <HandHeart className="h-4 w-4 shrink-0 text-pink-600" />
              <p className="truncate text-sm font-semibold text-gray-900">{post.campaign.title}</p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-pink-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {post.campaign.raisedAmount.toLocaleString("hu-HU")} Ft / {post.campaign.targetAmount.toLocaleString("hu-HU")} Ft ({pct}%)
            </p>
          </Link>
        );
      })()}

      {/* Átvezetés a teljes cikkre */}
      {href && (
        <Link href={href}
          className="mx-4 mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
          Tovább a cikkre
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}

      {/* Lábléc: kedvelés + megosztás */}
      <div className="mt-2 flex items-center justify-between px-2.5 py-2">
        <LikeButton postId={post.id} initialCount={post._count.likes} initialLiked={post.likedByMe} />
        <ShareButton
          url={href ?? "/articles"}
          title={`${post.title} – ÁllatiMenhelyek.hu`}
        />
      </div>
    </article>
  );
}

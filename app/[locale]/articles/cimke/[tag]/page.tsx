import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { Newspaper, Clock, ArrowLeft, Tag } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { publishedWhere, readingMinutes } from "@/lib/articles";
import { tagSlug } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";

const SITE_URL = siteUrl();

// ISR: a gyűjtőoldal 5 percenként frissül
export const revalidate = 300;

/**
 * Egy címszóhoz tartozó cikkek.
 *
 * A címszavak a szerkesztőben szabad szövegek, az URL viszont ékezet nélküli
 * slug – ezért nem tudunk közvetlenül szűrni az adatbázisban. A publikált
 * cikkek címszavait olvassuk ki, és slug szerint párosítjuk. Ez a mennyiség
 * mellett bőven elég, és cserébe nem kell külön címszó-tábla.
 */
async function findByTagSlug(slug: string) {
  const posts = await prisma.post.findMany({
    where:   { ...publishedWhere(), NOT: { tags: { isEmpty: true } } },
    orderBy: { publishedAt: "desc" },
    take:    200,
    select: {
      id: true, slug: true, title: true, excerpt: true, imageUrl: true,
      content: true, publishedAt: true, tags: true,
      author: { select: { name: true } },
    },
  });

  const matching = posts.filter((p) => p.tags.some((t) => tagSlug(t) === slug));
  // A megjelenítéshez az eredeti, ékezetes alakot használjuk.
  const label = matching[0]?.tags.find((t) => tagSlug(t) === slug) ?? null;

  return { posts: matching, label };
}

export async function generateMetadata(
  { params }: { params: { tag: string } }
): Promise<Metadata> {
  const t = await getTranslations("articles");
  const { label, posts } = await findByTagSlug(params.tag);
  if (!label) return { title: t("notFound") };

  return {
    title:       `${label} – ${t("title")}`,
    description: t("tagMetaDescription", { tag: label, count: posts.length }),
    alternates:  { canonical: `${SITE_URL}/articles/cimke/${params.tag}` },
  };
}

export default async function ArticlesByTagPage({ params }: { params: { tag: string } }) {
  const t      = await getTranslations("articles");
  const locale = await getLocale();

  const { posts, label } = await findByTagSlug(params.tag);
  if (!label) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">

        <Link
          href="/articles"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-500 sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("back")}
        </Link>

        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Tag className="h-5 w-5 text-brand-500" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{label}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {t("tagCount", { count: posts.length })}
            </p>
          </div>
        </div>

        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={post.slug ? `/articles/${post.slug}` : "/articles"}
                className="flex gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:h-24 sm:w-32">
                  {post.imageUrl ? (
                    <Image src={post.imageUrl} alt={post.title} fill className="object-cover" sizes="128px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Newspaper className="h-6 w-6 text-brand-300" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 font-bold leading-snug text-gray-900">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{post.excerpt}</p>
                  )}
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                    <span>{post.author?.name ?? t("editorial")}</span>
                    <span>·</span>
                    <span>
                      {post.publishedAt?.toLocaleDateString(locale, {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t("minutes", { count: readingMinutes(post.content) })}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

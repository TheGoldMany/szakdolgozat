import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Clock, Newspaper, User } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { readingMinutes, publishedWhere } from "@/lib/articles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("articles");
  return {
    title:       t("title"),
    description: t("metaDescription"),
  };
}

// ISR: a cikklista 5 percenként frissül (gyors betöltés cache-ből)
export const revalidate = 300;

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export default async function ArticlesListPage() {
  const t      = await getTranslations("articles");
  const locale = await getLocale();

  const articles = await prisma.post.findMany({
    where:   publishedWhere(),
    orderBy: { publishedAt: "desc" },
    select:  {
      id:          true,
      title:       true,
      slug:        true,
      excerpt:     true,
      content:     true,
      imageUrl:    true,
      publishedAt: true,
      author:      { select: { name: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
            <Newspaper className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("title")}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center sm:p-16">
            <Newspaper className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t("empty")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="press-card group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-300">
                  {article.imageUrl ? (
                    <Image
                      src={article.imageUrl}
                      alt={article.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Newspaper className="h-10 w-10 text-white/70" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  {article.publishedAt && (
                    <p className="text-xs font-semibold text-brand-600">
                      {formatDate(article.publishedAt, locale)}
                    </p>
                  )}
                  <h2 className="mt-1 font-bold leading-snug text-gray-900 group-hover:text-brand-600">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">
                      {article.excerpt}
                    </p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-50 pt-3 text-xs text-gray-400">
                    <span className="flex min-w-0 items-center gap-1">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{article.author?.name ?? t("editorial")}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {t("minutes", { count: readingMinutes(article.content) })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

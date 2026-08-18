import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarHeart,
  Clock,
  HeartHandshake,
  Newspaper,
  PawPrint,
  User,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { readingMinutes } from "@/lib/articles";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await prisma.post.findUnique({
    where:  { slug: params.slug },
    select: { title: true, excerpt: true, imageUrl: true, publishedAt: true },
  });
  if (!article || !article.publishedAt) return { title: "Cikk nem található" };

  const title       = article.title;
  const description = article.excerpt?.slice(0, 160) ?? `${article.title} – ÁllatiMenhelyek.hu`;
  const image       = article.imageUrl ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title, description, type: "article",
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title, description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

// ISR: a cikkoldal 5 percenként frissül
export const revalidate = 300;

function formatDate(date: Date) {
  return date.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric" });
}

/** Sima szöveg → bekezdések (üres sorok mentén darabolva). */
function toParagraphs(content: string): string[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function RelatedCard({
  href, label, title, icon: Icon,
}: {
  href: string;
  label: string;
  title: string;
  icon: typeof PawPrint;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50">
        <Icon className="h-5 w-5 text-brand-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate font-semibold text-gray-900 group-hover:text-brand-600">{title}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-brand-500" />
    </Link>
  );
}

export default async function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = await prisma.post.findUnique({
    where:   { slug: params.slug },
    include: {
      author:   { select: { name: true } },
      shelter:  { select: { name: true, slug: true } },
      animal:   { select: { name: true, slug: true } },
      event:    { select: { title: true, slug: true } },
      campaign: { select: { id: true, title: true } },
    },
  });

  // Piszkozat (publishedAt === null) a nyilvános oldalon nem létezik
  if (!article || !article.publishedAt) notFound();

  const paragraphs = toParagraphs(article.content);
  const minutes    = readingMinutes(article.content);

  const hasRelated =
    !!article.shelter || !!article.animal || !!article.event || !!article.campaign;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">

        <Link
          href="/articles"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Vissza a cikkekhez
        </Link>

        <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-brand-100 to-brand-300 sm:h-72">
            {article.imageUrl ? (
              <Image
                src={article.imageUrl}
                alt={article.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width:768px) 100vw, 768px"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Newspaper className="h-12 w-12 text-white/70" />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              {article.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 pb-5 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-gray-400" />
                {article.author?.name ?? "Szerkesztőség"}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarHeart className="h-4 w-4 text-gray-400" />
                {formatDate(article.publishedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-gray-400" />
                {minutes} perc olvasás
              </span>
            </div>

            {article.excerpt && (
              <p className="mt-6 text-lg font-medium leading-relaxed text-gray-700">
                {article.excerpt}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line leading-relaxed text-gray-700">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </article>

        {hasRelated && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              A cikkhez kapcsolódik
            </h2>
            <div className="space-y-3">
              {article.shelter && (
                <RelatedCard
                  href={`/shelters/${article.shelter.slug}`}
                  label="Menhely"
                  title={article.shelter.name}
                  icon={Building2}
                />
              )}
              {article.animal && (
                <RelatedCard
                  href={`/animals/${article.animal.slug}`}
                  label="Állat"
                  title={article.animal.name}
                  icon={PawPrint}
                />
              )}
              {article.event && (
                <RelatedCard
                  href={`/events/${article.event.slug}`}
                  label="Esemény"
                  title={article.event.title}
                  icon={CalendarHeart}
                />
              )}
              {article.campaign && (
                <RelatedCard
                  href={`/donate/${article.campaign.id}`}
                  label="Adománygyűjtés"
                  title={article.campaign.title}
                  icon={HeartHandshake}
                />
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

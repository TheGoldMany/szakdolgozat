import { Link } from "@/i18n/navigation";
import { ArrowRight, PawPrint, Dog, Cat, Rabbit, Bird, FileWarning, Building2, MapPin } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ReportStatus } from "@prisma/client";
import { HomeSearch } from "@/components/home/home-search";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { FeedClient } from "@/components/feed/feed-client";
import type { FeedPost } from "@/components/feed/post-card";
import { getTranslations } from "next-intl/server";
import { readingMinutes, publishedWhere } from "@/lib/articles";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/page-metadata";
import { paymentsEnabled } from "@/lib/payments-enabled";
import { websiteJsonLd } from "@/lib/structured-data";
import { JsonLd } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";

/**
 * A kezdőlapnak eddig egyáltalán nem volt saját metaadata: a találati listában
 * a puszta „ÁllatiMenhelyek.hu" cím jelent meg, ami semmilyen keresésre nem
 * illeszkedik. Ez a legfontosabb oldal, és az `absolute` cím azért kell, hogy
 * a márkanév ne kerüljön rá kétszer a sablon miatt.
 */
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("seo");
  return {
    ...pageMetadata({
      locale:      params.locale,
      path:        "/",
      title:       t("homeTitle"),
      description: t("homeDescription"),
    }),
    title: { absolute: `${t("homeTitle")} | ÁllatiMenhelyek.hu` },
  };
}

/**
 * A főoldalon legfeljebb ennyi cikk: az első kiemelt, a többi kompakt sor. A
 * többi a cikkoldalon van. Korábban 10 nagy kártya volt egymás alatt, és a
 * főoldal mobilon 10 képernyőnyi lett, az állatok rovására.
 */
const HOME_POSTS = 3;

export default async function HomePage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const t        = await getTranslations("home");
  const tAnimals = await getTranslations("animals");
  const session  = await getServerSession(authOptions);

  const [availableCount, shelterCount, adoptedCount, posts, railAnimals, railEvents, railCampaigns, railReports, heroAnimals, sidebarShelters, postTotal, speciesCounts] =
    await Promise.all([
      prisma.animal.count({ where: { status: AnimalStatus.AVAILABLE } }),
      prisma.shelter.count({ where: { isActive: true } }),
      prisma.animal.count({ where: { status: AnimalStatus.ADOPTED } }),
      prisma.post.findMany({
        // Csak publikált cikkek – a piszkozat nem kerülhet ki a főoldalra
        where:   publishedWhere(),
        take: HOME_POSTS,
        orderBy: { publishedAt: "desc" },
        include: {
          shelter:  { select: { id: true, name: true, slug: true, logoUrl: true, city: true } },
          author:   { select: { id: true, name: true, image: true } },
          animal:   { select: { id: true, name: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
          event:    { select: { id: true, slug: true, title: true, startsAt: true, location: true } },
          campaign: { select: { id: true, slug: true, title: true, targetAmount: true, raisedAmount: true } },
          _count:   { select: { likes: true } },
        },
      }),
      prisma.animal.findMany({
        where: { status: AnimalStatus.AVAILABLE },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, slug: true, breed: true, shelter: { select: { city: true, name: true, logoUrl: true } }, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
      }),
      prisma.event.findMany({
        where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 8,
        select: { id: true, title: true, slug: true, startsAt: true, location: true },
      }),
      // Fizetés kikapcsolva: gyűjtést sem mutatunk, a link úgyis 404-re vinne.
      !paymentsEnabled() ? Promise.resolve([]) : prisma.campaign.findMany({
        where: { status: "ACTIVE", isGeneral: false },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, slug: true, targetAmount: true, raisedAmount: true, imageUrl: true, shelter: { select: { name: true, slug: true, logoUrl: true } }, user: { select: { name: true, image: true } } },
      }),
      prisma.animalReport.findMany({
        where: { status: ReportStatus.ACTIVE },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, type: true, animalType: true, city: true, imageUrl: true },
      }),
      // Hero diavetítés: az utolsó 5 feltöltött, fotóval rendelkező elérhető állat
      prisma.animal.findMany({
        where:   { status: AnimalStatus.AVAILABLE, images: { some: { isPrimary: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          name: true, slug: true,
          shelter: { select: { name: true } },
          images:  { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      }),
      // Oldalsáv: kiemelt menhelyek
      prisma.shelter.findMany({
        where:   { isActive: true },
        orderBy: { animals: { _count: "desc" } },
        take: 5,
        select: {
          id: true, name: true, slug: true, city: true, logoUrl: true,
          _count: { select: { animals: { where: { status: AnimalStatus.AVAILABLE } } } },
        },
      }),
      prisma.post.count({ where: publishedWhere() }),
      // Fajonkénti darabszám: csak azokat a fajokat ajánljuk, amelyekből van állat.
      prisma.animal.groupBy({ by: ["type"], where: { status: AnimalStatus.AVAILABLE }, _count: { _all: true } }),
    ]);

  // Kedvelt poszt-id-k a bejelentkezett felhasználóhoz.
  let likedIds = new Set<string>();
  if (session?.user?.id && posts.length) {
    const likes = await prisma.postLike.findMany({
      where:  { userId: session.user.id, postId: { in: posts.map((p) => p.id) } },
      select: { postId: true },
    });
    likedIds = new Set(likes.map((l) => l.postId));
  }

  const feedPosts: FeedPost[] = posts.map((p) => ({
    id:        p.id,
    title:     p.title,
    slug:      p.slug,
    excerpt:   p.excerpt,
    content:   p.content,
    imageUrl:  p.imageUrl,
    createdAt: (p.publishedAt ?? p.createdAt).toISOString(),
    readingMinutes: readingMinutes(p.content),
    shelter:   p.shelter,
    author:    p.author,
    animal:    p.animal,
    event:     p.event ? { ...p.event, startsAt: p.event.startsAt.toISOString() } : null,
    campaign:  p.campaign,
    _count:    p._count,
    likedByMe: likedIds.has(p.id),
  }));

  const feedAnimals   = railAnimals.map((a) => ({ id: a.id, name: a.name, slug: a.slug, breed: a.breed, city: a.shelter.city, shelterName: a.shelter.name, shelterLogoUrl: a.shelter.logoUrl ?? null, imageUrl: a.images[0]?.url ?? null }));
  const feedEvents    = railEvents.map((e) => ({ id: e.id, title: e.title, slug: e.slug, startsAt: e.startsAt.toISOString(), location: e.location }));
  const feedCampaigns = railCampaigns.map((c) => ({ id: c.id, title: c.title, slug: c.slug, targetAmount: c.targetAmount, raisedAmount: c.raisedAmount, imageUrl: c.imageUrl ?? null, shelter: c.shelter ? { name: c.shelter.name, slug: c.shelter.slug, logoUrl: c.shelter.logoUrl ?? null } : null, user: c.user ? { name: c.user.name ?? null, image: c.user.image ?? null } : null }));
  const feedReports   = railReports;

  const heroSlides = heroAnimals
    .map((a) => ({ url: a.images[0]?.url ?? "", name: a.name, slug: a.slug, shelterName: a.shelter.name }))
    .filter((s) => s.url);

  const facts = [
    { key: "animals", value: availableCount, label: t("factAnimals", { count: availableCount }) },
    { key: "shelters", value: shelterCount,  label: t("factShelters", { count: shelterCount }) },
    { key: "adopted",  value: adoptedCount,  label: t("factAdopted",  { count: adoptedCount }) },
  ].filter((f) => f.value > 0);

  return (
    <>
      {/* A kereső innen tudja meg, mi ez az oldal, és innen kínálhat
          saját keresődobozt a találat alatt. */}
      <JsonLd data={websiteJsonLd(params.locale)} />
    <main className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div className="max-w-xl">
              {/* Nincs cédula a cím fölött és nincs kiemelt színű szó a címben:
                  mindkettő a sablonos kezdőlapok jele. A cím maga mondja meg,
                  mi ez az oldal. */}
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                {t("heroTitle")}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                {t("heroDesc")}
              </p>

              <div className="mt-6 w-full">
                <HomeSearch />
              </div>

              {/* A számok egy mondatban, nem három ikonos dobozban egy színes
                  sávon. A nullás tényt nem írjuk ki: indulás után egy nagy „0"
                  az első képernyőn bizalmat rombol, információt nem ad. */}
              {facts.length > 0 && (
                <p className="mt-4 text-sm text-gray-600">
                  {facts.map((fact, i) => (
                    <span key={fact.key}>
                      {i > 0 && <span className="mx-2 text-gray-300" aria-hidden>·</span>}
                      <span className="font-semibold text-gray-900 tabular-nums">{fact.value.toLocaleString("hu-HU")}</span>{" "}
                      {fact.label}
                    </span>
                  ))}
                </p>
              )}

              {/* Fajok szerinti gyorslinkek, darabszámmal. Csak az a faj
                  jelenik meg, amelyikből van állat, így a gomb sosem visz üres
                  listára; ahogy nő a kínálat, úgy jelennek meg az újabb fajok.
                  Állat nélkül a „hamarosan” blokk áll a helyükön. */}
              {availableCount === 0 ? (
                <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                  <p className="font-semibold text-gray-900">{t("soonTitle")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{t("soonDesc")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/reports/new"
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800">
                      <FileWarning className="h-3.5 w-3.5" /> {t("submitReport")}
                    </Link>
                    <Link href="/map"
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-700">
                      <MapPin className="h-3.5 w-3.5" /> {t("soonMap")}
                    </Link>
                    <Link href="/auth/register/shelter"
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-brand-300 hover:text-brand-700">
                      <Building2 className="h-3.5 w-3.5" /> {t("soonShelter")}
                    </Link>
                  </div>
                </div>
              ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href="/animals"
                  className="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800">
                  <PawPrint className="h-3.5 w-3.5" /> {t("allAnimals")}
                </Link>
                {[
                  { type: "DOG",    Icon: Dog,      label: tAnimals("dog")    },
                  { type: "CAT",    Icon: Cat,      label: tAnimals("cat")    },
                  { type: "RABBIT", Icon: Rabbit,   label: tAnimals("rabbit") },
                  { type: "BIRD",   Icon: Bird,     label: tAnimals("bird")   },
                  { type: "OTHER",  Icon: PawPrint, label: tAnimals("other")  },
                ]
                  .map((s) => ({ ...s, count: speciesCounts.find((c) => c.type === s.type)?._count._all ?? 0 }))
                  .filter((s) => s.count > 0)
                  .map(({ type, Icon, label, count }) => (
                  <Link key={type} href={`/animals?type=${type}`}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-600">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {t("speciesCount", { label, count })}
                  </Link>
                ))}
                <span className="mx-1 h-4 w-px bg-gray-300" />
                <Link href="/reports/new"
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white/60 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600">
                  <FileWarning className="h-3.5 w-3.5 shrink-0" />
                  {t("submitReport")}
                </Link>
              </div>
              )}
            </div>

            {/* Hero diavetítés – az utolsó 5 feltöltött állat fotója */}
            <div className="relative h-64 sm:h-80 lg:h-[22rem]">
              <HeroSlideshow slides={heroSlides} />
            </div>
          </div>
        </div>
      </section>

      {/* ── "Neked" feed ─────────────────────────────────── */}
      <section className="bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">

            {/* Folyam – kitölti a helyet az oldalsávig, így nem marad üres sáv */}
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{t("feedTitle")}</h2>
                <Link href="/animals" className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                  {t("all")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {(feedAnimals.length || feedReports.length || feedPosts.length) ? (
                <FeedClient
                  animals={feedAnimals}
                  campaigns={[]}
                  events={[]}
                  reports={feedReports}
                  initialPosts={feedPosts}
                  initialCursor={null}
                  compactAfter={1}
                  moreArticles={postTotal > feedPosts.length ? { href: "/articles", label: t("allArticles", { count: postTotal }) } : undefined}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
                  <PawPrint className="mx-auto mb-3 h-10 w-10 text-brand-200" />
                  <p className="text-sm text-gray-500">{t("feedEmpty")}</p>
                </div>
              )}

              {/* Mobilon az oldalsáv tartalma a folyam alá kerül */}
              <div className="mt-4 lg:hidden">
                <HomeSidebar
                  events={feedEvents}
                  campaigns={feedCampaigns}
                  shelters={sidebarShelters.map((s) => ({
                    id: s.id, name: s.name, slug: s.slug, city: s.city,
                    logoUrl: s.logoUrl, animalCount: s._count.animals,
                  }))}
                />
              </div>
            </div>

            {/* Oldalsáv – csak nagy képernyőn, a folyammal együtt görgethető */}
            <div className="hidden w-80 shrink-0 lg:block">
              <div className="sticky top-20">
                <HomeSidebar
                  events={feedEvents}
                  campaigns={feedCampaigns}
                  shelters={sidebarShelters.map((s) => ({
                    id: s.id, name: s.name, slug: s.slug, city: s.city,
                    logoUrl: s.logoUrl, animalCount: s._count.animals,
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Az örökbefogadás menete ─────────────────────────
          Kétoszlopos szakasz számozott listával. A korábbi három egyforma
          ikonos kártya a sarokban halvány óriás-sorszámmal a sablonos
          kezdőlapok legfelismerhetőbb eleme volt. */}
      <section className="border-t border-gray-200 bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:px-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("howTitle")}</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-600">{t("howIntro")}</p>
          </div>
          <ol className="divide-y divide-gray-200 border-y border-gray-200">
            {[
              { title: t("step1Title"), desc: t("step1Desc") },
              { title: t("step2Title"), desc: t("step2Desc") },
              { title: t("step3Title"), desc: t("step3Desc") },
            ].map(({ title, desc }, i) => (
              <li key={title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 py-5">
                <span className="font-display text-xl font-bold text-brand-600 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Bejelentés ──────────────────────────────────── */}
      <section className="bg-brand-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{t("ctaTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{t("ctaDesc")}</p>
          </div>
          <Link
            href="/reports/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            {t("submitReport")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </main>
    </>
  );
}

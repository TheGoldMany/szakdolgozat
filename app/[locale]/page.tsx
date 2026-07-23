import { Link } from "@/i18n/navigation";
import { ArrowRight, PawPrint, Building2, Heart, Search, ClipboardList, HandHeart, Dog, Cat, Rabbit, Bird, FileWarning } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalStatus, ReportStatus } from "@prisma/client";
import { HomeSearch } from "@/components/home/home-search";
import { HeroSlideshow } from "@/components/home/hero-slideshow";
import { FeedClient } from "@/components/feed/feed-client";
import type { FeedPost } from "@/components/feed/post-card";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const POSTS_PER_PAGE = 10;

export default async function HomePage() {
  const t        = await getTranslations("home");
  const tAnimals = await getTranslations("animals");
  const session  = await getServerSession(authOptions);

  const [availableCount, shelterCount, adoptedCount, posts, railAnimals, railEvents, railCampaigns, railReports, heroAnimals, composerShelter] =
    await Promise.all([
      prisma.animal.count({ where: { status: AnimalStatus.AVAILABLE } }),
      prisma.shelter.count({ where: { isActive: true } }),
      prisma.animal.count({ where: { status: AnimalStatus.ADOPTED } }),
      prisma.post.findMany({
        take: POSTS_PER_PAGE,
        orderBy: { createdAt: "desc" },
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
      prisma.campaign.findMany({
        where: { status: "ACTIVE" },
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
      // Shelter logo for post composer (SHELTER_ADMIN / SUPER_ADMIN only)
      session?.user?.id && (session.user.role === "SHELTER_ADMIN" || session.user.role === "SUPER_ADMIN")
        ? prisma.shelterAdmin.findFirst({
            where:   { userId: session.user.id },
            select:  { shelter: { select: { name: true, logoUrl: true } } },
          })
        : Promise.resolve(null),
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
    content:   p.content,
    imageUrl:  p.imageUrl,
    createdAt: p.createdAt.toISOString(),
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

  const composerInfo = (session?.user && composerShelter)
    ? { userImage: session.user.image ?? null, userName: session.user.name ?? null, shelterName: composerShelter.shelter.name, shelterLogoUrl: composerShelter.shelter.logoUrl ?? null }
    : null;

  const nextCursor = posts.length === POSTS_PER_PAGE ? posts[posts.length - 1].id : null;
  const heroSlides = heroAnimals
    .map((a) => ({ url: a.images[0]?.url ?? "", name: a.name, slug: a.slug, shelterName: a.shelter.name }))
    .filter((s) => s.url);

  return (
    <main className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm">
                <PawPrint className="h-3.5 w-3.5" />
                {t("badge", { count: availableCount })}
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                {t("heroTitle")}{" "}
                <span className="text-brand-700">{t("heroTitleHighlight")}</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-gray-500">
                {t("heroDesc")}
              </p>

              <div className="mt-6 w-full">
                <HomeSearch />
              </div>

              {/* Quick-nav: type links + report */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href="/animals"
                  className="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800">
                  <PawPrint className="h-3.5 w-3.5" /> {t("allAnimals")}
                </Link>
                {[
                  { href: "/animals?type=DOG",    Icon: Dog,      label: tAnimals("dog")    },
                  { href: "/animals?type=CAT",    Icon: Cat,      label: tAnimals("cat")    },
                  { href: "/animals?type=RABBIT", Icon: Rabbit,   label: tAnimals("rabbit") },
                  { href: "/animals?type=BIRD",   Icon: Bird,     label: tAnimals("bird")   },
                  { href: "/animals?type=OTHER",  Icon: PawPrint, label: tAnimals("other")  },
                ].map(({ href, Icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-600">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </Link>
                ))}
                <span className="mx-1 h-4 w-px bg-gray-300" />
                <Link href="/reports/new"
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white/60 px-3.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-brand-300 hover:text-brand-600">
                  <FileWarning className="h-3.5 w-3.5 shrink-0" />
                  {t("submitReport")}
                </Link>
              </div>
            </div>

            {/* Hero diavetítés – az utolsó 5 feltöltött állat fotója */}
            <div className="relative h-64 sm:h-80 lg:h-[22rem]">
              <HeroSlideshow slides={heroSlides} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────── */}
      <section className="bg-brand-600 py-6 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: availableCount, label: t("statsAvailable"), Icon: PawPrint  },
              { value: shelterCount,   label: t("statsShelters"),  Icon: Building2 },
              { value: adoptedCount,   label: t("statsAdopted"),   Icon: Heart     },
            ].map(({ value, label, Icon }) => (
              <div key={label}>
                <Icon className="mx-auto mb-1 h-5 w-5 text-white/75" />
                <p className="text-2xl font-bold sm:text-3xl">{value.toLocaleString("hu-HU")}</p>
                <p className="mt-0.5 text-xs text-white/75 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── "Neked" feed ─────────────────────────────────── */}
      <section className="bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{t("feedTitle")}</h2>
            <Link href="/animals" className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
              {t("all")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {(feedAnimals.length || feedCampaigns.length || feedEvents.length || feedPosts.length) ? (
            <FeedClient
              animals={feedAnimals}
              campaigns={feedCampaigns}
              events={feedEvents}
              reports={feedReports}
              initialPosts={feedPosts}
              initialCursor={nextCursor}
              composer={composerInfo}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
              <PawPrint className="mx-auto mb-3 h-10 w-10 text-brand-200" />
              <p className="text-sm text-gray-500">{t("feedEmpty")}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">{t("howTitle")}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { Icon: Search,        title: t("step1Title"), desc: t("step1Desc"), step: "1" },
              { Icon: ClipboardList, title: t("step2Title"), desc: t("step2Desc"), step: "2" },
              { Icon: HandHeart,     title: t("step3Title"), desc: t("step3Desc"), step: "3" },
            ].map(({ Icon, title, desc, step }) => (
              <div key={step} className="relative rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <span className="absolute right-4 top-4 text-3xl font-black text-gray-100">{step}</span>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-500" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────── */}
      <section className="bg-brand-600 py-14 text-center text-white">
        <div className="mx-auto max-w-xl px-4">
          <PawPrint className="mx-auto mb-4 h-10 w-10 text-brand-300" />
          <h2 className="text-2xl font-bold">{t("ctaTitle")}</h2>
          <p className="mt-2 text-sm text-white/75">{t("ctaDesc")}</p>
          <Link
            href="/reports/new"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow transition-colors hover:bg-brand-50"
          >
            {t("submitReport")}
          </Link>
        </div>
      </section>

    </main>
  );
}

import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { MapPin, Phone, Mail, Ruler, Calendar, Weight, Syringe, Scissors, Wifi, FileText, ClipboardList, PawPrint } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { AdoptionContact } from "@/components/animals/adoption-contact";
import { AdoptionForm } from "@/components/animals/adoption-form";
import { ShareButton } from "@/components/ui/share-button";
import { RatingBadge } from "@/components/reviews/rating-stat";
import { HealthTimeline } from "@/components/health/health-timeline";
import { AppointmentButton } from "@/components/appointments/appointment-button";
import { VirtualAdoptionCard } from "@/components/animals/virtual-adoption-card";
import { FavoriteButton } from "@/components/animals/favorite-button";
import { AnimalStatus, AnimalType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const animal = await prisma.animal.findUnique({
    where:  { slug: params.slug },
    select: {
      name: true, breed: true, description: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  });
  if (!animal) return { title: "Not found" };

  const title       = `${animal.name}${animal.breed ? ` – ${animal.breed}` : ""}`;
  const description = animal.description?.slice(0, 160) ?? `Ismerd meg ${animal.name} állatot, aki gazdira vár.`;
  const image       = animal.images[0]?.url;

  return {
    title,
    description,
    openGraph: {
      title, description, type: "article",
      ...(image ? { images: [{ url: image, alt: animal.name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title, description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

function Trait({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null || ok === undefined) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
      ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600",
    )}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

export default async function AnimalDetailPage({ params }: { params: { slug: string } }) {
  const [animal, session, t] = await Promise.all([
    prisma.animal.findUnique({
      where: { slug: params.slug },
      include: {
        images:  { orderBy: [{ isPrimary: "desc" }, { order: "asc" }] },
        shelter: { include: { documents: { orderBy: { createdAt: "asc" } } } },
      },
    }),
    getServerSession(authOptions),
    getTranslations("animals"),
  ]);

  if (!animal) notFound();

  const isFavorited = session?.user?.id
    ? !!(await prisma.favorite.findUnique({
        where: { userId_animalId: { userId: session.user.id, animalId: animal.id } },
      }))
    : false;

  const STATUS_COLOR: Record<AnimalStatus, string> = {
    AVAILABLE:    "bg-brand-100 text-brand-700",
    PENDING:      "bg-yellow-100 text-yellow-700",
    ADOPTED:      "bg-blue-100 text-blue-700",
    FOSTER:       "bg-purple-100 text-purple-700",
    MEDICAL_HOLD: "bg-red-100 text-red-700",
  };
  const STATUS_LABEL: Record<AnimalStatus, string> = {
    AVAILABLE:    t("statusAvailable"),
    PENDING:      t("statusPending"),
    ADOPTED:      t("statusAdopted"),
    FOSTER:       t("statusFoster"),
    MEDICAL_HOLD: t("statusMedicalHold"),
  };
  const TYPE_LABEL: Record<AnimalType, string> = {
    DOG: t("dog"), CAT: t("cat"), RABBIT: t("rabbit"), BIRD: t("bird"), OTHER: t("other"),
  };
  const SIZE_LABEL: Record<string, string> = {
    SMALL: t("small"), MEDIUM: t("medium"), LARGE: t("large"), EXTRA_LARGE: t("extraLarge"),
  };

  function formatAge(months: number | null) {
    if (!months) return null;
    if (months < 12) return t("ageMonths", { n: months });
    const years = Math.floor(months / 12);
    const rem   = months % 12;
    return rem > 0 ? t("ageYearsMonths", { y: years, m: rem }) : t("ageYears", { n: years });
  }

  const statusLabel = STATUS_LABEL[animal.status];
  const statusColor = STATUS_COLOR[animal.status];

  let existingConvId: string | null = null;
  // Van-e már beadott kérelme erre az állatra, és mit adott meg a profilján?
  let existingApplication: { id: string; status: string } | null = null;
  let adopterProfile: {
    homeType: string | null; hasGarden: boolean | null; hasChildren: boolean | null;
    hasPets: boolean | null; adoptionExperience: string | null;
  } | null = null;

  if (session?.user?.id) {
    const [conv, application, profile] = await Promise.all([
      prisma.conversation.findUnique({
        where:  { animalId_userId: { animalId: animal.id, userId: session.user.id } },
        select: { id: true },
      }),
      prisma.adoptionApplication.findUnique({
        where:  { userId_animalId: { userId: session.user.id, animalId: animal.id } },
        select: { id: true, status: true },
      }),
      prisma.user.findUnique({
        where:  { id: session.user.id },
        select: {
          homeType: true, hasGarden: true, hasChildren: true,
          hasPets: true, adoptionExperience: true,
        },
      }),
    ]);
    existingConvId      = conv?.id ?? null;
    existingApplication = application;
    adopterProfile      = profile;
  }

  // Virtuális gazdik (szponzorok)
  const activeSponsors = await prisma.sponsorship.findMany({
    where:   { animalId: animal.id, status: "ACTIVE" },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const publicSponsors = activeSponsors
    .filter((s) => s.isPublic)
    .map((s) => ({ name: s.displayName ?? s.user?.name ?? "Virtuális gazdi" }));

  const primaryImage = animal.images[0];
  const extraImages  = animal.images.slice(1);

  const AdoptionBlock = () => {
    if (animal.status !== AnimalStatus.AVAILABLE) {
      return <p className="text-sm text-gray-500">{t("notAdoptable")} (<span className="font-medium">{statusLabel}</span>).</p>;
    }
    if (!session) {
      return (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-5 text-center">
          <p className="text-sm text-gray-600">{t("loginRequired")}</p>
          <Link href={`/auth/login?callbackUrl=/animals/${animal.slug}`}
            className="mt-3 inline-block rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
            {t("loginButton")}
          </Link>
        </div>
      );
    }
    // Már beadott kérelem: ne lehessen másodszor beküldeni, inkább vezessük
    // a kérelme állapotához.
    if (existingApplication) {
      return (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5">
          <p className="font-medium text-brand-800">{t("alreadyApplied")}</p>
          <Link
            href={`/applications/${existingApplication.id}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {t("viewApplication")}
          </Link>
        </div>
      );
    }

    // Az örökbefogadási kérelem az elsődleges út. Az üzenetváltás mellette
    // marad, ha valaki előbb kérdezni szeretne.
    return (
      <div className="space-y-5">
        <AdoptionForm
          animalId={animal.id}
          animalName={animal.name}
          profile={adopterProfile}
        />

        <div className="border-t border-gray-200 pt-5">
          <p className="mb-3 text-sm text-gray-500">{t("orAskFirst")}</p>
          {existingConvId ? (
            <Link
              href={`/messages/${existingConvId}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              {t("continueConversation")}
            </Link>
          ) : (
            <AdoptionContact
              animalId={animal.id}
              animalName={animal.name}
              shelter={{ phone: animal.shelter.phone ?? null, email: animal.shelter.email ?? null }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">

        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/animals" className="hover:text-brand-500">{t("breadcrumb")}</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-800">{animal.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-5">

          {/* Images */}
          <div className="lg:col-span-3 space-y-3">

            {/* Mobil: swipe-elhető galéria (minden kép) */}
            <div className="lg:hidden">
              {animal.images.length > 0 ? (
                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {animal.images.map((img, i) => (
                    <div key={img.id} className="relative aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl bg-gray-100">
                      <Image src={img.url} alt={img.alt ?? animal.name} fill className="object-cover" priority={i === 0} sizes="88vw" />
                      {i === 0 && (
                        <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold", statusColor)}>
                          {statusLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gray-100"><PawPrint className="h-16 w-16 text-gray-300" /></div>
              )}
            </div>

            {/* Desktop: fő kép + bélyegképek */}
            <div className="hidden space-y-3 lg:block">
              <div className="relative overflow-hidden rounded-2xl bg-gray-100 aspect-[4/3]">
                {primaryImage ? (
                  <Image src={primaryImage.url} alt={primaryImage.alt ?? animal.name} fill className="object-cover" priority sizes="60vw" />
                ) : (
                  <div className="flex h-full items-center justify-center"><PawPrint className="h-16 w-16 text-gray-300" /></div>
                )}
                <span className={cn("absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold", statusColor)}>
                  {statusLabel}
                </span>
              </div>
              {extraImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {extraImages.slice(0, 4).map((img) => (
                    <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <Image src={img.url} alt={img.alt ?? ""} fill className="object-cover" sizes="25vw" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leírás – a képek alatt, hogy a bal oszlop ne maradjon üresen */}
            {animal.description && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-gray-800">{t("descSection")}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">{animal.description}</p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{animal.name}</h1>
                  {animal.breed && <p className="mt-0.5 text-sm text-gray-500">{animal.breed}</p>}
                </div>
                <ShareButton url={`/animals/${animal.slug}`} title={`${animal.name} – ÁllatiMenhelyek.hu`} />
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="w-24 text-xs font-medium text-gray-400 uppercase tracking-wide">{t("speciesLabel")}</span>
                  <span>{TYPE_LABEL[animal.type]}</span>
                </div>
                {animal.gender && (
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-xs font-medium text-gray-400 uppercase tracking-wide">{t("genderLabel")}</span>
                    <span>{animal.gender === "MALE" ? t("genderMale") : animal.gender === "FEMALE" ? t("genderFemale") : t("unknown")}</span>
                  </div>
                )}
                {animal.age && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">{t("ageLabel")}</span>
                    <span>{formatAge(animal.age)}</span>
                  </div>
                )}
                {animal.size && (
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-gray-400" />
                    <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">{t("sizeLabel")}</span>
                    <span>{SIZE_LABEL[animal.size] ?? animal.size}</span>
                  </div>
                )}
                {animal.weight && (
                  <div className="flex items-center gap-2">
                    <Weight className="h-3.5 w-3.5 text-gray-400" />
                    <span className="w-20 text-xs font-medium text-gray-400 uppercase tracking-wide">{t("weightLabel")}</span>
                    <span>{animal.weight} kg</span>
                  </div>
                )}
                {animal.color && (
                  <div className="flex items-center gap-2">
                    <span className="w-24 text-xs font-medium text-gray-400 uppercase tracking-wide">{t("colorLabel")}</span>
                    <span>{animal.color}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {animal.isVaccinated && (
                  <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    <Syringe className="h-3 w-3" /> {t("vaccinated")}
                  </span>
                )}
                {animal.isNeutered && (
                  <span className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                    <Scissors className="h-3 w-3" /> {t("neutered")}
                  </span>
                )}
                {animal.isMicrochipped && (
                  <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    <Wifi className="h-3 w-3" /> {t("microchipped")}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Trait ok={animal.isGoodWithKids} label={t("goodWithKids")} />
                <Trait ok={animal.isGoodWithDogs} label={t("goodWithDogs")} />
                <Trait ok={animal.isGoodWithCats} label={t("goodWithCats")} />
              </div>

              <div className="mt-4">
                <FavoriteButton animalId={animal.id} initialFavorited={isFavorited} variant="button" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">{t("shelterSection")}</h2>
              <Link href={`/shelters/${animal.shelter.slug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-brand-50 flex items-center justify-center">
                  {animal.shelter.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={animal.shelter.logoUrl} alt={animal.shelter.name} className="h-full w-full object-cover" />
                  ) : (
                    <MapPin className="h-4 w-4 text-brand-400" />
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-brand-500 hover:underline">{animal.shelter.name}</span>
                  <RatingBadge shelterId={animal.shelter.id} />
                </div>
              </Link>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{animal.shelter.city}{animal.shelter.address ? `, ${animal.shelter.address}` : ""}</div>
                {animal.shelter.phone && <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{animal.shelter.phone}</div>}
                {animal.shelter.email && <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{animal.shelter.email}</div>}
              </div>
            </div>
          {session && animal.status === AnimalStatus.AVAILABLE && (
            <AppointmentButton
              shelterId={animal.shelter.id}
              animalId={animal.id}
              animalName={animal.name}
            />
          )}
          {animal.status !== AnimalStatus.ADOPTED && (
            <VirtualAdoptionCard
              animalId={animal.id}
              animalName={animal.name}
              slug={animal.slug}
              loggedIn={!!session}
              sponsorCount={activeSponsors.length}
              publicSponsors={publicSponsors}
            />
          )}
          </div>
        </div>

        {(animal.shelter.adoptionRequirements || animal.shelter.documents.length > 0) ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">{t("adoptionSection")}</h2>
              <AdoptionBlock />
            </div>
            <div className="lg:col-span-2 space-y-4">
              {animal.shelter.adoptionRequirements && (
                <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-brand-600" />
                    <h2 className="text-sm font-semibold text-brand-800">{t("adoptionRequirements")}</h2>
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-brand-700">{animal.shelter.adoptionRequirements}</p>
                </div>
              )}
              {animal.shelter.documents.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <h2 className="text-sm font-semibold text-gray-700">{t("documentsSection")}</h2>
                  </div>
                  <ul className="space-y-2">
                    {animal.shelter.documents.map((doc) => (
                      <li key={doc.id}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:border-brand-100 hover:text-brand-700">
                          <FileText className="h-3.5 w-3.5 shrink-0" />{doc.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">{t("adoptionSection")}</h2>
            <AdoptionBlock />
          </div>
        )}

        <div className="mt-8">
          <HealthTimeline animalId={animal.id} />
        </div>

      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  PawPrint, ClipboardList, HandHeart, BarChart3, ArrowRight, Heart,
} from "lucide-react";
import {
  PLATFORM_FEE_PERCENT, STRIPE_PERCENT_FEE, STRIPE_FIXED_FEE_HUF,
  platformFee, stripeProcessingFee, donorTotal,
} from "@/lib/donation-limits";
import { paymentsEnabled } from "@/lib/payments-enabled";
import { notFound } from "next/navigation";

/**
 * A platformdíj részletes magyarázata.
 *
 * MIÉRT SAJÁT OLDAL, ÉS NEM A `/sugo` ALÁ
 *
 * A súgó 1387 sor, és egyetlen `useTranslations` hívás sincs benne: végig
 * beégetett magyar szöveg. Egy négynyelvű szakasz ott kirína, a súgó stílusát
 * követve viszont ez az oldal magyar-only lenne — márpedig a támogatók fele
 * nem magyarul olvas. Külön oldalként mind a négy nyelven megszólal.
 *
 * MIÉRT A KÓDBÓL JÖNNEK A SZÁMOK
 *
 * A példaszámítás ugyanazokat a függvényeket hívja, amikkel a fizetési űrlap
 * és a Stripe-sorok készülnek. Egy kézzel beírt „665 Ft" a következő
 * díjváltozásnál némán hazuggá válna — és pont egy olyan oldalon, aminek az
 * egyetlen dolga a nyíltság.
 */

const EXAMPLE_AMOUNT = 10_000;

export async function generateMetadata(): Promise<Metadata> {
  // A kapu a METAADAT-generálásban is kell, nem csak a komponensben: a
  // `force-dynamic` oldalaknál a komponens már a streamelés megkezdése
  // után fut, és akkor a 404-es státusz nem küldhető ki — az oldal a
  // „nem található" tartalmat adná vissza 200-as kóddal. A metaadat
  // ELŐBB fut, innen a státusz még állítható.
  if (!paymentsEnabled()) notFound();

  const t = await getTranslations("platformFee");
  return { title: t("title"), description: t("metaDescription") };
}

/** A funkciócsoportok ikonjai. A szövegek a nyelvi fájlokból jönnek. */
const GROUP_ICONS = [PawPrint, ClipboardList, HandHeart, BarChart3] as const;

export default async function PlatformFeePage() {
  // Fizetés kikapcsolva: az oldal nem létezik (lásd `lib/payments-enabled.ts`).
  if (!paymentsEnabled()) notFound();

  const t = await getTranslations("platformFee");

  const fmt = (n: number) => new Intl.NumberFormat("hu-HU").format(n);

  const rows = [
    { label: t("exampleDonation"),  value: EXAMPLE_AMOUNT,                     strong: true },
    { label: t("examplePlatform", { percent: PLATFORM_FEE_PERCENT }),
      value: platformFee(EXAMPLE_AMOUNT) },
    { label: t("exampleProcessing", { percent: STRIPE_PERCENT_FEE, fixed: STRIPE_FIXED_FEE_HUF }),
      value: stripeProcessingFee(EXAMPLE_AMOUNT) },
  ];

  const groups = GROUP_ICONS.map((Icon, i) => ({
    Icon,
    title: t(`group${i + 1}Title`),
    items: t.raw(`group${i + 1}Items`) as string[],
  }));

  return (
    <div className="bg-cream">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">

        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-forest">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-graphite sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-graphite/80">
            {t("lead")}
          </p>
        </header>

        {/* A számok elöl: aki ide kattintott, azt elsősorban az érdekli, hogy
            mennyi megy a menhelyhez. A magyarázat csak utána jön. */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-mint bg-white">
          <div className="border-b border-mint bg-mint/30 px-5 py-3">
            <h2 className="text-sm font-semibold text-graphite">
              {t("exampleHeading", { amount: `${fmt(EXAMPLE_AMOUNT)} Ft` })}
            </h2>
          </div>
          <dl className="divide-y divide-mint/60">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <dt className={row.strong ? "text-sm font-medium text-graphite" : "text-sm text-graphite/60"}>
                  {row.label}
                </dt>
                <dd className={`shrink-0 whitespace-nowrap tabular-nums ${row.strong ? "font-semibold text-graphite" : "text-sm text-graphite/60"}`}>
                  {fmt(row.value)} Ft
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 bg-cream px-5 py-3">
              <dt className="text-sm font-semibold text-graphite">{t("exampleTotal")}</dt>
              <dd className="shrink-0 whitespace-nowrap font-bold tabular-nums text-graphite">
                {fmt(donorTotal(EXAMPLE_AMOUNT))} Ft
              </dd>
            </div>
          </dl>
          <p className="border-t border-mint bg-white px-5 py-4 text-sm leading-relaxed text-graphite/80">
            <span className="font-semibold text-forest">
              {t("exampleNoteStrong", { amount: `${fmt(EXAMPLE_AMOUNT)} Ft` })}
            </span>{" "}
            {t("exampleNote")}
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-bold text-graphite">{t("whatHeading")}</h2>
          <p className="mt-3 leading-relaxed text-graphite/80">{t("whatLead")}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {groups.map(({ Icon, title, items }) => (
              <div key={title} className="rounded-2xl border border-mint bg-white p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/50">
                    <Icon className="h-4 w-4 text-forest" />
                  </span>
                  <h3 className="font-semibold text-graphite">{title}</h3>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-graphite/75">
                      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-apricot" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-mint bg-white p-6">
          <h2 className="text-xl font-bold text-graphite">{t("whyHeading")}</h2>
          <p className="mt-3 leading-relaxed text-graphite/80">{t("whyBody1")}</p>
          <p className="mt-3 leading-relaxed text-graphite/80">{t("whyBody2")}</p>
        </section>

        {/* A feldolgozási díj nem a miénk. Ha ezt elhallgatnánk, a támogató azt
            hinné, hogy a teljes különbözetet a platform teszi zsebre. */}
        <section className="mt-6 rounded-2xl border border-graphite/10 bg-white p-6">
          <h2 className="text-base font-semibold text-graphite">{t("detailsHeading")}</h2>
          <dl className="mt-4 space-y-4">
            {["platform", "processing", "free"].map((key) => (
              <div key={key}>
                <dt className="text-sm font-semibold text-graphite">{t(`details_${key}_q`)}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-graphite/75">{t(`details_${key}_a`)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href="/donate"
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            <Heart className="h-4 w-4" />
            {t("ctaDonate")}
          </Link>
          <Link
            href="/auth/register/shelter"
            className="inline-flex items-center gap-2 rounded-xl border border-mint bg-white px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-mint/30"
          >
            {t("ctaShelter")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}

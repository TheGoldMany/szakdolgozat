import type { Metadata } from "next";
import MapView from "./map-view";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

// A cím eddig beégetett magyar szöveg volt, a másik három nyelven is.
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  // Statikus/ISR renderelés: a nyelvet nem a kérés fejlécéből olvassa ki.
  setRequestLocale(params.locale);
  const t = await getTranslations("seo");
  return pageMetadata({
    locale:      params.locale,
    path:        "/map",
    title:       t("mapTitle"),
    description: t("mapDescription"),
  });
}

export default async function MapPage(props: { params: Promise<{ locale: string }> }) {
  // Statikus/ISR renderelés: a nyelvet nem a kérés fejlécéből olvassa ki.
  setRequestLocale((await props.params).locale);
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <MapView />
    </div>
  );
}

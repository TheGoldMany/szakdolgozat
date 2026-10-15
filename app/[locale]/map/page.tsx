import type { Metadata } from "next";
import MapView from "./map-view";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/lib/page-metadata";

// A cím eddig beégetett magyar szöveg volt, a másik három nyelven is.
export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations("seo");
  return pageMetadata({
    locale:      params.locale,
    path:        "/map",
    title:       t("mapTitle"),
    description: t("mapDescription"),
  });
}

export default function MapPage() {
  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <MapView />
    </div>
  );
}

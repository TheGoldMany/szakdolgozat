import Link from "next/link";
import { redirect } from "next/navigation";
import { Newspaper, Image as ImageIcon, Clock, Heart, Building2, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readingMinutes, isPublished, isScheduled } from "@/lib/articles";
import { ArticleEditor, type EditableArticle } from "@/components/dashboard/article-editor";

export const metadata: Metadata = { title: "Cikkek" };
export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "short", day: "numeric" });
}

export default async function DashboardArticlesPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/login");

  // A cikkeket kizárólag a platform adminja kezelheti.
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const articles = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count:  { select: { likes: true } },
      shelter: { select: { name: true } },
      author:  { select: { name: true } },
    },
  });

  const editingId = searchParams?.edit;
  const source    = editingId ? articles.find((a) => a.id === editingId) : undefined;

  const editing: EditableArticle | null = source
    ? {
        id:        source.id,
        title:     source.title,
        excerpt:   source.excerpt,
        content:   source.content,
        imageUrl:  source.imageUrl,
        shelterId: source.shelterId,
        published:   isPublished(source.publishedAt),
        publishedAt: source.publishedAt ? source.publishedAt.toISOString() : null,
      }
    : null;

  const publishedCount = articles.filter((a) => isPublished(a.publishedAt)).length;
  const scheduledCount = articles.filter((a) => isScheduled(a.publishedAt)).length;
  const draftCount     = articles.length - publishedCount - scheduledCount;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Newspaper className="h-6 w-6 text-brand-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cikkek</h1>
          <p className="text-sm text-gray-500">
            {articles.length} cikk · {publishedCount} publikált · {scheduledCount} időzített · {draftCount} piszkozat
          </p>
        </div>
      </div>

      {/* A szerkesztő kulcsot kap, hogy váltáskor újratöltse a mezőket. */}
      <ArticleEditor key={editing?.id ?? "new"} article={editing} />

      <div className="mt-6 space-y-3">
        {articles.length === 0 && (
          <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Még nincs egyetlen cikk sem. Írd meg az elsőt a fenti szerkesztőben.
          </p>
        )}

        {articles.map((a) => {
          const published = isPublished(a.publishedAt);
          const scheduled = isScheduled(a.publishedAt);
          const isEditing = a.id === editingId;

          return (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm ${
                isEditing ? "border-brand-200 ring-1 ring-brand-100" : "border-gray-100"
              }`}
            >
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-300">
                  <ImageIcon className="h-5 w-5" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-gray-900">
                    {a.title || "Cím nélküli cikk"}
                  </h2>
                  <span
                    className={
                      published
                        ? "rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700"
                        : scheduled
                          ? "rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"
                    }
                  >
                    {published ? "Publikálva" : scheduled ? "Időzítve" : "Piszkozat"}
                  </span>
                  {scheduled && a.publishedAt && (
                    <span className="text-[11px] text-blue-600">
                      {new Date(a.publishedAt).toLocaleString("hu-HU", {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                {a.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{a.excerpt}</p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span>{a.author?.name ?? "Ismeretlen szerző"}</span>
                  {a.shelter && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {a.shelter.name}
                    </span>
                  )}
                  <span>{formatDate(a.publishedAt ?? a.createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {readingMinutes(a.content)} perc olvasás
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3 shrink-0" />
                    {a._count.likes} kedvelés
                  </span>
                </div>
              </div>

              <Link
                href={`/dashboard/posts?edit=${a.id}`}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-brand-600"
              >
                <Pencil className="h-3.5 w-3.5" />
                Szerkesztés
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

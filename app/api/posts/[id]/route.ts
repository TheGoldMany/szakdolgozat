import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";
import { slugifyTitle, uniqueArticleSlug, isPublished } from "@/lib/articles";
import { cleanTermList } from "@/lib/seo";

const patchSchema = z.object({
  title:      z.string().min(3).max(200).optional(),
  excerpt:    z.string().max(400).nullable().optional(),
  content:    z.string().min(1).optional(),
  imageUrl:   z.string().url().nullable().optional().or(z.literal("")),
  /** Keresőoptimalizálás – mind opcionális, üresen értelmes tartalékot használunk. */
  seoTitle:        z.string().max(120).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  focusKeyword:    z.string().max(80).nullable().optional(),
  keywords:        z.array(z.string()).max(30).optional(),
  tags:            z.array(z.string()).max(30).optional(),

  shelterId:  z.string().nullable().optional(),
  animalId:   z.string().nullable().optional(),
  eventId:    z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  /** true = publikálás, false = visszavonás piszkozatba. */
  publish:    z.boolean().optional(),
  /** Megjelenés időpontja; jövőbeli érték = időzítés. */
  publishedAt: z.string().datetime().nullable().optional(),
});

// PATCH /api/posts/[id] – cikk szerkesztése (kizárólag SUPER_ADMIN)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;
  if (user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" }, { status: 400 });
  }
  const { publish, publishedAt, title, ...rest } = parsed.data;

  const existing = await prisma.post.findUnique({
    where:  { id: params.id },
    select: { id: true, title: true, slug: true, publishedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "A cikk nem található" }, { status: 404 });
  }

  try {
    // Cím változásakor a slug is követi, de ütközésmentesen
    let slug: string | undefined;
    if (title && title.trim() !== existing.title) {
      slug = await uniqueArticleSlug(slugifyTitle(title), existing.id);
    }

    const post = await prisma.post.update({
      where: { id: params.id },
      data: {
        ...rest,
        imageUrl: rest.imageUrl === "" ? null : rest.imageUrl,
        ...(title ? { title: title.trim() } : {}),
        ...(slug ? { slug } : {}),
        // A kulcsszó- és címszólisták nem mehetnek nyersen az adatbázisba:
        // a duplikátumok és a whitespace elrontanák a gyűjtőoldalakat.
        ...(rest.keywords !== undefined ? { keywords: cleanTermList(rest.keywords) } : {}),
        ...(rest.tags     !== undefined ? { tags:     cleanTermList(rest.tags)     } : {}),
        ...(rest.seoTitle        !== undefined ? { seoTitle:        rest.seoTitle?.trim()        || null } : {}),
        ...(rest.metaDescription !== undefined ? { metaDescription: rest.metaDescription?.trim() || null } : {}),
        ...(rest.focusKeyword    !== undefined ? { focusKeyword:    rest.focusKeyword?.trim()    || null } : {}),
        // Az explicit időpont erősebb a publish kapcsolónál: így lehet egy már
        // publikált cikket későbbre időzíteni, vagy időzítettet előrehozni.
        ...(publishedAt !== undefined
          ? { publishedAt: publishedAt ? new Date(publishedAt) : null }
          : publish === undefined
            ? {}
            : {
                // Publikáláskor a cikknek ténylegesen láthatóvá kell válnia:
                // a korábbi dátumot csak akkor tartjuk meg, ha az már elmúlt.
                // Piszkozatnál (null) és időzítettnél (jövőbeli) a jelen idő kell.
                publishedAt: publish
                  ? isPublished(existing.publishedAt)
                    ? existing.publishedAt
                    : new Date()
                  : null,
              }),
      },
    });
    return NextResponse.json(post);
  } catch (err) {
    console.error("[api/posts/[id] PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/posts/[id] – cikk törlése (kizárólag SUPER_ADMIN)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;
  if (user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const post = await prisma.post.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "A cikk nem található" }, { status: 404 });
  }

  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

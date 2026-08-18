import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";
import { slugifyTitle, uniqueArticleSlug } from "@/lib/articles";

const patchSchema = z.object({
  title:      z.string().min(3).max(200).optional(),
  excerpt:    z.string().max(400).nullable().optional(),
  content:    z.string().min(1).optional(),
  imageUrl:   z.string().url().nullable().optional().or(z.literal("")),
  shelterId:  z.string().nullable().optional(),
  animalId:   z.string().nullable().optional(),
  eventId:    z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  /** true = publikálás, false = visszavonás piszkozatba. */
  publish:    z.boolean().optional(),
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
  const { publish, title, ...rest } = parsed.data;

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
        ...(publish === undefined
          ? {}
          : { publishedAt: publish ? existing.publishedAt ?? new Date() : null }),
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

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

// GET /api/posts/[id]/like – kedvelte-e a bejelentkezett felhasználó. A
// főoldal gyorsítótárból jön (mindenkinek ugyanaz), ezért a személyes
// „kedveltem” jelzést a böngésző kéri le utólag.
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, error } = await requireAuthUser(req);
  if (error) return error;
  const existing = await prisma.postLike.findUnique({
    where:  { postId_userId: { postId: params.id, userId: user!.id } },
    select: { id: true },
  });
  return NextResponse.json({ liked: !!existing }, { headers: { "Cache-Control": "private, no-store" } });
}

// POST /api/posts/[id]/like – kedvelés ki/be kapcsolása (toggle)
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const post = await prisma.post.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "A poszt nem található" }, { status: 404 });
  }

  const existing = await prisma.postLike.findUnique({
    where: { postId_userId: { postId: params.id, userId: user!.id } },
  });

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.postLike.create({ data: { postId: params.id, userId: user!.id } });
  }

  const count = await prisma.postLike.count({ where: { postId: params.id } });
  return NextResponse.json({ liked: !existing, count });
}

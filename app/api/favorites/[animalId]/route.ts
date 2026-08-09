import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

// DELETE /api/favorites/[animalId] – remove an animal from favorites
export async function DELETE(
  req: NextRequest,
  { params }: { params: { animalId: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  try {
    await prisma.favorite.deleteMany({
      where: { userId: user!.id, animalId: params.animalId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/favorites/[animalId] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

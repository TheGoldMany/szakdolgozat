import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/favorites/[animalId] – remove an animal from favorites
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { animalId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    await prisma.favorite.deleteMany({
      where: { userId: session.user.id, animalId: params.animalId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/favorites/[animalId] DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

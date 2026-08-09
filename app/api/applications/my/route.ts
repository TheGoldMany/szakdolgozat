import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/applications/my – saját kérelmek (web session vagy mobil Bearer token)
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);

  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  try {
    const applications = await prisma.adoptionApplication.findMany({
      where:   { userId: authUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id:        true,
        status:    true,
        createdAt: true,
        animal: {
          select: {
            id:     true,
            name:   true,
            type:   true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true, isPrimary: true } },
          },
        },
      },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error('[api/applications/my GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

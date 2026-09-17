import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

const updateSchema = z.object({
  name:               z.string().min(2, "Legalább 2 karakter szükséges").max(100).optional(),
  phone:              z.string().max(20).optional().nullable(),
  address:            z.string().max(200).optional().nullable(),
  city:               z.string().max(100).optional().nullable(),
  emailNotifications: z.boolean().optional(),
  // Push értesítések kategóriánként. A típus → kategória leképezés a
  // `lib/push.ts`-ben van; itt csak a három kapcsoló él.
  pushMessages:       z.boolean().optional(),
  pushCaseUpdates:    z.boolean().optional(),
  pushCommunity:      z.boolean().optional(),
  // Örökbefogadói bemutatkozás – az emberre vonatkozik, nem egy állatra,
  // ezért a profilon él, és minden kérelembe onnan kerül át.
  bio:                z.string().max(2000).optional().nullable(),
  homeType:           z.enum(["HOUSE", "APARTMENT", "OTHER"]).optional().nullable(),
  hasGarden:          z.boolean().optional().nullable(),
  hasChildren:        z.boolean().optional().nullable(),
  hasPets:            z.boolean().optional().nullable(),
  adoptionExperience: z.string().max(2000).optional().nullable(),
});

/**
 * GET /api/profile – a saját profil és az értesítési beállítások.
 *
 * A mobilappnak kell: a bejelentkezéskor kapott adat csak az azonosítót, nevet
 * és szerepkört tartalmazza, a kapcsolók állását nem. Enélkül a beállítások
 * képernyő találgatna, és minden induláskor bekapcsolva mutatná a kapcsolókat,
 * függetlenül attól, hogy a felhasználó korábban kikapcsolta-e.
 */
export async function GET(req: NextRequest) {
  const { user: authUser, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  try {
    const user = await prisma.user.findUnique({
      where:  { id: authUser!.id },
      select: {
        id: true, name: true, email: true, phone: true, address: true, city: true, role: true,
        emailNotifications: true,
        pushMessages: true, pushCaseUpdates: true, pushCommunity: true,
      },
    });
    if (!user) return NextResponse.json({ error: "Nem található" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[api/profile GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user: authUser, error } = await requireAuthUser(req);
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: authUser!.id },
      data: parsed.data,
      select: {
        id: true, name: true, email: true, phone: true, address: true, city: true, role: true,
        emailNotifications: true,
        pushMessages: true, pushCaseUpdates: true, pushCommunity: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[api/profile PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

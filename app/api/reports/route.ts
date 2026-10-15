import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AnimalType, ReportType } from "@prisma/client";
import { blockIfSuspended } from "@/lib/account-status";
import { getAuthUser } from "@/lib/api-auth";
import { optionalOwnImageUrl, ownImageUrl } from "@/lib/image-url";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  type:         z.nativeEnum(ReportType),
  animalType:   z.nativeEnum(AnimalType),
  name:         z.string().max(100).optional(),
  breed:        z.string().max(100).optional(),
  color:        z.string().max(100).optional(),
  gender:       z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional(),
  description:  z.string().min(10, "Legalább 10 karakter szükséges").max(2000),
  city:         z.string().min(1, "Kötelező mező").max(100),
  address:      z.string().max(200).optional(),
  imageUrl:     optionalOwnImageUrl,
  imageUrls:    z.array(ownImageUrl).max(6).optional(),
  contactName:  z.string().min(2).max(100),
  contactPhone: z.string().min(1, "Kötelező mező").max(20),
  contactEmail: z.string().email("Érvénytelen email"),
  lat:          z.number().optional(),
  lng:          z.number().optional(),
});

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (authUser) {
    const suspended = await blockIfSuspended(authUser.id);
    if (suspended) return suspended;
  }
  // Bejelentés bejelentkezés nélkül is tehető, és a nyilvános listán meg a
  // térképen jelenik meg — ez a botok első célpontja. Két védelem:
  //  • korlát: anonim IP-nként óránként 5, bejelentkezve 20 (egy valódi
  //    bejelentő ennyit soha nem ér el);
  //  • csali mező: az űrlapon egy látogató számára láthatatlan `_hp` mező. Ember
  //    nem tölti ki, az űrlapokat vakon kitöltő bot igen. Ilyenkor SIKERT
  //    válaszolunk, de nem mentünk semmit — a bot így nem tanulja meg, hogy
  //    lebukott, és nem próbálkozik tovább másképp.
  const rateKey = authUser ? `report-user:${authUser.id}` : `report-anon:${getClientIp(req)}`;
  if (!checkRateLimit(rateKey, authUser ? 20 : 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Túl sok bejelentés rövid idő alatt. Próbáld újra később." }, { status: 429 });
  }

  const body = await req.json();
  if (typeof body?._hp === "string" && body._hp.trim() !== "") {
    return NextResponse.json({ report: { id: "ok" } }, { status: 201 });
  }
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" },
      { status: 400 }
    );
  }

  const { imageUrls, ...data } = parsed.data;
  // A galéria képei; az első a primary. Visszafelé kompatibilis a régi
  // egy-képes imageUrl mezővel is.
  const gallery = (imageUrls ?? []).filter(Boolean);
  const primaryUrl = gallery[0] || data.imageUrl || null;

  try {
    const report = await prisma.animalReport.create({
      data: {
        ...data,
        imageUrl: primaryUrl,
        userId: authUser?.id ?? null,
        ...(gallery.length && {
          images: {
            create: gallery.map((url, i) => ({
              url, alt: data.name ?? null, isPrimary: i === 0, order: i,
            })),
          },
        }),
      },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('[api/reports POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

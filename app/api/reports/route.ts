import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalType, ReportType } from "@prisma/client";

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
  imageUrl:     z.string().url().optional().or(z.literal("")),
  imageUrls:    z.array(z.string().url()).max(6).optional(),
  contactName:  z.string().min(2).max(100),
  contactPhone: z.string().min(1, "Kötelező mező").max(20),
  contactEmail: z.string().email("Érvénytelen email"),
  lat:          z.number().optional(),
  lng:          z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json();
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
        userId: session?.user?.id ?? null,
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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnimalType, AnimalStatus, AnimalSize } from "@prisma/client";
import { z } from "zod";

// ── GET /api/animals ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const rawPage  = Number(searchParams.get("page")  ?? 1);
  const rawLimit = Number(searchParams.get("limit") ?? 12);
  const page  = Math.max(1, isNaN(rawPage)  ? 1  : rawPage);
  const limit = Math.min(48, Math.max(1, isNaN(rawLimit) ? 12 : rawLimit));
  const skip  = (page - 1) * limit;

  const type    = searchParams.get("type") as AnimalType | null;
  const status  = (searchParams.get("status") as AnimalStatus | null) ?? AnimalStatus.AVAILABLE;
  const size    = searchParams.get("size") as AnimalSize | null;
  const gender  = searchParams.get("gender");
  const search  = searchParams.get("q")?.trim();
  const shelter = searchParams.get("shelterId");

  const where = {
    ...(type    && { type }),
    ...(status  && { status }),
    ...(size    && { size }),
    ...(gender  && { gender }),
    ...(shelter && { shelterId: shelter }),
    ...(search  && {
      OR: [
        { name:  { contains: search, mode: "insensitive" as const } },
        { breed: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [animals, total] = await Promise.all([
    prisma.animal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        images:  { where: { isPrimary: true }, take: 1 },
        shelter: { select: { id: true, name: true, city: true } },
      },
    }),
    prisma.animal.count({ where }),
  ]);

  return NextResponse.json({
    animals,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ── POST /api/animals ─────────────────────────────────────────────────────────
const createSchema = z.object({
  name:            z.string().min(1),
  type:            z.nativeEnum(AnimalType),
  breed:           z.string().optional(),
  ageMonths:       z.number().int().min(0).optional().nullable(),
  size:            z.nativeEnum(AnimalSize).optional().nullable(),
  gender:          z.enum(["MALE", "FEMALE", "UNKNOWN"]).optional().nullable(),
  color:           z.string().optional(),
  weight:          z.number().positive().optional().nullable(),
  description:     z.string().optional(),
  isVaccinated:    z.boolean().default(false),
  isNeutered:      z.boolean().default(false),
  isMicrochipped:  z.boolean().default(false),
  isGoodWithKids:  z.boolean().nullable().optional(),
  isGoodWithDogs:  z.boolean().nullable().optional(),
  isGoodWithCats:  z.boolean().nullable().optional(),
  imageUrls:       z.array(z.string().url()).optional(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isShelterAdmin = session.user.role === "SHELTER_ADMIN";
  if (!isSuperAdmin && !isShelterAdmin) {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  // Shelter meghatározása
  let shelterId: string;
  if (isSuperAdmin) {
    const body = await req.json();
    shelterId = body.shelterId;
    if (!shelterId) {
      return NextResponse.json({ error: "shelterId kötelező super adminhoz" }, { status: 400 });
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
    }
    return createAnimal(parsed.data, shelterId);
  } else {
    const adminRecord = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id },
      select: { shelterId: true },
    });
    if (!adminRecord) {
      return NextResponse.json({ error: "Nincs hozzárendelt menhely" }, { status: 403 });
    }
    shelterId = adminRecord.shelterId;
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
    }
    return createAnimal(parsed.data, shelterId);
  }
}

async function createAnimal(data: z.infer<typeof createSchema>, shelterId: string) {
  // Egyedi slug
  const base   = slugify(data.name);
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const slug   = `${base}-${suffix}`;

  try {
    const animal = await prisma.animal.create({
      data: {
        shelterId,
        name:           data.name,
        slug,
        type:           data.type,
        breed:          data.breed || null,
        age:            data.ageMonths ?? null,
        size:           data.size ?? null,
        gender:         data.gender ?? null,
        color:          data.color || null,
        weight:         data.weight ?? null,
        description:    data.description || null,
        isVaccinated:   data.isVaccinated,
        isNeutered:     data.isNeutered,
        isMicrochipped: data.isMicrochipped,
        isGoodWithKids: data.isGoodWithKids ?? null,
        isGoodWithDogs: data.isGoodWithDogs ?? null,
        isGoodWithCats: data.isGoodWithCats ?? null,
        status:         AnimalStatus.AVAILABLE,
        arrivedAt:      new Date(),
        ...((data.imageUrls?.length) && {
          images: {
            create: data.imageUrls.map((url, i) => ({
              url, alt: data.name, isPrimary: i === 0, order: i,
            })),
          },
        }),
      },
    });
    return NextResponse.json(animal, { status: 201 });
  } catch (error) {
    console.error("Animal create error:", error);
    return NextResponse.json({ error: "Nem sikerült menteni az állatot" }, { status: 500 });
  }
}

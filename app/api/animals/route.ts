import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AnimalType, AnimalStatus, AnimalSize } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") ?? 12)));
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

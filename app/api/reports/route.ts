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
  contactName:  z.string().min(2).max(100),
  contactPhone: z.string().max(20).optional(),
  contactEmail: z.string().email("Érvénytelen email"),
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

  const data = parsed.data;
  try {
    const report = await prisma.animalReport.create({
      data: {
        ...data,
        imageUrl: data.imageUrl || null,
        userId: session?.user?.id ?? null,
      },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error("Report create error:", error);
    return NextResponse.json({ error: "Nem sikerült elküldeni a bejelentést" }, { status: 500 });
  }
}

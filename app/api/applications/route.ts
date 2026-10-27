import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AnimalStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { requireAuthUser } from "@/lib/api-auth";
import { sendNewAdoptionApplicationEmail } from "@/lib/email";

const applicationSchema = z.object({
  animalId:    z.string().min(1),
  message:     z.string().optional(),
  homeType:    z.enum(["HOUSE", "APARTMENT", "OTHER"]).optional(),
  hasGarden:   z.boolean().optional(),
  hasChildren: z.boolean().optional(),
  hasPets:     z.boolean().optional(),
  experience:  z.string().optional(),
  adultConfirmed: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;
  const userId = user!.id;

  const body = await req.json();
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { animalId, adultConfirmed, ...rest } = parsed.data;

  // Check animal exists and is available
  const animal = await prisma.animal.findUnique({
    where:   { id: animalId },
    include: {
      shelter: {
        select: {
          name:   true,
          slug:   true,
          admins: { select: { user: { select: { email: true, name: true } } } },
        },
      },
    },
  });
  if (!animal) {
    return NextResponse.json({ error: "Az állat nem található" }, { status: 404 });
  }
  if (animal.status !== AnimalStatus.AVAILABLE) {
    return NextResponse.json({ error: "Ez az állat jelenleg nem fogadható örökbe" }, { status: 409 });
  }

  const applicant     = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, adultConfirmedAt: true } });
  const applicantName = applicant?.name ?? "Ismeretlen";

  // Szerződést csak nagykorú köthet. Jelszavas regisztrációnál erről már
  // nyilatkozott; közösségi belépésnél az első kérelemkor teszi meg.
  if (!applicant?.adultConfirmedAt) {
    if (adultConfirmed !== true) {
      return NextResponse.json({ error: "A kérelemhez nyilatkoznod kell, hogy elmúltál 18 éves." }, { status: 400 });
    }
    await prisma.user.update({ where: { id: userId }, data: { adultConfirmedAt: new Date() } });
  }

  try {
    const application = await prisma.adoptionApplication.create({
      data: { userId, animalId, ...rest },
    });

    const appUrl = `${process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu"}/dashboard/applications`;
    for (const admin of animal.shelter?.admins ?? []) {
      sendNewAdoptionApplicationEmail({
        to:             admin.user.email,
        adminName:      admin.user.name ?? admin.user.email,
        animalName:     animal.name,
        applicantName,
        applicationUrl: appUrl,
      }).catch((err) => console.error("[adoption application email]", err));
    }

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Már nyújtottál be kérelmet ehhez az állathoz" }, { status: 409 });
    }
    console.error("Application create error:", error);
    return NextResponse.json({ error: "Nem sikerült elküldeni a kérelmet" }, { status: 500 });
  }
}

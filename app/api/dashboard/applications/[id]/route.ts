import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { sendApplicationStatusEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";
import { requireAuthUser, type AuthUser } from "@/lib/api-auth";

const schema = z.object({
  status:      z.enum(["REVIEWING", "APPROVED", "REJECTED"]),
  reviewNotes: z.string().max(1000).optional(),
});

/**
 * Kezelheti-e ez a felhasználó ezt a kérelmet?
 *
 * A menhely adminja CSAK a saját menhelyéhez tartozó kérelmet — a kérelem a
 * menhelyhez az ÁLLATON keresztül kötődik, nem közvetlenül.
 */
async function canManage(user: AuthUser, shelterId: string): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role !== "SHELTER_ADMIN") return false;
  const admin = await prisma.shelterAdmin.findUnique({
    where: { userId_shelterId: { userId: user.id, shelterId } },
  });
  return !!admin;
}

/**
 * GET /api/dashboard/applications/[id] – egy kérelem a döntéshez.
 *
 * A mobil admin képernyőnek kell: az áttekintő csak nevet és státuszt ad, de
 * dönteni csak a válaszok ismeretében lehet. A webes felület ezt eddig
 * szerverkomponensből olvasta, tehát végpont nem létezett hozzá.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  // Szerepkör előbb, keresés utána: így a 404 és a 403 különbsége nem árulja
  // el egy kívülállónak, hogy létezik-e ilyen azonosítójú kérelem.
  if (user!.role !== "SHELTER_ADMIN" && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  try {
    const application = await prisma.adoptionApplication.findUnique({
      where:  { id: params.id },
      select: {
        id: true, status: true, message: true,
        homeType: true, hasGarden: true, hasChildren: true, hasPets: true,
        experience: true, reviewNotes: true, reviewedAt: true, createdAt: true,
        // A kérelmező elérhetőségei: a menhely innen veszi fel vele a
        // kapcsolatot, ha a döntéshez kérdezni akar valamit.
        user:   { select: { id: true, name: true, email: true, phone: true, city: true, bio: true } },
        animal: { select: { id: true, name: true, slug: true, shelterId: true } },
      },
    });
    if (!application) {
      return NextResponse.json({ error: "Kérelem nem található" }, { status: 404 });
    }

    if (!(await canManage(user!, application.animal.shelterId))) {
      return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error("[api/dashboard/applications/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // `requireAuthUser`, nem `getServerSession`: az utóbbi csak böngésző-
  // munkamenetet fogad el, tehát a mobil admin képernyő nem tudott dönteni.
  const { user: authUser, error: authError } = await requireAuthUser(req);
  if (authError) return authError;

  // A szerepkör-ellenőrzés a keresés ELŐTT marad, ahogy eddig is: enélkül egy
  // sima felhasználó a 404 és a 403 különbségéből megtudná, létezik-e az adott
  // azonosítójú kérelem.
  if (authUser!.role !== "SHELTER_ADMIN" && authUser!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const application = await prisma.adoptionApplication.findUnique({
    where: { id: params.id },
    include: {
      animal: { select: { shelterId: true, name: true } },
      user:   { select: { email: true, name: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Kérelem nem található" }, { status: 404 });
  }

  if (!(await canManage(authUser!, application.animal.shelterId))) {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const updated = await prisma.adoptionApplication.update({
    where: { id: params.id },
    data: {
      status:      parsed.data.status as ApplicationStatus,
      reviewNotes: parsed.data.reviewNotes,
      reviewedAt:  new Date(),
    },
  });

  // In-app notifications for all status transitions
  const notifMap = {
    REVIEWING: {
      type:  "APPLICATION_REVIEWING" as const,
      title: "Kérelmed elbírálás alatt",
      body:  `${application.animal.name} – a menhely megkezdte a kérelem feldolgozását.`,
      href:  "/applications",
    },
    APPROVED: {
      type:  "APPLICATION_APPROVED" as const,
      title: "Örökbefogadási kérelmed elfogadva",
      body:  `Gratulálunk! ${application.animal.name} hamarosan a tiéd lehet.`,
      href:  "/applications",
    },
    REJECTED: {
      type:  "APPLICATION_REJECTED" as const,
      title: "Örökbefogadási kérelmed elutasítva",
      body:  parsed.data.reviewNotes
        ? `${application.animal.name}: ${parsed.data.reviewNotes}`
        : `${application.animal.name} – a menhely elutasította a kérelmet.`,
      href:  "/applications",
    },
  };
  createNotification({ userId: application.userId, ...notifMap[parsed.data.status] })
    .catch((err) => console.error("Application notification error:", err));

  // Auto-create follow-up schedule when approved
  if (parsed.data.status === "APPROVED") {
    const now = Date.now();
    const days = (d: number) => new Date(now + d * 86_400_000);
    prisma.adoptionFollowUp.createMany({
      data: [
        { applicationId: params.id, scheduledAt: days(7) },
        { applicationId: params.id, scheduledAt: days(30) },
        { applicationId: params.id, scheduledAt: days(90) },
      ],
    }).then(() =>
      createNotification({
        userId: application.userId,
        type:   "FOLLOW_UP_DUE",
        title:  "Utánkövetés ütemezve",
        body:   `${application.animal.name} – 1 hét, 1 hónap és 3 hónap elteltével visszajelzést kérünk.`,
        href:   "/followups",
      })
    ).catch((err) => console.error("Follow-up schedule error:", err));
  }

  // Send email notification when status is final
  if (
    (parsed.data.status === "APPROVED" || parsed.data.status === "REJECTED") &&
    application.user?.email
  ) {
    sendApplicationStatusEmail({
      to:          application.user.email,
      name:        application.user.name ?? "Felhasználó",
      animalName:  application.animal.name,
      status:      parsed.data.status,
      reviewNotes: parsed.data.reviewNotes ?? null,
    }).catch((err) => console.error("Application status email error:", err));
  }

  return NextResponse.json({ application: updated });
}

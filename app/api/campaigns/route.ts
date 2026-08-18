import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { blockIfSuspended } from "@/lib/account-status";
function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const createSchema = z.object({
  title:        z.string().min(2).max(200),
  description:  z.string().min(2),
  targetAmount: z.number().int().positive(),
  imageUrl:     z.string().url().optional().or(z.literal("")).optional(),
  endsAt:       z.string().datetime().optional().nullable(),
  shelterId:    z.string().optional().nullable(), // opcionális – menhelyhez köthető
  animalId:     z.string().optional().nullable(), // opcionális – állathoz köthető
});

// GET /api/campaigns – list ACTIVE campaigns
export async function GET(_req: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where:   { status: "ACTIVE", isGeneral: false },
      orderBy: { createdAt: "desc" },
      include: {
        user:    { select: { name: true } },
        shelter: { select: { name: true, slug: true } },
        _count:  { select: { donations: true } },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("[api/campaigns GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/campaigns – create campaign (auth required)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  const suspendedBlock = await blockIfSuspended(session.user.id);
  if (suspendedBlock) return suspendedBlock;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // A gyűjtés indítójának saját Stripe fiókja (tartalék célpont, ha nincs menhely)
  const creator = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { stripeOnboardingComplete: true },
  });

  try {
    // Opcionális állat-kötés validálása; ha van állat, a menhelyt is abból vesszük
    let shelterId = d.shelterId || null;
    if (d.animalId) {
      const animal = await prisma.animal.findUnique({
        where:  { id: d.animalId },
        select: { id: true, shelterId: true },
      });
      if (!animal) {
        return NextResponse.json({ error: "A kiválasztott állat nem található." }, { status: 400 });
      }
      // Ha állatot köt, de menhelyt nem, az állat menhelyét használjuk
      if (!shelterId) shelterId = animal.shelterId;
    }

    // Érvényes Stripe-célpont kell: a választott menhely Stripe-ja, VAGY az indító személyes Stripe-ja.
    const shelterStripeOk = shelterId
      ? (await prisma.shelter.findUnique({
          where:  { id: shelterId },
          select: { stripeOnboardingComplete: true },
        }))?.stripeOnboardingComplete ?? false
      : false;

    if (!shelterStripeOk && !creator?.stripeOnboardingComplete) {
      return NextResponse.json(
        { error: "Gyűjtés indításához vagy a saját Stripe fiókod, vagy a választott menhely Stripe fiókja legyen bekötve." },
        { status: 402 }
      );
    }

    // Generate unique slug: slugified-title + random suffix
    const baseSlug = slugify(d.title);
    const suffix   = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const slug     = `${baseSlug}-${suffix}`;

    const campaign = await prisma.campaign.create({
      data: {
        userId:       session.user.id,
        shelterId,
        animalId:     d.animalId || null,
        title:        d.title,
        slug,
        description:  d.description,
        targetAmount: d.targetAmount,
        imageUrl:     d.imageUrl || null,
        endsAt:       d.endsAt ? new Date(d.endsAt) : null,
        status:       "PENDING",
      },
    });

    // Notify super admins about new pending campaign
    const superAdmins = await prisma.user.findMany({
      where:  { role: "SUPER_ADMIN" },
      select: { id: true },
    });
    createNotifications(superAdmins.map((u) => ({
      userId: u.id,
      type:   "CAMPAIGN_PENDING" as const,
      title:  "Új kampány jóváhagyásra vár",
      body:   campaign.title,
      href:   "/dashboard/approvals",
    }))).catch(() => {});

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[api/campaigns POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

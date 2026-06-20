import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  amount:      z.number().int().min(175, "Az összeg minimum 175 Ft (Stripe limit)"),
});

async function checkShelterAdmin(shelterId: string, userId: string, role: string) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "SHELTER_ADMIN") {
    const record = await prisma.shelterAdmin.findFirst({ where: { shelterId, userId } });
    return !!record;
  }
  return false;
}

// GET /api/shelters/[id]/tiers – public: list active tiers with subscription count
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tiers = await prisma.donationTier.findMany({
      where:   { shelterId: params.id, isActive: true },
      orderBy: { amount: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    });
    return NextResponse.json(tiers);
  } catch (error) {
    console.error('[api/shelters/[id]/tiers GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/shelters/[id]/tiers – shelter admin creates a tier
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  if (!(await checkShelterAdmin(params.id, session.user.id, session.user.role ?? ""))) {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  // Verify shelter exists
  const shelter = await prisma.shelter.findUnique({ where: { id: params.id } });
  if (!shelter) {
    return NextResponse.json({ error: "A menhely nem található" }, { status: 404 });
  }

  const tier = await prisma.donationTier.create({
    data: {
      shelterId:   params.id,
      name:        parsed.data.name,
      description: parsed.data.description ?? null,
      amount:      parsed.data.amount,
    },
  });

  return NextResponse.json(tier, { status: 201 });
}

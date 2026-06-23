import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
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
  shelterId:    z.string().min(1, "Kérjük válassz egy menhelyt"),
});

// GET /api/campaigns – list ACTIVE campaigns
export async function GET(_req: NextRequest) {
  try {
    const campaigns = await prisma.campaign.findMany({
      where:   { status: "ACTIVE" },
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

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  try {
    // Generate unique slug: slugified-title + random suffix
    const baseSlug = slugify(d.title);
    const suffix   = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const slug     = `${baseSlug}-${suffix}`;

    const campaign = await prisma.campaign.create({
      data: {
        userId:       session.user.id,
        shelterId:    d.shelterId ?? null,
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

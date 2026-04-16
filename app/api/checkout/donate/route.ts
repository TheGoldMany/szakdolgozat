import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const donateSchema = z.object({
  campaignId:  z.string().min(1),
  amount:      z.number().int().positive(),
  message:     z.string().max(500).optional().nullable(),
  isAnonymous: z.boolean().optional().default(false),
});

// POST /api/checkout/donate – record a donation and return bank transfer details
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const parsed = donateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { campaignId, amount, message, isAnonymous } = parsed.data;

  // Validate campaign is ACTIVE
  const campaign = await prisma.campaign.findUnique({
    where:   { id: campaignId },
    include: {
      shelter: {
        select: {
          name:              true,
          companyName:       true,
          bankAccountName:   true,
          bankAccountNumber: true,
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "A kampány nem található" }, { status: 404 });
  }
  if (campaign.status !== "ACTIVE") {
    return NextResponse.json({ error: "A kampány nem fogad adományokat" }, { status: 409 });
  }

  // Create donation record and increment raisedAmount atomically
  const [donation] = await prisma.$transaction([
    prisma.donation.create({
      data: {
        userId:      session?.user?.id ?? null,
        campaignId,
        amount,
        message:     message ?? null,
        isAnonymous: isAnonymous ?? false,
        paidAt:      new Date(),
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data:  { raisedAmount: { increment: amount } },
    }),
  ]);

  // Return bank transfer details if available
  const shelter = campaign.shelter;
  const bankInfo = shelter
    ? {
        beneficiary:   shelter.companyName ?? shelter.bankAccountName ?? shelter.name,
        accountNumber: shelter.bankAccountNumber,
        reference:     `Adomány: ${campaign.title}`,
      }
    : null;

  return NextResponse.json({ donationId: donation.id, amount, bankInfo });
}

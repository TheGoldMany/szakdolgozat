import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
});

// PATCH /api/admin/campaigns/[id] – approve or reject a campaign (SUPER_ADMIN only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Érvénytelen adatok", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) {
    return NextResponse.json({ error: "A kampány nem található" }, { status: 404 });
  }

  if (campaign.status !== "PENDING") {
    return NextResponse.json(
      { error: "Csak PENDING státuszú kampány módosítható" },
      { status: 409 }
    );
  }

  const { action } = parsed.data;

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data:
      action === "APPROVE"
        ? {
            status:      "ACTIVE",
            approvedById: session.user.id,
            approvedAt:  new Date(),
          }
        : {
            status: "REJECTED",
          },
  });

  return NextResponse.json(updated);
}

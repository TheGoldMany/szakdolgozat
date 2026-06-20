import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/campaigns/[id] – get single campaign
// Accessible if: status=ACTIVE, or the requesting user is the owner, or SUPER_ADMIN
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  try {
    const campaign = await prisma.campaign.findUnique({
      where:   { id: params.id },
      include: {
        user:    { select: { name: true } },
        shelter: { select: { name: true, slug: true } },
        donations: {
          select: {
            userId:     true,
            amount:     true,
            message:    true,
            isAnonymous:true,
            createdAt:  true,
            user:       { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { donations: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "A kampány nem található" }, { status: 404 });
    }

    const isOwner    = session?.user?.id === campaign.userId;
    const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

    if (campaign.status !== "ACTIVE" && !isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "A kampány nem elérhető" }, { status: 403 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[api/campaigns/[id] GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

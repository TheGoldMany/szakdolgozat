import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyName:       z.string().max(200).optional().nullable(),
  taxNumber:         z.string().max(20).optional().nullable(),
  bankAccountName:   z.string().max(200).optional().nullable(),
  bankAccountNumber: z.string().max(50).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  if (!isSuperAdmin) {
    const adminRecord = await prisma.shelterAdmin.findFirst({
      where: { userId: session.user.id, shelterId: params.id },
    });
    if (!adminRecord) {
      return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  try {
    const shelter = await prisma.shelter.update({
      where: { id: params.id },
      data:  parsed.data,
      select: {
        companyName: true, taxNumber: true,
        bankAccountName: true, bankAccountNumber: true,
      },
    });

    return NextResponse.json(shelter);
  } catch (error) {
    console.error('[api/shelters/[id]/payment-info PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

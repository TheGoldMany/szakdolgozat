import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  logoUrl: z.string().url(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only the shelter's own admin or super admin may update
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
    return NextResponse.json({ error: "Érvénytelen adat" }, { status: 400 });
  }

  await prisma.shelter.update({
    where: { id: params.id },
    data:  { logoUrl: parsed.data.logoUrl },
  });

  return NextResponse.json({ logoUrl: parsed.data.logoUrl });
}

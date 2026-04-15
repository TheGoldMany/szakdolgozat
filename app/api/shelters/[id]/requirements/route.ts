import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  adoptionRequirements: z.string().max(5000),
});

async function checkAccess(shelterId: string, userId: string, role: string) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "SHELTER_ADMIN") {
    const record = await prisma.shelterAdmin.findFirst({ where: { shelterId, userId } });
    return !!record;
  }
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkAccess(params.id, session.user.id, session.user.role ?? "")))
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const shelter = await prisma.shelter.update({
    where: { id: params.id },
    data:  { adoptionRequirements: parsed.data.adoptionRequirements || null },
    select: { adoptionRequirements: true },
  });
  return NextResponse.json(shelter);
}

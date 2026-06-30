import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  role:      z.enum(["USER", "SHELTER_ADMIN", "SUPER_ADMIN"]).optional(),
  suspended: z.boolean().optional(),
  reason:    z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Saját fiókod nem módosíthatod itt" }, { status: 400 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where:  { id: params.id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "A felhasználó nem található" }, { status: 404 });
  }

  // Másik super admint nem lehet felfüggeszteni
  if (parsed.data.suspended === true && target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super admin nem függeszthető fel" }, { status: 400 });
  }

  const data: { role?: "USER" | "SHELTER_ADMIN" | "SUPER_ADMIN"; suspendedAt?: Date | null; suspendedReason?: string | null } = {};
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.suspended === true) {
    data.suspendedAt     = new Date();
    data.suspendedReason = parsed.data.reason ?? null;
  } else if (parsed.data.suspended === false) {
    data.suspendedAt     = null;
    data.suspendedReason = null;
  }

  try {
    const user = await prisma.user.update({
      where:  { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, suspendedAt: true },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("[api/admin/users/[id] PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Saját fiókod nem törölheted itt" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where:  { id: params.id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "A felhasználó nem található" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Super admin nem törölhető" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/users/[id] DELETE]", error);
    return NextResponse.json({ error: "A felhasználó törlése sikertelen (kapcsolódó adatok miatt)." }, { status: 500 });
  }
}

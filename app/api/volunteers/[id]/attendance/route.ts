import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  date:  z.string().datetime(),
  hours: z.number().min(0.5).max(24),
  note:  z.string().max(300).optional(),
});

// POST /api/volunteers/[id]/attendance – admin logs hours
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const vol = await prisma.volunteer.findUnique({
    where: { id: params.id },
    select: { shelterId: true },
  });
  if (!vol) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: vol.shelterId },
  });
  if (!isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const record = await prisma.volunteerAttendance.create({
    data: {
      volunteerId: params.id,
      date:        new Date(parsed.data.date),
      hours:       parsed.data.hours,
      note:        parsed.data.note ?? null,
    },
  });

  return NextResponse.json(record, { status: 201 });
}

// GET /api/volunteers/[id]/attendance – list attendance for a volunteer
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const vol = await prisma.volunteer.findUnique({
    where: { id: params.id },
    select: { shelterId: true, userId: true },
  });
  if (!vol) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  const isOwner = vol.userId === session.user.id;
  const isAdmin = await prisma.shelterAdmin.findFirst({
    where: { userId: session.user.id, shelterId: vol.shelterId },
  });
  if (!isOwner && !isAdmin && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 403 });
  }

  const records = await prisma.volunteerAttendance.findMany({
    where:   { volunteerId: params.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(records);
}

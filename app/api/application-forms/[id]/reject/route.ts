import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

// POST /api/application-forms/[id]/reject – SUPER_ADMIN only
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Csak főadmin utasíthat el sablont" }, { status: 403 });
  }

  const form = await prisma.applicationForm.findUnique({ where: { id: params.id } });
  if (!form) {
    return NextResponse.json({ error: "Sablon nem található" }, { status: 404 });
  }

  // Optional reason in body
  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = body?.reason ?? undefined;
  } catch {
    // no body is fine
  }

  const updated = await prisma.applicationForm.update({
    where: { id: params.id },
    data: {
      status: "REJECTED",
      ...(reason !== undefined && { description: form.description ? `${form.description}\n\nElutasítás oka: ${reason}` : `Elutasítás oka: ${reason}` }),
    },
  });

  // Notify shelter admins
  const admins = await prisma.shelterAdmin.findMany({
    where:  { shelterId: form.shelterId },
    select: { userId: true },
  });
  createNotifications(admins.map((a) => ({
    userId: a.userId,
    type:   "FORM_REJECTED" as const,
    title:  "Kérvénysablon elutasítva",
    body:   reason ? `${form.title}: ${reason}` : form.title,
    href:   "/dashboard/application-forms",
  }))).catch(() => {});

  return NextResponse.json(updated);
}

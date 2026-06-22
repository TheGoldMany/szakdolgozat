import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotifications } from "@/lib/notifications";
import {
  sendShelterSuspendedEmail,
  sendShelterReactivatedEmail,
  sendShelterDeletedEmail,
} from "@/lib/email";

const patchSchema = z.object({
  isActive:   z.boolean().optional(),
  isVerified: z.boolean().optional(),
}).refine((d) => d.isActive !== undefined || d.isVerified !== undefined, {
  message: "Legalább egy mezőt meg kell adni",
});

// ── helpers ──────────────────────────────────────────────────────────────────

async function getShelterWithAdmins(id: string) {
  return prisma.shelter.findUnique({
    where: { id },
    select: {
      id:       true,
      name:     true,
      isActive: true,
      admins: {
        select: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

// ── PATCH – toggle isActive / isVerified ─────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  try {
    const shelter = await getShelterWithAdmins(params.id);
    if (!shelter) return NextResponse.json({ error: "A menhely nem található" }, { status: 404 });

    const updated = await prisma.shelter.update({
      where:  { id: params.id },
      data:   parsed.data,
      select: { id: true, isActive: true, isVerified: true },
    });

    // Send notifications when isActive changes
    if (parsed.data.isActive !== undefined) {
      const suspended  = !parsed.data.isActive;
      const notifType  = suspended ? "SHELTER_SUSPENDED" : "SHELTER_REACTIVATED";
      const notifTitle = suspended ? "Menhely felfüggesztve" : "Menhely újra aktív";
      const notifBody  = shelter.name;

      const adminUsers = shelter.admins.map((a) => a.user);

      void createNotifications(
        adminUsers.map((u) => ({
          userId: u.id,
          type:   notifType,
          title:  notifTitle,
          body:   notifBody,
          href:   "/dashboard",
        }))
      ).catch((err) => console.error("[shelter status notification]", err));

      for (const u of adminUsers) {
        const fn = suspended ? sendShelterSuspendedEmail : sendShelterReactivatedEmail;
        fn({ to: u.email, adminName: u.name ?? u.email, shelterName: shelter.name })
          .catch((err) => console.error("[shelter status email]", err));
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[api/admin/shelters/[id] PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE – permanently remove (must be suspended first) ────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    const shelter = await getShelterWithAdmins(params.id);
    if (!shelter) return NextResponse.json({ error: "A menhely nem található" }, { status: 404 });

    if (shelter.isActive) {
      return NextResponse.json(
        { error: "A menhelyt előbb fel kell függeszteni, mielőtt törölhető lenne." },
        { status: 409 }
      );
    }

    const adminUsers = shelter.admins.map((a) => a.user);

    // Send in-app notifications BEFORE deletion (cascade won't touch User/Notification records)
    await createNotifications(
      adminUsers.map((u) => ({
        userId: u.id,
        type:   "SHELTER_DELETED" as const,
        title:  "Menhely törölve",
        body:   shelter.name,
      }))
    ).catch((err) => console.error("[shelter delete notification]", err));

    // Send emails (fire-and-forget)
    for (const u of adminUsers) {
      sendShelterDeletedEmail({ to: u.email, adminName: u.name ?? u.email, shelterName: shelter.name })
        .catch((err) => console.error("[shelter delete email]", err));
    }

    // Delete the shelter (cascade deletes ShelterAdmin, animals, etc.)
    await prisma.shelter.delete({ where: { id: params.id } });

    // Demote admins who no longer manage any shelter
    for (const u of adminUsers) {
      const remaining = await prisma.shelterAdmin.count({ where: { userId: u.id } });
      if (remaining === 0) {
        await prisma.user.update({ where: { id: u.id }, data: { role: "USER" } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/shelters/[id] DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { createNotification, createNotifications } from "@/lib/notifications";

const patchSchema = z.object({
  // Jóváhagyás / elutasítás
  action:       z.enum(["APPROVE", "REJECT"]).optional(),
  // Vagy a gyűjtés adatainak szerkesztése
  title:        z.string().min(2).max(200).optional(),
  description:  z.string().min(2).optional(),
  targetAmount: z.number().int().positive().optional(),
  imageUrl:     z.string().url().nullable().optional().or(z.literal("")),
  endsAt:       z.string().datetime().nullable().optional(),
  status:       z.enum(["PENDING", "ACTIVE", "COMPLETED", "REJECTED"]).optional(),
}).refine(
  (d) => Object.keys(d).length > 0,
  { message: "Nincs módosítandó adat" },
);

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

  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
    if (!campaign) {
      return NextResponse.json({ error: "A kampány nem található" }, { status: 404 });
    }

    // Az állandó „Általános támogatás" gyűjtés a menhely mindig elérhető
      // adomány gombja: enélkül futó kampány híján egyáltalán nem tudna egyszeri
      // adományt fogadni. Rendszer által kezelt, nem szerkeszthető és nem törölhető.
    if (campaign.isGeneral) {
      return NextResponse.json(
        { error: "Az állandó „Általános támogatás” gyűjtés nem szerkeszthető." },
        { status: 409 },
      );
    }

    const { action, ...edits } = parsed.data;

    // A jóváhagyás/elutasítás csak függőben lévő gyűjtésre értelmezhető.
    // A szerkesztés viszont bármelyik státuszban megengedett, ezért ez a
    // feltétel kizárólag a jóváhagyási ágra vonatkozik.
    if (action && campaign.status !== "PENDING") {
      return NextResponse.json(
        { error: "Csak jóváhagyásra váró gyűjtés bírálható el" },
        { status: 409 }
      );
    }

    // Szerkesztés (nem jóváhagyás): a megadott mezőket frissítjük
    if (!action) {
      const updated = await prisma.campaign.update({
        where: { id: params.id },
        data: {
          ...(edits.title        !== undefined && { title: edits.title }),
          ...(edits.description  !== undefined && { description: edits.description }),
          ...(edits.targetAmount !== undefined && { targetAmount: edits.targetAmount }),
          ...(edits.status       !== undefined && { status: edits.status }),
          ...(edits.imageUrl     !== undefined && { imageUrl: edits.imageUrl || null }),
          ...(edits.endsAt       !== undefined && { endsAt: edits.endsAt ? new Date(edits.endsAt) : null }),
        },
      });
      logAudit({
        actorId:    session.user.id,
        action:     "CAMPAIGN_EDITED",
        targetType: "Campaign",
        targetId:   updated.id,
        targetName: updated.title,
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.campaign.update({
      where: { id: params.id },
      data:
        action === "APPROVE"
          ? { status: "ACTIVE", approvedById: session.user.id, approvedAt: new Date() }
          : { status: "REJECTED" },
    });

    logAudit({
      actorId:    session.user.id,
      action:     action === "APPROVE" ? "CAMPAIGN_APPROVED" : "CAMPAIGN_REJECTED",
      targetType: "Campaign",
      targetId:   updated.id,
      targetName: campaign.title,
    });

    // Notify campaign owner(s)
    void (async () => {
      try {
        if (campaign.shelterId) {
          const admins = await prisma.shelterAdmin.findMany({
            where:  { shelterId: campaign.shelterId },
            select: { userId: true },
          });
          await createNotifications(admins.map((a) => ({
            userId: a.userId,
            type:   (action === "APPROVE" ? "CAMPAIGN_APPROVED" : "CAMPAIGN_REJECTED") as "CAMPAIGN_APPROVED" | "CAMPAIGN_REJECTED",
            title:  action === "APPROVE" ? "Kampányod jóváhagyva" : "Kampányod elutasítva",
            body:   campaign.title,
            href:   action === "APPROVE" ? `/donate/${campaign.id}` : "/dashboard",
          })));
        } else if (campaign.userId) {
          await createNotification({
            userId: campaign.userId,
            type:   action === "APPROVE" ? "CAMPAIGN_APPROVED" : "CAMPAIGN_REJECTED",
            title:  action === "APPROVE" ? "Kampányod jóváhagyva" : "Kampányod elutasítva",
            body:   campaign.title,
            href:   action === "APPROVE" ? `/donate/${campaign.id}` : "/",
          });
        }
      } catch (err) {
        console.error("Campaign notification error:", err);
      }
    })();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[api/admin/campaigns/[id] PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// DELETE /api/admin/campaigns/[id] – gyűjtés végleges törlése (SUPER_ADMIN)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where:  { id: params.id },
    select: { id: true, title: true, isGeneral: true, _count: { select: { donations: true } } },
  });
  if (!campaign) {
    return NextResponse.json({ error: "A gyűjtés nem található" }, { status: 404 });
  }

  // Az állandó „Általános támogatás" gyűjtés a menhely mindig elérhető
  // adomány gombja: enélkül futó kampány híján egyáltalán nem tudna egyszeri
  // adományt fogadni. Rendszer által kezelt, nem szerkeszthető és nem törölhető.
  if (campaign.isGeneral) {
    return NextResponse.json(
      { error: "Az állandó „Általános támogatás” gyűjtés nem törölhető." },
      { status: 409 },
    );
  }

  // Beérkezett adomány mellett a törlés pénzügyi nyomot venne el:
  // ilyenkor lezárás javasolt a törlés helyett.
  if (campaign._count.donations > 0) {
    return NextResponse.json(
      {
        error:
          `A gyűjtéshez ${campaign._count.donations} adomány tartozik, ezért nem törölhető. ` +
          "Állítsd inkább Lezárt vagy Visszautasított státuszra.",
      },
      { status: 409 },
    );
  }

  try {
    await prisma.campaign.delete({ where: { id: params.id } });
    logAudit({
      actorId:    session.user.id,
      action:     "CAMPAIGN_DELETED",
      targetType: "Campaign",
      targetId:   campaign.id,
      targetName: campaign.title,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/campaigns/[id] DELETE]", error);
    return NextResponse.json({ error: "A törlés nem sikerült" }, { status: 500 });
  }
}

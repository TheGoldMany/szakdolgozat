import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { listConnections, requestConnection } from "@/lib/connections";

/** GET /api/connections – a saját ismerősök és a várakozó jelölések. */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  return NextResponse.json(await listConnections(user!.id));
}

const bodySchema = z.object({ userId: z.string().min(1) });

/** POST /api/connections – bejelölés (vagy a másik fél jelölésének elfogadása). */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  // A jelölés értesítést küld a másik félnek, tehát zaklatásra használható.
  if (!checkRateLimit(`connect:${user!.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Túl sok jelölés. Próbáld újra egy perc múlva." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where:  { id: parsed.data.userId, suspendedAt: null, deletionScheduledAt: null },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "A felhasználó nem található" }, { status: 404 });
  }

  const result = await requestConnection(user!.id, target.id);
  if (result.outcome === "self") {
    return NextResponse.json({ error: "Magadat nem jelölheted be" }, { status: 400 });
  }

  return NextResponse.json(result);
}

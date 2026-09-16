import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { acceptConnection, declineConnection, removeConnection } from "@/lib/connections";

const patchSchema = z.object({ action: z.enum(["accept", "decline"]) });

/**
 * PATCH /api/connections/[id] – várakozó jelölés elfogadása vagy elutasítása.
 *
 * Nem ellenőrizzük előre, hogy mi vagyunk-e a megszólított: a feltétel a
 * frissítés `where`-jében van, így két egyidejű hívásból is csak egy nyer.
 * Ezért a „nem sikerült" itt 409, nem 403 — vagy nem miénk a jelölés, vagy
 * valaki (akár mi, másik fülön) már válaszolt rá.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen művelet" }, { status: 400 });
  }

  const ok = parsed.data.action === "accept"
    ? await acceptConnection(user!.id, params.id)
    : await declineConnection(user!.id, params.id);

  if (!ok) {
    return NextResponse.json(
      { error: "Ez a jelölés már nem várakozik válaszra." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, action: parsed.data.action });
}

/**
 * DELETE /api/connections/[id] – kapcsolat megszüntetése vagy a saját,
 * még el nem fogadott jelölés visszavonása. Mindkét fél kiléphet.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const ok = await removeConnection(user!.id, params.id);
  if (!ok) {
    return NextResponse.json({ error: "Nem található" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

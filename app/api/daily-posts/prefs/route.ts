import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  introSeen:    z.boolean().optional(),
  feedExpanded: z.boolean().optional(),
});

/**
 * PATCH /api/daily-posts/prefs
 *
 * Két jelzés: látta-e a funkciómagyarázót, és beleegyezett-e az ismerősi körön
 * kívüli képekbe. Mindkettő visszavonható — a beleegyezés `false`-ra állítása
 * ugyanígy megy, hogy ne legyen egyirányú utca.
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user!.id },
    data:  {
      ...(parsed.data.introSeen    !== undefined && { dailyIntroSeen:    parsed.data.introSeen }),
      ...(parsed.data.feedExpanded !== undefined && { dailyFeedExpanded: parsed.data.feedExpanded }),
    },
    select: { dailyIntroSeen: true, dailyFeedExpanded: true },
  });
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Expo } from "expo-server-sdk";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/api-auth";

/**
 * A mobilapp eszközének regisztrálása push értesítésre.
 *
 * A token az EGYEDI kulcs, nem a felhasználó: egy telefonhoz egy token
 * tartozik, de egy felhasználónak több készüléke lehet, és egy készüléken
 * többen is bejelentkezhetnek egymás után. Ezért `upsert`: ha a token már
 * létezik, ÁTKERÜL az új felhasználóhoz — így a korábbi tulajdonos nem kapja
 * tovább az értesítéseit ugyanarra a telefonra.
 */

const registerSchema = z.object({
  token:    z.string().min(1).max(200),
  platform: z.enum(["ios", "android"]),
});

// POST /api/notifications/push-token – eszköz regisztrálása
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  // Az alakot itt is ellenőrizzük: rossz formátumú tokennel a küldés később
  // amúgy is elhasalna, csak akkor már a felhasználó észrevétele nélkül.
  if (!Expo.isExpoPushToken(token)) {
    return NextResponse.json({ error: "Érvénytelen push token" }, { status: 400 });
  }

  try {
    await prisma.pushToken.upsert({
      where:  { token },
      create: { token, platform, userId: user!.id },
      update: { platform, userId: user!.id, lastUsedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/notifications/push-token POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/notifications/push-token – kijelentkezéskor, hogy a következő
// felhasználó ne kapja meg az előző értesítéseit ezen az eszközön.
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuthUser(req, { allowSuspended: true });
  if (error) return error;

  const parsed = registerSchema
    .pick({ token: true })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });
  }

  try {
    // A `userId` a feltételben: senki ne tudja más eszközét leregisztrálni.
    await prisma.pushToken.deleteMany({
      where: { token: parsed.data.token, userId: user!.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/notifications/push-token DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isEmailConfigured, sendSiteFeedbackEmail } from "@/lib/email";

const CATEGORY_LABEL = { BUG: "Hiba", IDEA: "Ötlet", OTHER: "Egyéb" } as const;

const schema = z.object({
  category: z.enum(["BUG", "IDEA", "OTHER"]),
  message:  z.string().trim().min(5, "Írj legalább néhány szót.").max(3000),
  email:    z.string().trim().email("Érvénytelen e-mail-cím.").max(200).optional().or(z.literal("")),
  pageUrl:  z.string().max(500).optional(),
});

// POST /api/feedback – hibajelzés, ötlet az oldalról, e-mailben az üzemeltetőnek
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);

  const rateKey = authUser ? `feedback-user:${authUser.id}` : `feedback-anon:${getClientIp(req)}`;
  if (!checkRateLimit(rateKey, authUser ? 20 : 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Túl sok visszajelzés rövid idő alatt. Próbáld újra később." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  // Csapda-mező: ember nem tölti ki, bot igen. Sikert válaszolunk, de nem küldünk.
  if (typeof body?._hp === "string" && body._hp.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" }, { status: 400 });
  }

  // Levélküldő nélkül a küldés csendben elmaradna: a felület ilyenkor a
  // közvetlen e-mail-címet ajánlja fel, hogy a jelzés ne vesszen el.
  if (!isEmailConfigured()) {
    console.error("[api/feedback] RESEND_API_KEY nincs beállítva, a visszajelzés nem küldhető");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // Bejelentkezett felhasználónál a fiók e-mail-címe a válaszcím, ha nem adott meg mást.
  let email = parsed.data.email || null;
  if (!email && authUser) {
    const user = await prisma.user.findUnique({ where: { id: authUser.id }, select: { email: true } });
    email = user?.email ?? null;
  }

  try {
    await sendSiteFeedbackEmail({
      category:  CATEGORY_LABEL[parsed.data.category],
      message:   parsed.data.message,
      email,
      userId:    authUser?.id ?? null,
      pageUrl:   parsed.data.pageUrl ?? null,
      userAgent: req.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[api/feedback]", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

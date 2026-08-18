import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shelterRegisterSchema } from "@/lib/validations/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { issueVerificationToken } from "@/lib/verification";
import { createNotifications } from "@/lib/notifications";
import { ensureShelterDefaults } from "@/lib/shelter-defaults";
import { geocodeAddress } from "@/lib/geo";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`register-shelter:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Túl sok kísérlet. Próbáld újra 1 perc múlva." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = shelterRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Érvénytelen adatok", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: d.email } });
    if (existing) {
      return NextResponse.json({ error: "Ez az email cím már foglalt." }, { status: 409 });
    }

    // Egyedi slug generálás
    let slug = slugify(d.shelterName);
    const count = await prisma.shelter.count({ where: { slug: { startsWith: slug } } });
    if (count > 0) slug = `${slug}-${count + 1}`;

    const hashed = await hash(d.password, 10);

    // Cím → koordináta, hogy a menhely megjelenjen a térképen (hibatűrő)
    const coords = await geocodeAddress({
      address: d.address,
      city:    d.city,
      zipCode: d.zipCode,
      country: "Hungary",
    });

    const { shelter } = await prisma.$transaction(async (tx) => {
      // Admin fiók — email NINCS megerősítve, a felhasználónak igazolnia kell (mint a sima regisztrációnál)
      const adminUser = await tx.user.create({
        data: {
          name:     d.adminName,
          email:    d.email,
          password: hashed,
          role:     Role.SHELTER_ADMIN,
        },
      });

      // Menhely — NEM hitelesített, super admin jóváhagyásra vár; aktív, hogy a dashboard használható legyen
      const shelter = await tx.shelter.create({
        data: {
          name:        d.shelterName,
          slug,
          city:        d.city,
          address:     d.address,
          zipCode:     d.zipCode || null,
          phone:       d.phone || null,
          email:       d.shelterEmail || null,
          description: d.description || null,
          country:     "HU",
          isActive:    true,
          isVerified:  false,
          lat:         coords?.lat ?? null,
          lng:         coords?.lng ?? null,
        },
      });

      await tx.shelterAdmin.create({
        data: { userId: adminUser.id, shelterId: shelter.id },
      });

      return { adminUser, shelter };
    });

    // Fix havi csomagok + állandó „Általános támogatás" gyűjtés.
    // A tranzakción kívül fut: ha elakadna, a menhely regisztrációja akkor is
    // sikerüljön – a visszatöltő végpont bármikor pótolja.
    ensureShelterDefaults(shelter.id).catch((err) =>
      console.error("[shelter register] ensureShelterDefaults:", err)
    );

    // Email-megerősítő token + email (nem blokkoló)
    issueVerificationToken(d.email, d.adminName).catch((err) => {
      console.error("[shelter register] verification email error:", err);
    });

    // Super adminok értesítése a jóváhagyásra váró menhelyről (in-app)
    prisma.user
      .findMany({ where: { role: Role.SUPER_ADMIN }, select: { id: true } })
      .then((supers) =>
        createNotifications(
          supers.map((s) => ({
            userId: s.id,
            type:   "SHELTER_REGISTRATION_PENDING" as const,
            title:  "Új menhely regisztrált",
            body:   `${d.shelterName} (${d.city}) – jóváhagyásra vár`,
            href:   "/dashboard/shelters",
          }))
        )
      )
      .catch((err) => console.error("[shelter register] super-admin notification error:", err));

    return NextResponse.json(
      { shelter: { id: shelter.id, slug: shelter.slug }, verificationRequired: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/auth/register-shelter]", error);
    return NextResponse.json({ error: "Szerver hiba." }, { status: 500 });
  }
}

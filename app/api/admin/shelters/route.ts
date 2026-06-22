import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { sendShelterAdminInviteEmail } from "@/lib/email";

const schema = z.object({
  // Menhely adatok
  shelterName:  z.string().min(2),
  city:         z.string().min(1),
  address:      z.string().min(2),
  zipCode:      z.string().optional(),
  phone:        z.string().optional(),
  shelterEmail: z.string().email().optional().or(z.literal("")),
  description:  z.string().optional(),
  // Admin fiók
  adminName:    z.string().min(2),
  adminEmail:   z.string().email(),
  adminPassword: z.string().min(6),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen adatok", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  try {
    // Ellenőrzés: admin email foglalt-e?
    const existing = await prisma.user.findUnique({
      where: { email: d.adminEmail },
      include: { shelterAdmins: true },
    });

    if (existing) {
      // Ha van aktív menhely-kapcsolata, nem engedjük
      if (existing.shelterAdmins.length > 0) {
        return NextResponse.json({ error: "Ez az admin email cím már foglalt." }, { status: 409 });
      }
      // Ha SUPER_ADMIN, nem írhatjuk felül
      if (existing.role === "SUPER_ADMIN") {
        return NextResponse.json({ error: "Ez az admin email cím már foglalt." }, { status: 409 });
      }
      // Szabad felhasználó – frissítjük és hozzárendeljük az új menhelyhez
    }

    // Egyedi slug generálás
    let slug = slugify(d.shelterName);
    const count = await prisma.shelter.count({ where: { slug: { startsWith: slug } } });
    if (count > 0) slug = `${slug}-${count + 1}`;

    // Tranzakcióban hozzuk létre a menhelyt és az admin usert
    const result = await prisma.$transaction(async (tx) => {
      const hashed = await hash(d.adminPassword, 10);

      const adminUser = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              name:          d.adminName,
              password:      hashed,
              role:          Role.SHELTER_ADMIN,
              emailVerified: new Date(),
            },
          })
        : await tx.user.create({
            data: {
              name:          d.adminName,
              email:         d.adminEmail,
              password:      hashed,
              role:          Role.SHELTER_ADMIN,
              emailVerified: new Date(),
            },
          });

      const shelter = await tx.shelter.create({
        data: {
          name:        d.shelterName,
          slug,
          city:        d.city,
          address:     d.address,
          zipCode:     d.zipCode ?? null,
          phone:       d.phone || null,
          email:       d.shelterEmail || null,
          description: d.description || null,
          country:     "HU",
          isActive:    true,
          isVerified:  true,
        },
      });

      await tx.shelterAdmin.create({
        data: { userId: adminUser.id, shelterId: shelter.id },
      });

      return { shelter, adminUser };
    });

    // Send invite email (fire-and-forget — don't block response)
    sendShelterAdminInviteEmail({
      to:          result.adminUser.email,
      adminName:   d.adminName,
      shelterName: d.shelterName,
      password:    d.adminPassword,
    }).catch((err) => console.error("[shelter invite email]", err));

    return NextResponse.json({
      shelter: { id: result.shelter.id, name: result.shelter.name, slug: result.shelter.slug },
      admin:   { id: result.adminUser.id, email: result.adminUser.email },
    }, { status: 201 });
  } catch (error) {
    console.error('[api/admin/shelters POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Tiltott hozzáférés" }, { status: 403 });
  }

  try {
    const shelters = await prisma.shelter.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        admins: { include: { user: { select: { name: true, email: true } } } },
        _count:  { select: { animals: true } },
      },
    });

    return NextResponse.json(shelters);
  } catch (error) {
    console.error('[api/admin/shelters GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

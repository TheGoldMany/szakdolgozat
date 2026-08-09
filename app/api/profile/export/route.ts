import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/profile/export – GDPR Art. 20 data portability
export async function GET(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where:  { id: authUser.id },
    select: {
      id:                 true,
      name:               true,
      email:              true,
      phone:              true,
      address:            true,
      city:               true,
      role:               true,
      birthDate:          true,
      emailNotifications: true,
      createdAt:          true,
      applications: {
        orderBy: { createdAt: "desc" },
        select: {
          id:        true,
          status:    true,
          createdAt: true,
          animal:    { select: { name: true, slug: true } },
        },
      },
      donations: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          amount:      true,
          isAnonymous: true,
          paidAt:      true,
          createdAt:   true,
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          status:      true,
          createdAt:   true,
          cancelledAt: true,
          tier:        { select: { name: true, amount: true, shelter: { select: { name: true } } } },
        },
      },
      sponsorships: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          amount:      true,
          status:      true,
          isPublic:    true,
          displayName: true,
          createdAt:   true,
          cancelledAt: true,
          animal:      { select: { name: true, slug: true } },
        },
      },
      reports: {
        orderBy: { createdAt: "desc" },
        select: {
          id:          true,
          type:        true,
          status:      true,
          name:        true,
          animalType:  true,
          breed:       true,
          city:        true,
          description: true,
          createdAt:   true,
        },
      },
      reviewsWritten: {
        orderBy: { createdAt: "desc" },
        select: {
          id:        true,
          rating:    true,
          comment:   true,
          createdAt: true,
          shelter:   { select: { name: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Felhasználó nem található" }, { status: 404 });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: {
      id:                 user.id,
      name:               user.name,
      email:              user.email,
      phone:              user.phone,
      address:            user.address,
      city:               user.city,
      role:               user.role,
      birthDate:          user.birthDate,
      emailNotifications: user.emailNotifications,
      memberSince:        user.createdAt,
    },
    adoptionApplications: user.applications,
    donations:            user.donations,
    subscriptions:        user.subscriptions,
    sponsorships:         user.sponsorships,
    animalReports:        user.reports,
    reviews:              user.reviewsWritten,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type":        "application/json",
      "Content-Disposition": `attachment; filename="allatimenhelyek-adataim-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

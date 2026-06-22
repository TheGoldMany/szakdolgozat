import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// One-time production reset endpoint.
// DELETE this file immediately after use.
const ONE_TIME_TOKEN = "109ebbf771fa0e7b3c42bf60c94812776f3d2900c84a3a45";
const ADMIN_EMAIL    = "terrarisztika1@gmail.com";
const ADMIN_NAME     = "Admin";
const ADMIN_PASSWORD = "HE4N%dXMu6vDH7b&";

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE
        "FeedingLog",
        "FeedingSchedule",
        "AnimalTransfer",
        "EventRegistration",
        "Event",
        "FosterSupplyLog",
        "FosterProfile",
        "InventoryTransaction",
        "InventoryItem",
        "Notification",
        "VolunteerAttendance",
        "VolunteerTaskAssignment",
        "VolunteerTask",
        "Volunteer",
        "Appointment",
        "HealthRecord",
        "Review",
        "FormFieldResponse",
        "FormField",
        "ApplicationForm",
        "Donation",
        "Campaign",
        "Subscription",
        "DonationTier",
        "Message",
        "Conversation",
        "ReportMatch",
        "ReportImage",
        "AnimalReport",
        "Favorite",
        "AdoptionFollowUp",
        "AdoptionApplication",
        "AnimalImage",
        "AnimalDocument",
        "BehaviorLog",
        "Kennel",
        "Sponsorship",
        "Animal",
        "ShelterDocument",
        "ShelterAdmin",
        "Shelter",
        "VerificationToken",
        "Session",
        "Account",
        "PasswordResetToken",
        "User"
      RESTART IDENTITY CASCADE
    `);

    const passwordHash = await hash(ADMIN_PASSWORD, 12);

    const admin = await prisma.user.create({
      data: {
        email:              ADMIN_EMAIL,
        name:               ADMIN_NAME,
        password:           passwordHash,
        role:               "SUPER_ADMIN",
        emailVerified:      new Date(),
        emailNotifications: true,
      },
    });

    return NextResponse.json({
      ok:       true,
      message:  "Production reset complete. DELETE this endpoint now.",
      adminId:  admin.id,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

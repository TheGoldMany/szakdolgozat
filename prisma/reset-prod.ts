/**
 * Production reset script.
 * Deletes ALL data, then creates a single SUPER_ADMIN account.
 * Run ONLY against production when you explicitly want a clean slate.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/reset-prod.ts
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// Load DATABASE_URL from .env / .env.local when running via ts-node
for (const envFile of [".env", ".env.local", ".env.production.local"]) {
  const fp = resolve(process.cwd(), envFile);
  if (!existsSync(fp)) continue;
  readFileSync(fp, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=][^=]*)=(.+)$/);
    if (!m) return;
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  });
}

const prisma = new PrismaClient();

const ADMIN_EMAIL    = "terrarisztika1@gmail.com";
const ADMIN_NAME     = "Admin";
const ADMIN_PASSWORD = "HE4N%dXMu6vDH7b&";

async function main() {
  console.log("⚠️  Production reset started — deleting all data...");

  // Truncate all user-generated tables at once; CASCADE handles FK order.
  // We keep the schema itself (no DROP TABLE).
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

  console.log("✓ All tables cleared.");

  // Create admin account
  const passwordHash = await hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email:         ADMIN_EMAIL,
      name:          ADMIN_NAME,
      password:      passwordHash,
      role:          "SUPER_ADMIN",
      emailVerified: new Date(),
      emailNotifications: true,
    },
  });

  console.log(`✓ Admin created: ${admin.email} (id: ${admin.id})`);
  console.log("");
  console.log("╔══════════════════════════════════════╗");
  console.log("║  Production admin credentials        ║");
  console.log(`║  Email:    ${ADMIN_EMAIL.padEnd(26)}║`);
  console.log(`║  Password: ${ADMIN_PASSWORD.padEnd(26)}║`);
  console.log("╚══════════════════════════════════════╝");
  console.log("");
  console.log("⚠️  Save this password — it will not be shown again.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

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

/**
 * A belépési adatok KÖRNYEZETI VÁLTOZÓBÓL jönnek, nem a forrásból.
 *
 * Korábban itt nyílt szövegben állt az éles SUPER_ADMIN jelszó — egy publikus
 * repóban. Ezért a jelszónak nincs alapértéke: hiányában a script nem fut le.
 * Egy „kényelmes" alapérték pontosan ugyanazt a hibát hozná vissza.
 *
 *   RESET_ADMIN_EMAIL=… RESET_ADMIN_PASSWORD=… CONFIRM_RESET=TÖRLÉS npm run db:reset-prod
 */
const ADMIN_EMAIL    = process.env.RESET_ADMIN_EMAIL?.trim() ?? "";
const ADMIN_NAME     = "Admin";
const ADMIN_PASSWORD = process.env.RESET_ADMIN_PASSWORD ?? "";

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("RESET_ADMIN_EMAIL és RESET_ADMIN_PASSWORD kötelező.");
  }
  if (ADMIN_PASSWORD.length < 14) {
    throw new Error("A RESET_ADMIN_PASSWORD legalább 14 karakter legyen.");
  }
  // A teljes adatbázist törli. Egy elgépelt npm-parancs nem lehet elég hozzá:
  // szándékos, kimondott megerősítés kell.
  if (process.env.CONFIRM_RESET !== "TÖRLÉS") {
    throw new Error("Megerősítés hiányzik: CONFIRM_RESET=TÖRLÉS");
  }

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
  console.log("║  Password: (a RESET_ADMIN_PASSWORD)  ║");
  console.log("╚══════════════════════════════════════╝");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

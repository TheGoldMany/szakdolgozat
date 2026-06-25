import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { haversineKm } from "@/lib/geo";
import { ANIMAL_TYPE_LABELS } from "@/lib/foster";
import { sendNearbyReportEmail } from "@/lib/email";

/** Sugár (km), amelyen belül egy kóbor bejelentésről a menhelyeket értesítjük. */
const NEARBY_RADIUS_KM = 20;

interface CreateNotificationInput {
  userId: string;
  type:   NotificationType;
  title:  string;
  body?:  string;
  href?:  string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return;
  return prisma.notification.createMany({ data: inputs });
}

/**
 * Értesíti egy állat összes aktív virtuális gazdiját (szponzorát).
 * Pl. egészségügyi napló frissült, új fotó, vagy gazdira talált.
 */
export async function notifyAnimalSponsors(
  animalId: string,
  title:    string,
  body?:    string,
  href?:    string,
) {
  const sponsors = await prisma.sponsorship.findMany({
    where:  { animalId, status: "ACTIVE" },
    select: { userId: true },
  });
  if (sponsors.length === 0) return;

  // Egy user több szponzorációja esetén is csak egy értesítés; törölt user (null) kihagyva
  const uniqueUserIds = [...new Set(sponsors.map((s) => s.userId))].filter((id): id is string => id !== null);
  return createNotifications(uniqueUserIds.map((userId) => ({
    userId,
    type: "SPONSOR_UPDATE" as NotificationType,
    title,
    body,
    href,
  })));
}

/**
 * Értesíti a bejelentés helyszínéhez közeli (≤20 km) menhelyek adminjait egy
 * új KÓBOR állatbejelentésről – in-app értesítés és email is.
 *
 * Csak STRAY típusú, koordinátával rendelkező bejelentésekre fut.
 * Hibatűrő: soha nem dob hibát a hívó felé.
 */
export async function notifyNearbyShelters(reportId: string): Promise<void> {
  try {
    const report = await prisma.animalReport.findUnique({ where: { id: reportId } });
    if (!report || report.type !== "STRAY" || report.lat == null || report.lng == null) return;

    // Aktív menhelyek koordinátával, az adminjaik elérhetőségeivel együtt.
    const shelters = await prisma.shelter.findMany({
      where:  { isActive: true, lat: { not: null }, lng: { not: null } },
      select: {
        id: true, name: true, lat: true, lng: true,
        admins: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    const base = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";
    const reportUrl = `${base}/reports/${report.id}`;
    const animalLabel = ANIMAL_TYPE_LABELS[report.animalType].toLowerCase();
    const preview = report.description.length > 200
      ? `${report.description.slice(0, 200)}…`
      : report.description;

    // Egy admin több menhelyhez is tartozhat – a legközelebbi találat számít,
    // és userenként csak egy in-app értesítést / emailt küldünk.
    const notifiedUsers = new Set<string>();

    for (const shelter of shelters) {
      const distanceKm = haversineKm(report.lat, report.lng, shelter.lat!, shelter.lng!);
      if (distanceKm > NEARBY_RADIUS_KM) continue;

      const rounded = Math.round(distanceKm);
      for (const { user } of shelter.admins) {
        if (!user || notifiedUsers.has(user.id)) continue;
        notifiedUsers.add(user.id);

        await createNotification({
          userId: user.id,
          type:   "REPORT_NEARBY",
          title:  `Kóbor állat a közeletekben (${rounded} km)`,
          body:   `Új kóbor ${animalLabel} bejelentés érkezett ${report.city} környékén.`,
          href:   `/reports/${report.id}`,
        }).catch((err) => console.error("nearby report notification error:", err));

        if (user.email) {
          await sendNearbyReportEmail({
            to:          user.email,
            adminName:   user.name ?? "Menhely admin",
            animalLabel,
            city:        report.city,
            distanceKm:  rounded,
            description: preview,
            reportUrl,
          }).catch((err) => console.error("nearby report email error:", err));
        }
      }
    }
  } catch (err) {
    console.error("notifyNearbyShelters error:", err);
  }
}

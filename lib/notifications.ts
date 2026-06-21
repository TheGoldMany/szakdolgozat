import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

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

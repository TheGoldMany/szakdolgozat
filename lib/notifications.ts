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

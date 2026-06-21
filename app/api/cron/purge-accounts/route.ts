import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Runs daily – purges accounts that were soft-deleted more than 30 days ago.
// At this point the user's PII was already wiped at request time; this job
// removes the remaining non-financial records (notifications, reports, etc.)
// and the empty user shell itself. Financial records (donations, subscriptions)
// are kept for the legally required 8-year retention period.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usersToDelete = await prisma.user.findMany({
    where: { deletionScheduledAt: { lte: cutoff } },
    select: { id: true },
  });

  if (usersToDelete.length === 0) {
    return NextResponse.json({ purged: 0 });
  }

  const ids = usersToDelete.map((u) => u.id);
  let purged = 0;

  for (const userId of ids) {
    try {
      await prisma.$transaction([
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.animalReport.deleteMany({ where: { userId } }),
        prisma.eventRegistration.deleteMany({ where: { userId } }),
        prisma.volunteer.deleteMany({ where: { userId } }),
        prisma.favorite.deleteMany({ where: { userId } }),
        prisma.review.deleteMany({ where: { OR: [{ authorId: userId }, { targetUserId: userId }] } }),
        // Nullify userId on financial records instead of deleting (8-year retention)
        prisma.donation.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.subscription.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.sponsorship.updateMany({ where: { userId }, data: { userId: null } }),
        prisma.campaign.updateMany({ where: { userId }, data: { userId: null } }),
        // Finally delete the user shell
        prisma.user.delete({ where: { id: userId } }),
      ]);
      purged++;
    } catch (err) {
      console.error(`Failed to purge user ${userId}:`, err);
    }
  }

  return NextResponse.json({ purged });
}

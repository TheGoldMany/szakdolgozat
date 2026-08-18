import { prisma } from "@/lib/prisma";
import type { Donation } from "@prisma/client";
import { sendDonationReceivedEmail, sendDonationThankYouEmail } from "@/lib/email";
import { createNotifications } from "@/lib/notifications";

/**
 * Egy adomány kifizetettre állítása — pontosan egyszer.
 *
 * Két helyről is befuthat ugyanaz a fizetés:
 *   • a Stripe webhookból (`checkout.session.completed`), és
 *   • a siker-oldalról, ha a felhasználó előbb ér vissza, mint a webhook.
 * Ráadásul a Stripe *legalább egyszer* kézbesít: minden nem-2xx válasz után
 * újrapróbálkozik, és duplikátumot sikeres kézbesítés után is küldhet.
 *
 * Ezért a „fizetetlen → fizetett" átmenet egy feltételes `updateMany`, ami
 * csak akkor talál sort, ha a `paidAt` még `null`. Aki megnyeri, az és csak az
 * növeli a gyűjtés összegét. A művelet tranzakcióban fut, így a `paidAt` és a
 * `raisedAmount` nem tud szétcsúszni.
 *
 * @returns `firstFulfilment` = igaz, ha most ez a hívás zárta le a fizetést.
 */
export async function fulfillDonation(
  donationId: string,
  /** A Stripe PaymentIntent azonosítója – enélkül a visszatérítést nem lehetne
   *  visszavezetni erre az adományra. */
  paymentIntentId?: string | null
): Promise<{ donation: Donation | null; firstFulfilment: boolean }> {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.donation.updateMany({
      where: { id: donationId, paidAt: null },
      data:  {
        paidAt: new Date(),
        ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
      },
    });

    const donation = await tx.donation.findUnique({ where: { id: donationId } });

    // Már le volt zárva (webhook-újraküldés vagy a másik útvonal előzött meg).
    if (claimed.count === 0) {
      return { donation, firstFulfilment: false };
    }

    if (donation?.campaignId) {
      await tx.campaign.update({
        where: { id: donation.campaignId },
        data:  { raisedAmount: { increment: donation.amount } },
      });
    }

    return { donation, firstFulfilment: true };
  });
}

/**
 * Értesítések egy beérkezett adományról: a gyűjtés tulajdonosának app-értesítés
 * és e-mail, az adományozónak köszönő levél.
 *
 * Szándékosan külön van a `fulfillDonation`-tól, de mindig utána fut, és csak
 * `firstFulfilment === true` esetén — így a webhook újraküldése nem küld
 * kétszer levelet. Azért közös helper, hogy a siker-oldal ugyanezt csinálja,
 * ha a webhook egyáltalán nem érkezik meg.
 *
 * Sosem dob: az értesítés hibája nem buktathatja el a fizetés lezárását.
 */
export async function notifyDonation(donation: Donation): Promise<void> {
  try {
    if (!donation.campaignId) return;

    const campaign = await prisma.campaign.findUnique({
      where:   { id: donation.campaignId },
      include: {
        shelter: {
          include: { admins: { include: { user: { select: { email: true, name: true } } }, take: 1 } },
        },
        user: { select: { email: true, name: true } },
      },
    });
    if (!campaign) return;

    const BASE_URL       = process.env.NEXT_PUBLIC_APP_URL ?? "https://allatimenhelyek.hu";
    const recipientEmail = campaign.shelter?.admins[0]?.user.email ?? campaign.user?.email;
    const recipientName  = campaign.shelter?.admins[0]?.user.name ?? campaign.user?.name ?? "Admin";

    const donorName = donation.isAnonymous || !donation.userId
      ? null
      : (await prisma.user.findUnique({ where: { id: donation.userId }, select: { name: true } }))?.name ?? null;

    const amountStr = new Intl.NumberFormat("hu-HU", {
      style: "currency", currency: "HUF", maximumFractionDigits: 0,
    }).format(donation.amount);

    // App-értesítés a menhely adminjainak, vagy magánszemély gyűjtőnél neki
    const shelterAdmins = campaign.shelter
      ? await prisma.shelterAdmin.findMany({
          where:  { shelterId: campaign.shelter.id },
          select: { userId: true },
        })
      : [];
    const ownerUserIds = shelterAdmins.length > 0
      ? shelterAdmins.map((a) => a.userId)
      : campaign.userId ? [campaign.userId] : [];

    if (ownerUserIds.length > 0) {
      await createNotifications(ownerUserIds.map((uid) => ({
        userId: uid,
        type:   "DONATION_RECEIVED" as const,
        title:  "Új adomány érkezett",
        body:   `${donorName ?? "Névtelen"} – ${amountStr} (${campaign.title})`,
        href:   "/dashboard",
      })));
    }

    if (recipientEmail) {
      await sendDonationReceivedEmail({
        to:            recipientEmail,
        recipientName,
        campaignTitle: campaign.title,
        amount:        donation.amount,
        donorName,
        campaignUrl:   `${BASE_URL}/donate/${campaign.id}`,
      });
    }

    // Köszönő levél az adományozónak (névtelen és vendég adománynál nem)
    if (donation.userId && !donation.isAnonymous) {
      const donor = await prisma.user.findUnique({
        where:  { id: donation.userId },
        select: { email: true, name: true },
      });
      if (donor?.email) {
        await sendDonationThankYouEmail({
          to:            donor.email,
          name:          donor.name ?? donor.email,
          campaignTitle: campaign.title,
          amount:        donation.amount,
          campaignUrl:   `${BASE_URL}/donate/${campaign.id}`,
        });
      }
    }
  } catch (err) {
    console.error("notifyDonation error:", err);
  }
}

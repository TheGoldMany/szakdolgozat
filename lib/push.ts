import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Push értesítések a mobilapp felé.
 *
 * ALAPELV: a push csak figyelemfelhívás, nem az értesítés maga. A hiteles
 * forrás az adatbázisban létrehozott `Notification` sor — az látszik az
 * értesítéslistában akkor is, ha a push sosem érkezett meg (nincs telepítve az
 * app, elutasította az engedélyt, lejárt a token). Ezért a push HIBÁJA SOHA
 * nem buktathatja el az értesítés létrehozását; a `createNotification` ezt a
 * függvényt try/catch-ben hívja.
 *
 * MIÉRT VÁRJUK MEG (és nem „tűzz és felejtsd"): a Vercel szerver nélküli
 * futtatókörnyezete a válasz elküldése után befagyaszthatja a függvényt, így
 * egy el nem várt ígéret némán elveszne. Inkább vállaljuk a néhány száz
 * ezredmásodpercet — de időkorláttal, hogy egy lassú Expo-válasz ne akassza
 * meg a kérést.
 */

/** Az Expo API hívásának felső határa. Utána feladjuk, az értesítés attól még megvan. */
const SEND_TIMEOUT_MS = 4000;

/**
 * Kategóriák.
 *
 * NEM típusonként kapcsolható: 51 értesítéstípus van, és a felhasználó nem
 * típusokban gondolkodik. Három csoport, amit egy mondatban el lehet mondani.
 */
export type PushCategory = "messages" | "caseUpdates" | "community";

/**
 * Melyik típus melyik kategóriába esik.
 *
 * `Record<NotificationType, …>`, tehát ha valaki új értesítéstípust vesz fel a
 * sémába, ITT FORDÍTÁSI HIBÁT KAP — nem csendben kimarad a pushból, ami a
 * legrosszabb fajta hiba lenne: működőnek látszik, csak épp nem szól.
 */
const CATEGORY: Record<NotificationType, PushCategory> = {
  // ── Üzenetek ──────────────────────────────────────────────────────────
  NEW_MESSAGE: "messages",

  // ── Ügyintézés ────────────────────────────────────────────────────────
  APPOINTMENT_NEW:             "caseUpdates",
  APPOINTMENT_CONFIRMED:       "caseUpdates",
  APPOINTMENT_CANCELLED:       "caseUpdates",
  APPLICATION_SUBMITTED:       "caseUpdates",
  APPLICATION_REVIEWING:       "caseUpdates",
  APPLICATION_APPROVED:        "caseUpdates",
  APPLICATION_REJECTED:        "caseUpdates",
  VOLUNTEER_NEW:               "caseUpdates",
  VOLUNTEER_APPROVED:          "caseUpdates",
  VOLUNTEER_REJECTED:          "caseUpdates",
  TASK_SIGNUP:                 "caseUpdates",
  FOSTER_NEW:                  "caseUpdates",
  FOSTER_APPROVED:             "caseUpdates",
  FOSTER_REJECTED:             "caseUpdates",
  FOSTER_PLACEMENT:            "caseUpdates",
  CAMPAIGN_PENDING:            "caseUpdates",
  CAMPAIGN_APPROVED:           "caseUpdates",
  CAMPAIGN_REJECTED:           "caseUpdates",
  FORM_PENDING_APPROVAL:       "caseUpdates",
  FORM_APPROVED:               "caseUpdates",
  FORM_REJECTED:               "caseUpdates",
  REPORT_RESOLVED:             "caseUpdates",
  REPORT_MATCH_FOUND:          "caseUpdates",
  REPORT_NEARBY:               "caseUpdates",
  DONATION_RECEIVED:           "caseUpdates",
  SUBSCRIPTION_STARTED:        "caseUpdates",
  SUBSCRIPTION_CANCELLED:      "caseUpdates",
  SUBSCRIPTION_PAYMENT_FAILED: "caseUpdates",
  DONATION_REFUNDED:           "caseUpdates",
  PAYMENT_DISPUTE:             "caseUpdates",
  SPONSORSHIP_STARTED:         "caseUpdates",
  EVENT_REGISTRATION:          "caseUpdates",
  EVENT_UPDATED:               "caseUpdates",
  EVENT_CANCELLED:             "caseUpdates",
  FOLLOW_UP_DUE:               "caseUpdates",
  FOLLOW_UP_RECEIVED:          "caseUpdates",
  INVENTORY_LOW_STOCK:         "caseUpdates",
  INVENTORY_EXPIRING_SOON:     "caseUpdates",
  TRANSFER_REQUESTED:          "caseUpdates",
  TRANSFER_APPROVED:           "caseUpdates",
  TRANSFER_REJECTED:           "caseUpdates",
  SHELTER_SUSPENDED:           "caseUpdates",
  SHELTER_REACTIVATED:         "caseUpdates",
  SHELTER_DELETED:             "caseUpdates",
  SHELTER_REGISTRATION_PENDING: "caseUpdates",
  SHELTER_VERIFIED:            "caseUpdates",

  // ── Közösség ──────────────────────────────────────────────────────────
  // A SPONSOR_UPDATE azért ide tartozik és nem az ügyintézéshez: nem a
  // fizetésről szól, hanem arról, hogy történt valami a támogatott állattal.
  SPONSOR_UPDATE:     "community",
  CONNECTION_REQUEST: "community",
  CONNECTION_ACCEPTED: "community",
  DAILY_POST_LIKED:   "community",
};

export function pushCategoryOf(type: NotificationType): PushCategory {
  return CATEGORY[type];
}

export interface PushInput {
  userId: string;
  type:   NotificationType;
  title:  string;
  body?:  string;
  href?:  string;
}

/**
 * Az Expo kliens egyszer jön létre.
 *
 * Az `EXPO_ACCESS_TOKEN` nem kötelező, de ha be van állítva, csak azzal lehet
 * a projekt nevében küldeni — enélkül bárki, aki megszerez egy tokent, tudna
 * a felhasználóinknak írni.
 */
let client: Expo | null = null;
function expo(): Expo {
  if (!client) client = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  return client;
}

/** Időkorlát: az ígéret tovább futhat, de a hívó nem vár rá. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Az érvénytelenné vált tokenek törlése.
 *
 * Ha a felhasználó törölte az appot vagy visszavonta az engedélyt, az Expo
 * `DeviceNotRegistered` hibát ad. Ilyenkor a tokent EL KELL dobni: különben
 * minden további küldésnél újra megpróbálnánk, és a lista sosem tisztulna.
 */
async function dropTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  await prisma.pushToken.deleteMany({ where: { token: { in: tokens } } })
    .catch((err) => console.error("[push] token cleanup error:", err));
}

/**
 * Push küldése a megadott in-app értesítésekhez.
 *
 * Soha nem dob: minden hibát naplóz és nyel. A hívó számára a push
 * mellékhatás, nem a művelet lényege.
 */
export async function sendPush(inputs: PushInput[]): Promise<void> {
  if (inputs.length === 0) return;

  try {
    const userIds = [...new Set(inputs.map((i) => i.userId))];

    // Csak azok érdekesek, akiknek VAN eszközük. A felhasználók túlnyomó
    // többségének nincs — nekik ez az egyetlen (indexelt) lekérdezés a teljes
    // költség, utána azonnal kilépünk.
    const users = await prisma.user.findMany({
      where:  { id: { in: userIds }, pushTokens: { some: {} } },
      select: {
        id: true,
        pushMessages: true, pushCaseUpdates: true, pushCommunity: true,
        pushTokens: { select: { token: true } },
      },
    });
    if (users.length === 0) return;

    const byUser = new Map(users.map((u) => [u.id, u]));

    // Olvasatlan darabszám a jelvényhez (iOS az alkalmazás ikonján mutatja).
    // Egyetlen csoportosított lekérdezés, nem felhasználónként egy.
    const unread = await prisma.notification.groupBy({
      by:    ["userId"],
      where: { userId: { in: users.map((u) => u.id) }, readAt: null },
      _count: { _all: true },
    });
    const unreadByUser = new Map(unread.map((u) => [u.userId, u._count._all]));

    const messages: ExpoPushMessage[] = [];
    const invalid: string[] = [];

    for (const input of inputs) {
      const user = byUser.get(input.userId);
      if (!user) continue;

      const category = CATEGORY[input.type];
      const allowed =
        category === "messages"    ? user.pushMessages    :
        category === "caseUpdates" ? user.pushCaseUpdates :
                                     user.pushCommunity;
      if (!allowed) continue;

      for (const { token } of user.pushTokens) {
        if (!Expo.isExpoPushToken(token)) { invalid.push(token); continue; }
        messages.push({
          to:    token,
          title: input.title,
          body:  input.body,
          sound: "default",
          badge: unreadByUser.get(user.id),
          // A koppintás ezt kapja meg: innen tudja a mobil, melyik
          // képernyőre vigyen (lásd `mobile/lib/notification-link.ts`).
          data:  { href: input.href ?? null, type: input.type },
          // Az Android csatorna az app.json-ban meghatározottal egyezik;
          // enélkül a rendszer alapértelmezett, néma csatornát használna.
          channelId: "default",
        });
      }
    }

    await dropTokens(invalid);
    if (messages.length === 0) return;

    // 100 üzenetenkénti darabolás – ezt az SDK végzi, mert az Expo API
    // ennél többet egy kérésben nem fogad.
    const chunks = expo().chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      const result = await withTimeout(expo().sendPushNotificationsAsync(chunk), SEND_TIMEOUT_MS);
      if (result === null) {
        console.warn("[push] time limit reached, remaining chunks skipped");
        break;
      }
      tickets.push(...result);
    }

    // A jegyek azonnal jelzik a felismerhetetlen címzettet. A KÉZBESÍTÉSI
    // nyugtákat (receipt) az Expo csak ~15 perc múlva adja ki, azokra itt nem
    // várunk — az külön háttérfeladat volna. A leggyakoribb ok, a törölt app,
    // már itt kiderül.
    const expired = tickets.flatMap((ticket, i) =>
      ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
        ? [String(messages[i]?.to ?? "")]
        : []);
    await dropTokens(expired.filter(Boolean));

    for (const ticket of tickets) {
      if (ticket.status === "error" && ticket.details?.error !== "DeviceNotRegistered") {
        console.error("[push] ticket error:", ticket.message, ticket.details);
      }
    }
  } catch (err) {
    // Szándékosan elnyeljük: az in-app értesítés már létrejött, az a lényeg.
    console.error("[push] send error:", err);
  }
}

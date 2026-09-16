import { prisma } from "@/lib/prisma";
import { ConnectionStatus } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

/**
 * Ismerős-kapcsolatok két felhasználó között.
 *
 * A modell szándékosan PÁR-alapú, nem irány-alapú: egy sor tartozik egy
 * emberpárhoz. Ezt a `pairKey` egyedi indexe garantálja, nem az alkalmazás
 * figyelme — különben két egyidejű, egymás felé indított jelölés két versengő
 * sort hozna létre, és onnantól kideríthetetlen lenne, melyik az „igazi".
 */

/**
 * A pár kanonikus kulcsa: a két azonosító rendezve, `kisebb_nagyobb` alakban.
 * Így ugyanazt a kulcsot adja akkor is, ha a két felet felcserélve kapjuk meg.
 */
export function connectionPairKey(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Amit a felület tudni akar egy másik emberről. */
export type ConnectionState =
  | { state: "none" }
  | { state: "connected";       id: string }
  | { state: "outgoing";        id: string }   // én jelöltem, ő még nem válaszolt
  | { state: "incoming";        id: string }   // ő jelölt, nekem kell válaszolnom
  | { state: "declined";        id: string };

/** Hol állunk egy adott emberrel? */
export async function connectionState(meId: string, otherId: string): Promise<ConnectionState> {
  if (meId === otherId) return { state: "none" };

  const row = await prisma.userConnection.findUnique({
    where:  { pairKey: connectionPairKey(meId, otherId) },
    select: { id: true, status: true, requesterId: true },
  });
  if (!row) return { state: "none" };

  if (row.status === "ACCEPTED") return { state: "connected", id: row.id };
  if (row.status === "DECLINED") return { state: "declined",  id: row.id };
  return row.requesterId === meId
    ? { state: "outgoing", id: row.id }
    : { state: "incoming", id: row.id };
}

export type RequestOutcome =
  | { outcome: "requested";        id: string }
  | { outcome: "accepted";         id: string }   // a másik már bejelölt minket
  | { outcome: "already_pending";  id: string }
  | { outcome: "already_connected"; id: string }
  | { outcome: "self" };

/**
 * Bejelölés.
 *
 * Ha a másik fél MÁR bejelölt minket, akkor ez a hívás nem új jelölés, hanem
 * elfogadás — „bejelöltük egymást", tehát innentől ismerősök. Ez a
 * legtermészetesebb értelmezés, és megkímél egy fölösleges kattintástól.
 *
 * A várakozó jelölés elutasítása után újra lehet jelölni: a `DECLINED` sor
 * felülíródik, és az irány is átfordul, ha most a másik fél kezdeményez.
 */
export async function requestConnection(
  meId: string, otherId: string,
  /** Belső: egyidejű jelölés utáni egyszeri újrafutás jelzése. */
  isRetry = false,
): Promise<RequestOutcome> {
  if (meId === otherId) return { outcome: "self" };

  const pairKey = connectionPairKey(meId, otherId);
  const existing = await prisma.userConnection.findUnique({
    where:  { pairKey },
    select: { id: true, status: true, requesterId: true },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return { outcome: "already_connected", id: existing.id };
    }
    if (existing.status === "PENDING") {
      // Én küldtem, még nincs válasz – nincs mit tenni.
      if (existing.requesterId === meId) {
        return { outcome: "already_pending", id: existing.id };
      }
      // Ő küldte, és most én is bejelöltem: ez az elfogadás.
      await acceptConnection(meId, existing.id);
      return { outcome: "accepted", id: existing.id };
    }
    // Korábban elutasított: újraindítjuk, a mostani irányba.
    await prisma.userConnection.update({
      where: { id: existing.id },
      data:  {
        requesterId: meId,
        addresseeId: otherId,
        status:      "PENDING",
        respondedAt: null,
      },
    });
    await notifyRequest(meId, otherId);
    return { outcome: "requested", id: existing.id };
  }

  try {
    const created = await prisma.userConnection.create({
      data: { pairKey, requesterId: meId, addresseeId: otherId, status: "PENDING" },
      select: { id: true },
    });
    await notifyRequest(meId, otherId);
    return { outcome: "requested", id: created.id };
  } catch (err) {
    // A `pairKey` egyedi indexe ütött be: a két fél EGYSZERRE jelölte be
    // egymást, és a másik sora nyert. Ez nem hiba, hanem pontosan az, amiért az
    // index van — a pár most már létezik, tehát a fenti ág le tudja kezelni.
    // Egyetlen újrafutás elég: onnantól a sor biztosan megvan.
    if (isUniqueViolation(err) && !isRetry) {
      return requestConnection(meId, otherId, true);
    }
    throw err;
  }
}

/** Prisma egyedi-kényszer megsértése (P2002). */
function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null
    && (err as { code?: string }).code === "P2002";
}

/**
 * Várakozó jelölés elfogadása.
 *
 * Csak a MEGSZÓLÍTOTT fogadhatja el — a feltétel a `updateMany` where-jében
 * van, nem egy előzetes ellenőrzésben, így két egyidejű hívásból is csak egy
 * nyer, és csak egy értesítés megy ki.
 *
 * @returns igaz, ha most ez a hívás fogadta el.
 */
export async function acceptConnection(meId: string, connectionId: string): Promise<boolean> {
  const claimed = await prisma.userConnection.updateMany({
    where: { id: connectionId, addresseeId: meId, status: "PENDING" },
    data:  { status: "ACCEPTED", respondedAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const row = await prisma.userConnection.findUnique({
    where:  { id: connectionId },
    select: { requesterId: true, addresseeId: true },
  });
  if (row) await notifyAccepted(row.addresseeId, row.requesterId);
  return true;
}

/** Várakozó jelölés elutasítása. Csak a megszólított utasíthatja el. */
export async function declineConnection(meId: string, connectionId: string): Promise<boolean> {
  const claimed = await prisma.userConnection.updateMany({
    where: { id: connectionId, addresseeId: meId, status: "PENDING" },
    data:  { status: "DECLINED", respondedAt: new Date() },
  });
  return claimed.count > 0;
}

/**
 * Kapcsolat megszüntetése vagy saját jelölés visszavonása.
 *
 * Mindkét fél bármikor kiléphet, ezért nem irányhoz kötött. A sort töröljük,
 * nem `DECLINED`-ra állítjuk: az elutasítás más dolog, mint a megszüntetés, és
 * a törlés után újra lehet jelölni anélkül, hogy bárkinek magyarázkodni kellene.
 */
export async function removeConnection(meId: string, connectionId: string): Promise<boolean> {
  const deleted = await prisma.userConnection.deleteMany({
    where: {
      id: connectionId,
      OR: [{ requesterId: meId }, { addresseeId: meId }],
    },
  });
  return deleted.count > 0;
}

/** Elfogadott ismerősök száma. */
export async function connectionCount(userId: string): Promise<number> {
  return prisma.userConnection.count({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });
}

export interface ConnectionPerson {
  connectionId: string;
  id:     string;
  name:   string | null;
  image:  string | null;
  city:   string | null;
}

const PERSON = { id: true, name: true, image: true, city: true } as const;

/**
 * A saját kapcsolatok három listában: elfogadott ismerősök, a nekem érkezett
 * várakozó jelölések, és amiket én küldtem.
 */
export async function listConnections(userId: string): Promise<{
  accepted: ConnectionPerson[];
  incoming: ConnectionPerson[];
  outgoing: ConnectionPerson[];
}> {
  const rows = await prisma.userConnection.findMany({
    where: {
      status: { in: ["ACCEPTED", "PENDING"] },
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: {
      id: true, status: true, requesterId: true, addresseeId: true,
      requester: { select: PERSON },
      addressee: { select: PERSON },
    },
    orderBy: { updatedAt: "desc" },
  });

  const accepted: ConnectionPerson[] = [];
  const incoming: ConnectionPerson[] = [];
  const outgoing: ConnectionPerson[] = [];

  for (const row of rows) {
    const iAmRequester = row.requesterId === userId;
    const other = iAmRequester ? row.addressee : row.requester;
    const person: ConnectionPerson = { connectionId: row.id, ...other };

    if (row.status === "ACCEPTED") accepted.push(person);
    else if (iAmRequester)        outgoing.push(person);
    else                          incoming.push(person);
  }

  return { accepted, incoming, outgoing };
}

// ── Értesítések ────────────────────────────────────────────────────────────
// Sosem dobnak: egy elhasalt értesítés nem buktathatja el magát a jelölést.

async function notifyRequest(fromId: string, toId: string): Promise<void> {
  try {
    const from = await prisma.user.findUnique({
      where: { id: fromId }, select: { name: true },
    });
    await createNotification({
      userId: toId,
      type:   "CONNECTION_REQUEST",
      title:  "Új ismerős-jelölés",
      body:   `${from?.name ?? "Valaki"} bejelölt ismerősként.`,
      href:   "/profile/ismerosok",
    });
  } catch (err) {
    console.error("notifyRequest error:", err);
  }
}

async function notifyAccepted(byId: string, toId: string): Promise<void> {
  try {
    const by = await prisma.user.findUnique({
      where: { id: byId }, select: { name: true },
    });
    await createNotification({
      userId: toId,
      type:   "CONNECTION_ACCEPTED",
      title:  "Elfogadta a jelölésedet",
      body:   `${by?.name ?? "Valaki"} mostantól az ismerősöd.`,
      href:   "/profile/ismerosok",
    });
  } catch (err) {
    console.error("notifyAccepted error:", err);
  }
}

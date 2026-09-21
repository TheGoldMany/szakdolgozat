import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Push értesítések.
 *
 * A kényes pontok, amiket védeni kell:
 *
 * • A PUSH SOHA NEM BUKTATHATJA EL AZ ÉRTESÍTÉST. Az in-app értesítés a hiteles
 *   forrás; ha az Expo hívása elhasal, az értesítés akkor is megvan, és a
 *   hívó nem lát hibát.
 * • MINDEN TÍPUSNAK VAN KATEGÓRIÁJA. 51 értesítéstípus van; ha egy kimaradna,
 *   a hozzá tartozó push némán elmaradna — az a fajta hiba, ami működőnek
 *   látszik.
 * • A KIKAPCSOLT KATEGÓRIA NEM SZÓL, de az értesítés attól még létrejön.
 * • AZ ÉRVÉNYTELEN TOKEN TÖRLŐDIK. Ha nem törölnénk, minden további küldésnél
 *   újrapróbálnánk, és a lista sosem tisztulna.
 */

const db = {
  users: [] as {
    id: string;
    pushMessages: boolean; pushCaseUpdates: boolean; pushCommunity: boolean;
    pushTokens: { token: string }[];
  }[],
  deleted: [] as string[],
};

const prismaMock = {
  user: {
    findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
      db.users.filter((u) => where.id.in.includes(u.id) && u.pushTokens.length > 0),
  },
  notification: {
    groupBy: async () => db.users.map((u) => ({ userId: u.id, _count: { _all: 3 } })),
  },
  pushToken: {
    deleteMany: async ({ where }: { where: { token: { in: string[] } } }) => {
      db.deleted.push(...where.token.in);
      return { count: where.token.in.length };
    },
  },
};

/** Amit az Expo kliens kapott, illetve amit visszaad. */
const sent: { to: string; title: string; badge?: number }[] = [];
let sendResult: (messages: unknown[]) => unknown[] = (messages) =>
  messages.map(() => ({ status: "ok", id: "x" }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("expo-server-sdk", () => {
  class Expo {
    static isExpoPushToken(token: unknown) {
      return typeof token === "string" && token.startsWith("ExponentPushToken[");
    }
    chunkPushNotifications(messages: unknown[]) { return [messages]; }
    async sendPushNotificationsAsync(messages: { to: string; title: string; badge?: number }[]) {
      sent.push(...messages);
      return sendResult(messages);
    }
  }
  return { Expo, default: Expo };
});

const { sendPush, pushCategoryOf } = await import("@/lib/push");

const TOKEN_A = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";
const TOKEN_B = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]";

function user(id: string, prefs: Partial<{ messages: boolean; cases: boolean; community: boolean }> = {}, tokens = [TOKEN_A]) {
  return {
    id,
    pushMessages:    prefs.messages   ?? true,
    pushCaseUpdates: prefs.cases      ?? true,
    pushCommunity:   prefs.community  ?? true,
    pushTokens:      tokens.map((token) => ({ token })),
  };
}

beforeEach(() => {
  db.users = [];
  db.deleted = [];
  sent.length = 0;
  sendResult = (messages) => messages.map(() => ({ status: "ok", id: "x" }));
});

describe("kategóriák", () => {
  it("minden értesítéstípusnak van kategóriája", async () => {
    // Az enum a Prisma kliensből jön, tehát ez a séma tényleges állapotát nézi,
    // nem egy kézzel karbantartott listát.
    const { NotificationType } = await import("@prisma/client");
    for (const type of Object.values(NotificationType)) {
      expect(["messages", "caseUpdates", "community"]).toContain(pushCategoryOf(type));
    }
  });

  it("az üzenet az üzenetek, az időpont az ügyintézés, a kedvelés a közösség kategóriába esik", () => {
    expect(pushCategoryOf("NEW_MESSAGE")).toBe("messages");
    expect(pushCategoryOf("APPOINTMENT_CONFIRMED")).toBe("caseUpdates");
    expect(pushCategoryOf("DAILY_POST_LIKED")).toBe("community");
  });
});

describe("küldés", () => {
  it("elküldi az értesítést annak, akinek van eszköze", async () => {
    db.users = [user("u1")];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet", href: "/messages/1" }]);

    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(TOKEN_A);
    expect(sent[0].title).toBe("Új üzenet");
  });

  it("minden eszközre külön üzenetet küld", async () => {
    db.users = [user("u1", {}, [TOKEN_A, TOKEN_B])];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]);

    expect(sent.map((m) => m.to)).toEqual([TOKEN_A, TOKEN_B]);
  });

  it("a jelvényre az ÖSSZES olvasatlan száma kerül, nem a most küldötteké", async () => {
    db.users = [user("u1")];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]);

    expect(sent[0].badge).toBe(3);
  });

  it("nem küld semmit, ha a felhasználónak nincs eszköze", async () => {
    db.users = [];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]);

    expect(sent).toHaveLength(0);
  });
});

describe("beállítások", () => {
  it("a kikapcsolt kategóriában nem szól", async () => {
    db.users = [user("u1", { community: false })];
    await sendPush([{ userId: "u1", type: "DAILY_POST_LIKED", title: "Kedvelték a képed" }]);

    expect(sent).toHaveLength(0);
  });

  it("a kikapcsolt kategória nem némítja el a többit", async () => {
    db.users = [user("u1", { community: false })];
    await sendPush([
      { userId: "u1", type: "DAILY_POST_LIKED", title: "Kedvelték a képed" },
      { userId: "u1", type: "NEW_MESSAGE",      title: "Új üzenet" },
    ]);

    expect(sent.map((m) => m.title)).toEqual(["Új üzenet"]);
  });
});

describe("tokenek karbantartása", () => {
  it("törli a felismerhetetlen alakú tokent", async () => {
    db.users = [user("u1", {}, ["szemét-token"])];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]);

    expect(db.deleted).toContain("szemét-token");
    expect(sent).toHaveLength(0);
  });

  it("törli azt a tokent, amit az Expo ismeretlen eszközként utasít vissza", async () => {
    db.users = [user("u1")];
    sendResult = () => [{ status: "error", message: "nincs ilyen", details: { error: "DeviceNotRegistered" } }];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]);

    expect(db.deleted).toContain(TOKEN_A);
  });

  it("egyéb hibánál MEGTARTJA a tokent", async () => {
    db.users = [user("u1")];
    sendResult = () => [{ status: "error", message: "üzenetkorlát", details: { error: "MessageRateExceeded" } }];
    await sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]);

    expect(db.deleted).toHaveLength(0);
  });
});

describe("hibatűrés", () => {
  it("nem dob, ha az Expo hívása elhasal", async () => {
    db.users = [user("u1")];
    sendResult = () => { throw new Error("hálózati hiba"); };

    await expect(
      sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]),
    ).resolves.toBeUndefined();
  });

  it("nem dob, ha az adatbázis elhasal", async () => {
    const original = prismaMock.user.findMany;
    prismaMock.user.findMany = async () => { throw new Error("db le van"); };

    await expect(
      sendPush([{ userId: "u1", type: "NEW_MESSAGE", title: "Új üzenet" }]),
    ).resolves.toBeUndefined();

    prismaMock.user.findMany = original;
  });
});

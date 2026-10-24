import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Visszajelzés az oldalról → e-mail az info@ címre.
 *
 * Amit véd: levélküldő nélkül a jelzés ne vesszen el csendben (503, a felület
 * ilyenkor a közvetlen címet ajánlja), a bot ne küldhessen, és a látogató
 * szövege ne kerülhessen HTML-ként a levélbe.
 */

vi.mock("@/lib/api-auth", () => ({ getAuthUser: async () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: async () => null } } }));
vi.mock("@/lib/secrets", () => ({ requireSecret: () => "test-secret" }));

const { POST } = await import("@/app/api/feedback/route");

const sent: { url: string; body: Record<string, unknown> }[] = [];
let ipCounter = 0;

function request(body: unknown) {
  ipCounter++;
  return new NextRequest("http://localhost/api/feedback", {
    method:  "POST",
    body:    JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${ipCounter}` },
  });
}

beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response("{}", { status: 200 });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("POST /api/feedback", () => {
  it("levélküldő nélkül 503-at ad, nem tesz úgy, mintha elküldte volna", async () => {
    const res = await POST(request({ category: "BUG", message: "Nem tölt be a térkép" }));
    expect(res.status).toBe(503);
    expect(sent).toHaveLength(0);
  });

  it("a csapda-mezőt kitöltő botnak sikert mond, de nem küld", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const res = await POST(request({ category: "BUG", message: "spam spam", _hp: "http://x" }));
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  it("az info@ címre küld, válaszcímmel és escape-elt szöveggel", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const res = await POST(request({
      category: "IDEA", message: "Legyen <b>sötét mód</b>", email: "latogato@example.com",
      pageUrl: "https://www.allatimenhelyek.hu/map",
    }));
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.resend.com/emails");
    expect(sent[0].body.to).toEqual(["info@allatimenhelyek.hu"]);
    expect(sent[0].body.reply_to).toBe("latogato@example.com");
    expect(String(sent[0].body.html)).toContain("Legyen &lt;b&gt;sötét mód&lt;/b&gt;");
    expect(String(sent[0].body.html)).toContain("https://www.allatimenhelyek.hu/map");
  });

  it("túl rövid üzenetet elutasít", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const res = await POST(request({ category: "BUG", message: "x" }));
    expect(res.status).toBe(400);
  });
});

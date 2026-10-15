import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * A Stripe-webhook aláírás-ellenőrzése — és ami ennél fontosabb: annak
 * megmondása, hogy MIÉRT bukott.
 *
 * MIÉRT VAN EZ A FÁJL
 *
 * Az aláírás-ellenőrzés legalább ötféle okból bukhat, és a Stripe SDK mind az
 * ötre ugyanazt az egy mondatot adja vissza. A javítás viszont okonként
 * TELJESEN MÁS: rossz titok esetén env változót kell cserélni, Connect
 * endpointnál másodikat kell felvenni, óracsúszásnál a kiszolgálót kell
 * megnézni. Az egy mondatból egyik sem derül ki, tehát a hibakeresés
 * találgatásba fullad.
 *
 * A diagnózis SZÁNDÉKOSAN a HTTP-válasz törzsébe is belekerül, nem csak a
 * naplóba: a Stripe Dashboard az endpoint alatt megőrzi a válaszunkat, a
 * futásnaplót viszont a hosting csomag egy óra után eldobja. A tartós
 * nyomot így az őrzi meg, aki a hibát látja.
 *
 * AMI SOHA NEM KERÜL BELE: maga az aláíró titok, semmilyen részlete, és a
 * platform kulcsának módja. Az `eventLivemode` mezőt a KÜLDŐ küldte — azt már
 * eleve tudja —, ezért annak visszaadása nem árul el semmit, viszont pont ez
 * dönti el a leggyakoribb éles hibát: teszt módú endpoint éles kulcs mellett.
 */

/** Csak a számunkra érdekes env változókat kérjük – így teszthez is átadható
 *  egy pár soros objektum, nem kell a teljes `ProcessEnv`-et kitalálni. */
type EnvLike = Record<string, string | undefined>;

/** A Stripe toleranciája az időbélyegre. Ennél régebbi aláírást elutasít. */
const TOLERANCE_SECONDS = 300;

export type VerifyFailureReason =
  | "no_signature_header"
  | "empty_body"
  | "malformed_signature_header"
  | "no_secret_configured"
  | "timestamp_out_of_tolerance"
  | "signature_mismatch";

/**
 * A beállított aláíró titkok, sorrendben.
 *
 * TÖBB TITOK KELL, nem egy. Három eset, amiben egyetlen érték kevés:
 *   • A Stripe „Events from connected accounts" endpointja KÜLÖN endpoint,
 *     külön titokkal. Egy értékkel annak minden kézbesítése aláírás-hibára fut.
 *   • Titokcserénél (rotáció) van egy átfedő ablak, amikor mindkettő élhet.
 *     A Stripe saját ajánlása erre is a végigpróbálás.
 *   • Külön endpoint teszt és éles módra.
 *
 * A levágás nem kozmetika: a hosting felületére bemásolt értékbe gyakran
 * beszökik egy idézőjel vagy egy újsor, és a titok attól némán rossz lesz.
 * A `lib/stripe.ts` ugyanezt a védelmet már alkalmazza a titkos kulcsra.
 */
export function webhookSecrets(env: EnvLike = process.env): string[] {
  const raw = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET];
  const out: string[] = [];

  for (const value of raw) {
    if (!value) continue;
    // Egy változóban vesszővel vagy sortöréssel több titok is megadható.
    for (const piece of value.split(/[,\s]+/)) {
      const cleaned = stripWrappingQuotes(piece.trim());
      if (cleaned && !out.includes(cleaned)) out.push(cleaned);
    }
  }

  return out;
}

/** Bemásoláskor beszökő idézőjelek levágása az érték két végéről. */
function stripWrappingQuotes(value: string): string {
  return value.replace(/^['"]+/, "").replace(/['"]+$/, "");
}

/** Hány beállított érték volt tisztítás előtt más, mint utána. */
export function secretsNeedingTrim(env: EnvLike = process.env): number {
  const raw = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET];
  let count = 0;
  for (const value of raw) {
    if (!value) continue;
    if (value !== stripWrappingQuotes(value.trim())) count++;
  }
  return count;
}

export interface SignatureHeader {
  /** A `t=` mező másodpercben, vagy null, ha hiányzik/értelmezhetetlen. */
  timestamp: number | null;
  /** Hány `v1=` aláírás van a fejlécben. Nulla = nem Stripe-fejléc. */
  v1Count: number;
}

/**
 * A `Stripe-Signature` fejléc felbontása.
 *
 * Azért kell külön, mert a hiányzó `v1=` (pl. egy proxy átírta a fejlécet, vagy
 * valaki kézzel hívta meg a végpontot) és a nem egyező `v1=` (rossz titok)
 * ugyanabba a hibába fut az SDK-ban, pedig köze sincs egymáshoz.
 */
export function parseSignatureHeader(header: string): SignatureHeader {
  let timestamp: number | null = null;
  let v1Count = 0;

  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key?.trim() === "t" && value) {
      const parsed = Number.parseInt(value.trim(), 10);
      if (Number.isFinite(parsed)) timestamp = parsed;
    }
    if (key?.trim() === "v1" && value) v1Count++;
  }

  return { timestamp, v1Count };
}

export interface UnverifiedPeek {
  type: string | null;
  /** `acct_…`, ha csatolt fiók eseménye. Ez a Connect-endpoint árulkodó jele. */
  account: string | null;
  livemode: boolean | null;
}

/**
 * Belenézés a törzsbe ELLENŐRZÉS NÉLKÜL, kizárólag a hibaüzenethez.
 *
 * Ami innen jön, az HITELESÍTETLEN: bárki küldhetett bármit. Ezért soha nem
 * vezet műveletre, nem kerül adatbázisba, és nem befolyásolja a válasz
 * státuszkódját — csak azt mondja meg az üzemeltetőnek, milyen alakú kézbesítés
 * bukott el. Hitelesítetlen adatból diagnózist írni szabad, dönteni nem.
 */
export function peekUnverified(body: string): UnverifiedPeek {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return {
      type:     typeof parsed.type === "string" ? parsed.type : null,
      account:  typeof parsed.account === "string" ? parsed.account : null,
      livemode: typeof parsed.livemode === "boolean" ? parsed.livemode : null,
    };
  } catch {
    return { type: null, account: null, livemode: null };
  }
}

/** A válaszba és a naplóba kerülő, titkot nem tartalmazó leírás. */
export interface VerifyDiagnosis {
  reason: VerifyFailureReason;
  /** Hány aláíró titok van beállítva. Nulla esetén nincs mit ellenőrizni. */
  secretsTried: number;
  /** Hány beállított értéken kellett idézőjelet/szóközt levágni — ha nem nulla,
   *  valószínűleg elgépelt a bemásolás. */
  secretsNeedingTrim: number;
  /** Hány `v1=` aláírás jött. Nulla = nem a Stripe hívott, vagy átírták. */
  signatureCount: number;
  /** A fejléc időbélyegének eltérése a mi óránktól, másodpercben. */
  clockSkewSeconds: number | null;
  bodyBytes: number;
  /** Hitelesítetlen, tájékoztató mezők a törzsből. */
  eventType: string | null;
  /** Igaz, ha a törzs csatolt fiók eseményének mondja magát → Connect endpoint,
   *  aminek SAJÁT aláíró titka van. */
  connectedAccountEvent: boolean;
  /** A küldő szerinti mód. Ha ez nem egyezik a platform kulcsának módjával,
   *  teszt és éles keveredett — ez a leggyakoribb éles aláírás-hiba. */
  eventLivemode: boolean | null;
}

export type VerifyResult =
  | { ok: true; event: Stripe.Event; secretIndex: number }
  | { ok: false; diagnosis: VerifyDiagnosis };

/** Az aláírás ellenőrzése egyetlen titokkal. Alapértelmezésben a Stripe SDK. */
type Verifier = (body: string, header: string, secret: string) => Stripe.Event;

const defaultVerifier: Verifier = (body, header, secret) =>
  getStripe().webhooks.constructEvent(body, header, secret);

/**
 * Egy beérkezett webhook ellenőrzése az ÖSSZES beállított titokkal.
 *
 * Az első egyező titok nyer. Ha egyik sem egyezik, a válasz nem egy üres
 * „nem sikerült", hanem egy olyan leírás, amiből az üzemeltető tudja, melyik
 * irányba induljon.
 */
export function verifyWebhook(
  body: string,
  signatureHeader: string | null,
  opts: {
    secrets?: string[];
    env?: EnvLike;
    nowSeconds?: number;
    verifier?: Verifier;
  } = {}
): VerifyResult {
  const env      = opts.env ?? process.env;
  const secrets  = opts.secrets ?? webhookSecrets(env);
  const now      = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const verifier = opts.verifier ?? defaultVerifier;

  const header = parseSignatureHeader(signatureHeader ?? "");
  const peek   = peekUnverified(body);

  const base = {
    secretsTried:          secrets.length,
    secretsNeedingTrim:    secretsNeedingTrim(env),
    signatureCount:        header.v1Count,
    clockSkewSeconds:      header.timestamp === null ? null : now - header.timestamp,
    bodyBytes:             Buffer.byteLength(body, "utf8"),
    eventType:             peek.type,
    connectedAccountEvent: peek.account !== null,
    eventLivemode:         peek.livemode,
  };

  const fail = (reason: VerifyFailureReason): VerifyResult => ({
    ok: false,
    diagnosis: { reason, ...base },
  });

  // A sorrend szándékos: a durvább, egyértelmű okokat előbb zárjuk ki, hogy a
  // „nem egyezik az aláírás" tényleg csak a titok kérdése maradjon.
  if (!signatureHeader)                   return fail("no_signature_header");
  if (body.length === 0)                  return fail("empty_body");
  if (header.v1Count === 0 || header.timestamp === null) {
    return fail("malformed_signature_header");
  }
  if (secrets.length === 0)               return fail("no_secret_configured");

  // Az óracsúszást KÜLÖN jelezzük. A Stripe tűréshatára 5 perc; ha a kiszolgáló
  // órája elcsúszott, minden kézbesítés bukik, és ettől a titok cseréje — amire
  // a sima „aláírás-hiba" üzenet csábít — semmit nem javít.
  if (Math.abs(now - header.timestamp) > TOLERANCE_SECONDS) {
    return fail("timestamp_out_of_tolerance");
  }

  for (let i = 0; i < secrets.length; i++) {
    try {
      return { ok: true, event: verifier(body, signatureHeader, secrets[i]), secretIndex: i };
    } catch {
      // Ez a titok nem egyezik – jöhet a következő. A hiba szövege itt nem
      // érdekes: minden titokra ugyanaz, és a végén az összegző diagnózis
      // mondja meg a valódi okot.
    }
  }

  return fail("signature_mismatch");
}

/**
 * Rövid, emberi mondat a diagnózishoz — ez megy a Stripe Dashboard
 * válasz-mezőjébe, hogy a hibát látó ember azonnal tudja, mit tegyen.
 */
export function explainFailure(d: VerifyDiagnosis): string {
  switch (d.reason) {
    case "no_signature_header":
      return "Hiányzik a Stripe-Signature fejléc – ezt a kérést nem a Stripe küldte, vagy egy proxy levágta a fejlécet.";
    case "empty_body":
      return "Üres kérés-törzs: nincs mit ellenőrizni.";
    case "malformed_signature_header":
      return "A Stripe-Signature fejléc nem értelmezhető (nincs benne t= és v1=). Valószínűleg egy köztes réteg átírta.";
    case "no_secret_configured":
      return "Nincs beállítva aláíró titok (STRIPE_WEBHOOK_SECRET).";
    case "timestamp_out_of_tolerance":
      return `A kérés időbélyege ${d.clockSkewSeconds} másodperccel tér el a kiszolgáló órájától (a Stripe tűréshatára ${TOLERANCE_SECONDS}s). Nem a titokkal van baj, hanem az órával vagy egy késleltetett újraküldéssel.`;
    case "signature_mismatch":
      return d.connectedAccountEvent
        ? `Az aláírás egyik beállított titokkal sem egyezik, és ez CSATOLT FIÓK eseménye. A Stripe „Events from connected accounts" endpointjának SAJÁT aláíró titka van – vedd fel STRIPE_CONNECT_WEBHOOK_SECRET néven.`
        : `Az aláírás egyik beállított titokkal (${d.secretsTried} db) sem egyezik. Vesd össze az endpoint „Signing secret" értékét az env változóval, és ellenőrizd, hogy a küldő módja (livemode=${d.eventLivemode}) megegyezik-e a platform kulcsának módjával.`;
  }
}

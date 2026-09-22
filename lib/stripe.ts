import Stripe from "stripe";

// A kliens is használja, ezért külön, függőségmentes fájlban él.
export { MIN_DONATION_HUF } from "@/lib/donation-limits";

/**
 * A bankkivonaton megjelenő megnevezés utótagja.
 *
 * A „nem ismerem fel ezt a tételt" a visszaterhelések első számú oka, és
 * destination charge-nál a visszaterhelés a PLATFORM egyenlegét üti – ezért ez
 * nem kozmetika, hanem kockázatcsökkentés.
 *
 * Miért utótag (`statement_descriptor_suffix`) és nem teljes descriptor? Ha a
 * Stripe-fiókon be van állítva előtag, a teljes `statement_descriptor` átadása
 * hibát dob. Az utótag mindkét esetben működik: előtaggal összefűződik,
 * anélkül a fiók alapértelmezettjéhez adódik.
 *
 * FONTOS: a fiókszintű előtagot a Stripe Dashboardon kell beállítani
 * (Settings → Business → Public details). Előfizetéseknél a Stripe kizárólag
 * azt használja, mert a `subscription_data` nem fogad descriptort.
 *
 * Stripe korlátok: rövid, ékezet nélküli, a < > \\ ' " * karakterek tiltottak.
 */
export const STATEMENT_SUFFIX = "MENHELY";

/**
 * Bankkivonatra alkalmas szöveg: ékezetek nélkül, csak betű/szám/szóköz,
 * a Stripe hosszkorlátjára vágva.
 */
export function toStatementSuffix(text: string): string {
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
  return clean.length >= 5 ? clean : STATEMENT_SUFFIX;
}

/**
 * A platform díjszázaléka.
 *
 * A definíció a `lib/donation-limits.ts`-ben van, mert a FELÜLET is kiírja, és
 * onnan a Stripe SDK nélkül importálható. Itt csak újraexportáljuk, hogy a
 * szerveroldali hívóknak ne kelljen átírni az importjaikat.
 */
export { PLATFORM_FEE_PERCENT } from "@/lib/donation-limits";
import { PLATFORM_FEE_PERCENT } from "@/lib/donation-limits";

/**
 * Stripe processing fee rates for HUF payments.
 * Used to pass the processing cost through to the payer transparently.
 */
export const STRIPE_PERCENT_FEE      = 1.4;  // % of charge amount
export const STRIPE_FIXED_FEE_HUF    = 25;   // flat HUF per transaction

/**
 * Platform fee for a given amount, in the same whole-currency unit (HUF).
 * Rounded to whole forints so charges stay valid for HUF.
 *
 * The fee is added on top of the donor's intended amount: the donor pays
 * `amount + platformFee(amount)`, the connected account receives the full
 * `amount`, and the platform keeps the fee.
 */
export function platformFee(amount: number): number {
  return Math.round((amount * PLATFORM_FEE_PERCENT) / 100);
}

/**
 * Estimated Stripe processing fee passed through to the payer, in HUF.
 * Applied to the donation/subscription amount (not the grossed-up total)
 * as a transparent approximation.
 */
export function stripeProcessingFee(amount: number): number {
  return Math.round(amount * STRIPE_PERCENT_FEE / 100) + STRIPE_FIXED_FEE_HUF;
}

/**
 * Az előfizetésekre alkalmazott `application_fee_percent`.
 *
 * Egyszeri adománynál fix összeget adunk át (`application_fee_amount`), havi
 * díjnál viszont a Stripe csak százalékot fogad el, és azt a számla TELJES
 * összegére alkalmazza. Ezért a százalékot úgy kell megválasztani, hogy
 *
 *     (platform díj + feldolgozási díj) / (összeg + mindkét díj)
 *
 * legyen — így a menhely pontosan a csomag árát kapja meg. A Stripe két
 * tizedesig fogadja el, innen a pár filléres csúszás (12 hónap alatt ~3 Ft egy
 * 5 000 Ft-os csomagnál).
 *
 * Ugyanezt használja a checkout és a megújítások könyvelése is, hogy a
 * kiszámolt és a ténylegesen levont díj ne tudjon szétcsúszni.
 */
export function subscriptionFeePercent(amount: number): number {
  // Nulla vagy negatív alapösszegnél a fix 25 Ft egyedül maradna a számlálóban,
  // és 100%-ot adna vissza – vagyis a kedvezményezett nem kapna semmit. A
  // minimumok ezt kizárják, de rossz kimenetel egy díjszámolóban.
  if (amount <= 0) return 0;

  const fee    = platformFee(amount);
  const stripe = stripeProcessingFee(amount);
  const total  = amount + fee + stripe;
  if (total <= 0 || fee + stripe <= 0) return 0;
  return Math.round(((fee + stripe) / total) * 10000) / 100;
}

/** A `subscriptionFeePercent` szerinti platform-rész egy adott számlaösszegből. */
export function subscriptionPlatformFee(totalPaid: number, feePercent: number): number {
  return Math.round((totalPaid * feePercent) / 100);
}

// Lazy singleton – only instantiated on first use, never at build time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const raw = process.env.STRIPE_SECRET_KEY;
    if (!raw) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    // Defensive: strip surrounding quotes and whitespace that can sneak in
    // when pasting the value into a hosting provider's env var UI. A literal
    // leading/trailing quote or newline makes Stripe reject the key as invalid.
    const key = raw.trim().replace(/^['"]+|['"]+$/g, "");
    _stripe = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Resolve a usable Connect transfer destination.
 *
 * A shelter may have `stripeOnboardingComplete = true` in our DB while its
 * stored `acct_…` id no longer exists in Stripe (e.g. seed/test data, or an
 * account created in a different Stripe account). Passing such an id to
 * `transfer_data.destination` makes Stripe throw "No such destination".
 *
 * This verifies the account actually exists and can accept charges. If not,
 * it returns null so the caller charges the platform account directly instead
 * of crashing the checkout.
 */
export async function resolveTransferDestination(
  accountId: string | null | undefined
): Promise<string | null> {
  if (!accountId) {
    console.log("[stripe] resolveTransferDestination: no accountId");
    return null;
  }
  try {
    const account = await getStripe().accounts.retrieve(accountId);
    console.log(`[stripe] resolveTransferDestination: ${accountId} → charges_enabled=${account.charges_enabled} details_submitted=${account.details_submitted}`);
    // For destination charges the platform creates the charge and Stripe
    // automatically transfers funds. details_submitted is the real gate;
    // charges_enabled only blocks *direct* charges on the connected account.
    if (!account.details_submitted) {
      console.log(`[stripe] resolveTransferDestination: rejected – details not submitted`);
      return null;
    }
    return accountId;
  } catch (err) {
    console.log(`[stripe] resolveTransferDestination: error retrieving ${accountId}:`, err);
    return null;
  }
}

/**
 * Elérhető-e egyáltalán ez a csatolt fiók a mostani Stripe-kulccsal?
 *
 * A Stripe TESZT és ÉLES módja két teljesen külön világ: egy teszt módban
 * létrehozott `acct_…` az éles kulccsal NEM létezik, és fordítva. Ha a
 * platform kulcsot váltott, a korábban elmentett azonosító ott marad az
 * adatbázisban, és onnantól minden rá irányuló hívás elhasal ezzel:
 *
 *   "The provided key 'sk_live_…' does not have access to account 'acct_…'
 *    (or that account does not exist). Application access may have been revoked."
 *
 * Ugyanezt a hibát adja, ha a fiók másik platformhoz tartozik, vagy ha a
 * menhely visszavonta a hozzáférést a Stripe-nál. Mindhárom eset ugyanazt
 * jelenti nekünk: az azonosító használhatatlan, újra kell kapcsolódni.
 *
 * MIÉRT SZŰK EZ A FELTÉTEL: korábban a kapcsolódási útvonal minden
 * `StripeInvalidRequestError`-t elavult fióknak vett, és ilyenkor ÚJ Stripe
 * fiókot hozott létre a menhelynek. Egy rossz `return_url` vagy bármilyen más
 * érvénytelen paraméter így elárvította volna a menhely valódi, működő
 * fiókját — az adatvesztést csak az mentette meg, hogy eddig nem fordult elő.
 * Ezért itt kifejezetten a HOZZÁFÉRÉSRE utaló jelzéseket keressük.
 */
export function isStaleAccountError(err: unknown): boolean {
  const e = err as { type?: string; code?: string; message?: string; statusCode?: number } | null;
  if (!e || typeof e !== "object") return false;

  // A Stripe saját hibakódjai erre az esetre.
  if (e.code === "account_invalid" || e.code === "resource_missing") return true;
  if (e.type === "StripePermissionError") return true;

  // Kódot nem mindig kapunk, a szöveget viszont igen. Kisbetűsítve, hogy a
  // Stripe szövegváltoztatása ne törje el azonnal.
  const msg = (e.message ?? "").toLowerCase();
  return (
    msg.includes("does not have access to account") ||
    msg.includes("not connected to your platform") ||
    msg.includes("no such account") ||
    msg.includes("no such destination")
  );
}

/**
 * Egy csatolt fiók állapota, ahogy a FELÜLETNEK tudnia kell.
 *
 * Miért nem elég a tárolt `stripeOnboardingComplete` mező: az egy pillanatkép
 * abból az időből, amikor a menhely végigment a Stripe folyamatán. Ha a fiók
 * azóta elérhetetlenné vált (kulcsváltás, visszavont hozzáférés), a mező
 * továbbra is `true`, és a beállítások oldal zöld pipával azt írja, hogy „az
 * adományok automatikusan érkeznek a számlára" — miközben a fizetési útvonal
 * már elutasítja őket. A felhasználó a valótlan állítás miatt nem is tudja,
 * hogy tennie kellene valamit.
 */
export type ConnectedAccountState =
  /** Nincs elmentett azonosító – még nem kapcsolódott. */
  | "missing"
  /** Van azonosító, de ezzel a kulccsal elérhetetlen → újrakapcsolódás kell. */
  | "inaccessible"
  /** Elérhető, de a Stripe folyamatot nem fejezte be. */
  | "incomplete"
  /** Elérhető és fogadhat utalást. */
  | "ready"
  /** A Stripe most nem válaszolt – NEM tudjuk. Ilyenkor ne riasszunk. */
  | "unknown";

export async function connectedAccountState(
  accountId: string | null | undefined,
): Promise<ConnectedAccountState> {
  if (!accountId) return "missing";

  try {
    const account = await getStripe().accounts.retrieve(accountId);
    // `details_submitted` a valódi kapu: destination charge-nál a platform
    // terheli a kártyát, a `charges_enabled` csak a közvetlen terhelést gátolja.
    return account.details_submitted ? "ready" : "incomplete";
  } catch (err) {
    if (isStaleAccountError(err)) return "inaccessible";
    // Hálózati hiba, lejárt kulcs, Stripe-kimaradás: ezekből NEM következik,
    // hogy a menhely fiókja rossz. Inkább ne mondjunk semmit, mint valótlant.
    console.error("[stripe] connectedAccountState: nem sikerült ellenőrizni", accountId, err);
    return "unknown";
  }
}

/**
 * A Stripe hibájának BIZTONSÁGOS összefoglalója.
 *
 * A `message` szándékosan NINCS benne: hozzáférési hibáknál a Stripe beleírja
 * a platform titkos kulcsának a végét és a belső `acct_` azonosítót, amit a
 * menhely adminjának nem szabad látnia.
 *
 * A `type`, a `code` és a `param` viszont NEM titok — ezek gépi azonosítók a
 * Stripe dokumentációjából. Éppen ezek hiánya miatt nem lehetett kideríteni,
 * miért hasalt el az újrakapcsolódás: a felület csak annyit mondott, hogy „nem
 * sikerült". Egy általános üzenet, ami elfedi az okot, nem jobb a nyers
 * hibánál — csak máshogy használhatatlan.
 */
export interface SafeStripeError {
  type?:  string;
  code?:  string;
  param?: string;
}

export function stripeErrorInfo(err: unknown): SafeStripeError {
  const e = err as { type?: unknown; code?: unknown; param?: unknown } | null;
  if (!e || typeof e !== "object") return {};
  const pick = (v: unknown) => (typeof v === "string" ? v : undefined);
  return { type: pick(e.type), code: pick(e.code), param: pick(e.param) };
}

/**
 * A platform saját Connect-beállítása hiányos?
 *
 * Éles módban a Stripe addig NEM enged csatolt fiókot létrehozni, amíg a
 * platform ki nem tölti a Connect platform-profilját. Ez a leggyakoribb ok,
 * amiért egy addig működő fejlesztés az éles kulcsra váltás után elhasal — és
 * a menhely adminja nem tud vele mit kezdeni, mert ez a PLATFORM beállítása.
 */
export function isPlatformSetupError(err: unknown): boolean {
  const { code } = stripeErrorInfo(err);
  if (code === "account_country_invalid_address" || code === "platform_account_required") return true;
  const msg = ((err as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    msg.includes("platform profile") ||
    msg.includes("complete your platform") ||
    msg.includes("connect onboarding") ||
    msg.includes("signed up for connect") ||
    msg.includes("only stripe accounts with connect enabled")
  );
}

/**
 * Új csatolt (Connect) fiók létrehozása.
 *
 * MIÉRT NEM `type: "express"`: a Stripe 2026 tavaszán elzárta ezt az utat az
 * olyan platformok elől, ahol a platform a veszteségek viselője. Élesben
 * pontosan ezt a hibát adta, amikor a menhely az „Újrakapcsolódás" gombot
 * nyomta (`req_Jlf1n0iifqz6mV`):
 *
 *   "You tried to create an Accounts v1 connected account using the legacy
 *    `type` field with your platform as the losses collector. Use Accounts v2,
 *    remove `type`, and set `losses_collector` to `stripe`."
 *
 * A `controller` a `type` mai megfelelője, és mezőnként mondja meg ugyanazt,
 * amit az „express" egyben jelentett. A `type`-ot NEM szabad mellé tenni.
 *
 * ELSŐRE ROSSZUL OLVASTAM az idézett hibát. A „set `losses_collector` to
 * `stripe`" mondat az ACCOUNTS V2 útra vonatkozik, nem erre; a `controller`-es
 * v1 úton a Stripe ennek az ellenkezőjét követeli, és második nekifutásra ezt
 * mondta (`req_fFcj2h5TohLpW1`):
 *
 *   "With a dashboard type of `express`, the Connect application must control
 *    losses."
 *
 * A két üzenet együtt olvasva: az ELSŐ a legacy `type` mezőt kifogásolta, nem a
 * veszteségviselést. Express felülethez a veszteséget a platformnak kell
 * viselnie — ez amúgy is a projekt eddigi működése.
 *
 * Amit a három mező jelent (a telepített SDK típusai szerint ellenőrizve):
 *
 * • `losses.payments: "application"` — a negatív egyenleget a platform viseli.
 *   Ezt KÖVETELI a Stripe az Express felület mellé, és ez a MEGLÉVŐ helyzet is:
 *   destination charge-nál a visszaterhelés eddig is a platform egyenlegét
 *   ütötte (lásd a `STATEMENT_SUFFIX` magyarázatát).
 * • `fees.payer: "application"` — a Stripe díjait a platform fizeti. Ez is a
 *   MEGLÉVŐ viselkedés: a fizetési útvonal `application_fee_amount`-ja a
 *   platform díját ÉS a feldolgozási díjat is tartalmazza, hogy a menhelyhez a
 *   teljes felajánlott összeg érkezzen.
 * • `stripe_dashboard.type: "express"` — a menhely az Express felületet kapja,
 *   ugyanazt, mint eddig. Ez azért fontos, mert a „Stripe fiók kezelése" gomb
 *   `createLoginLink`-je CSAK Express felülettel működik; `"none"` esetén az a
 *   gomb értelmét vesztené.
 *
 * A `requirement_collection` alapértéke `stripe`, vagyis a Stripe kéri be az
 * adatokat a saját folyamatában — ez is az eddigi Express-viselkedés, ezért
 * nincs kiírva.
 *
 * EGY HELYEN van, mert négy hívási helye volt (menhely és felhasználó, mindkettő
 * első kapcsolódás és újrakapcsolódás). Négy másolatból a következő API-váltás
 * legalább egyet itt felejtett volna.
 */
export function createConnectedAccount(country = "HU") {
  return getStripe().accounts.create({
    country,
    controller: {
      losses:           { payments: "application" },
      fees:             { payer: "application" },
      stripe_dashboard: { type: "express" },
    },
  });
}

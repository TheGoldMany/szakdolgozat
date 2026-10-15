import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/lib/payments-enabled";

/**
 * Fizetési végpont kapuja. Kikapcsolt állapotban `null` helyett választ ad,
 * amit a hívó azonnal visszaad.
 *
 * MIÉRT 404, ÉS NEM 403 VAGY 503
 *
 * A 403 azt üzeni, hogy „létezik, de nem a tiéd", az 503 azt, hogy „most
 * épp nem megy, próbáld újra". Egyik sem igaz: a funkció éles környezetben
 * nem létezik. A 404 ezt mondja, és egyúttal nem árulja el, hogy van egy
 * kikapcsolt fizetési rendszer a felszín alatt.
 *
 * Használat minden fizetési végpont ELSŐ soraként:
 *
 *   const off = paymentsDisabled();
 *   if (off) return off;
 */
export function paymentsDisabled(): NextResponse | null {
  if (paymentsEnabled()) return null;
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

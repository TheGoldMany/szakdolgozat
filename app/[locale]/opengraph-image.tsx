import { ImageResponse } from "next/og";

/**
 * A megosztási kép, amit minden oldal örököl, ha nincs sajátja.
 *
 * MIÉRT GENERÁLT, ÉS NEM FELTÖLTÖTT KÉP
 *
 * Eddig egyáltalán nem volt OG kép: a Messengerre vagy Facebookra bemásolt
 * hivatkozás szürke dobozként jelent meg, cím és kép nélkül. Egy menhely
 * közönsége pont ezeken a felületeken osztja meg az állatokat, tehát ez nem
 * kozmetikai kérdés — a kép nélküli bejegyzésre lényegesen kevesebben
 * kattintanak.
 *
 * Generálva van, nem feltöltve, mert így nem tud elavulni a márkanévvel vagy a
 * színekkel, és nincs mit karbantartani egy bináris fájlban.
 *
 * Az ÁLLAT- és CIKKOLDALAK saját képet adnak meg a metaadatukban (az állat
 * fotóját, illetve a borítóképet); ez a tartalék mindenki másnak.
 */
export const runtime = "edge";
export const alt = "ÁllatiMenhelyek.hu – örökbefogadható állatok magyarországi menhelyekről";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          // Márkaszínek: krém alap, erdőzöld szöveg.
          background: "#fff8ee", color: "#202522",
          fontFamily: "sans-serif", padding: 80, textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
          <span style={{ color: "#202522" }}>ÁLLATI</span>
          <span style={{ color: "#187f3b" }}>MENHELYEK</span>
          <span style={{ color: "#202522" }}>.HU</span>
        </div>

        <div style={{ marginTop: 28, fontSize: 36, lineHeight: 1.3, color: "#202522", opacity: 0.8 }}>
          Találd meg új legjobb barátod
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 16 }}>
          {["Örökbefogadás", "Menhelyek", "Elveszett állatok"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex", fontSize: 26, padding: "12px 28px",
                borderRadius: 999, background: "#b9e6c9", color: "#187f3b",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}

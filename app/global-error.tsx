"use client";

/**
 * Végső hibaoldal, ha maga a gyökér-elrendezés hibázik. Ilyenkor se a
 * fordítások, se a stíluslap nem biztos, hogy betöltött, ezért önálló
 * (beégetett szöveg, beágyazott stílus). Magyarul, angol sorral alatta.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="hu">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#F9FAFB", color: "#111827" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Valami félrement</h1>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6B7280", margin: 0 }}>
              Az oldal betöltése közben hiba történt. Próbáld újra egy kicsit később.
              <br />Something went wrong. Please try again in a moment.
            </p>
            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button type="button" onClick={reset}
                style={{ background: "#187f3b", color: "#fff", border: 0, borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Újrapróbálom
              </button>
              <a href="/" style={{ border: "1px solid #E5E7EB", background: "#fff", color: "#374151", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Főoldal
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

/**
 * Strukturált adat beillesztése az oldalba.
 *
 * A `dangerouslySetInnerHTML` itt nem kockázat: a tartalom kizárólag a saját,
 * gépelt objektumainkból származik (`lib/structured-data.ts`), nem felhasználói
 * HTML-ből. A `JSON.stringify` a karaktereket is elszökteti.
 *
 * A `</script>` sorozatot mégis kezelni kell: ha egy adatbázisból jövő mező
 * (pl. egy menhely leírása) ilyet tartalmazna, a böngésző ott zárná le a
 * szkript-blokkot, és a maradék a lapra kerülne végrehajtható kódként.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

import { describe, it, expect } from "vitest";
import { groupByLocation } from "@/lib/map-groups";

/**
 * Egy ponton több bejelentés → egy jelölő, listával.
 *
 * Csak a ténylegesen egybeeső pontok kerülnek egy csoportba: a település
 * közepére tett bejelentések igen, a „Fő út” címre geokódolt külön marad.
 */
describe("groupByLocation", () => {
  const center = { lat: 47.4167, lng: 19.6667 };
  const foUt   = { lat: 47.4141, lng: 19.6702 };

  it("az azonos ponton lévőket egy csoportba teszi, a más címűt külön", () => {
    const groups = groupByLocation([
      { id: "a", ...center },
      { id: "b", ...center },
      { id: "c", ...foUt },
      { id: "d", ...center },
    ]);
    expect(groups.map((g) => g.map((r) => r.id))).toEqual([["a", "b", "d"], ["c"]]);
  });

  it("a néhány méterre eső pontokat nem vonja össze", () => {
    const groups = groupByLocation([{ id: "a", lat: 47.41670, lng: 19.66670 }, { id: "b", lat: 47.41675, lng: 19.66670 }]);
    expect(groups).toHaveLength(2);
  });
});

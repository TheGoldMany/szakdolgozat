/**
 * Ugyanarra a pontra eső térképes elemek csoportosítása.
 *
 * Ha egy bejelentésnél csak a település ismert, a pötty a település
 * közepére kerül, ugyanoda, mint a többi ilyen bejelentésé. Az egymásra
 * rajzolt jelölők közül csak a legfelső kattintható, a többi elveszik.
 * Ezért az azonos helyűeket egy jelölő alá tesszük, listával.
 *
 * A csoportosítás a koordinátán alapul, nem a településnéven: a
 * „Tápiószentgyörgy” és a „Tápiószentgyörgy, Fő út” két külön pont, így
 * két külön jelölő marad. Öt tizedesjegy kb. egy méter pontosság, vagyis
 * csak a ténylegesen egybeeső pontok kerülnek egy csoportba.
 */
export function groupByLocation<T extends { lat: number; lng: number }>(items: T[], decimals = 5): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.lat.toFixed(decimals)},${item.lng.toFixed(decimals)}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.values()];
}

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { addFavorite, getFavoriteIds, removeFavorite } from "./api";
import { useAuth } from "./auth";

/**
 * Kedvencek megosztott állapota.
 *
 * MIÉRT KONTEXTUS: a szív ikon egyszerre több helyen látszik ugyanarra az
 * állatra (lista, kedvencek képernyő, adatlap). Ha mindegyik külön kérdezné le
 * és külön tárolná, akkor az egyik helyen bejelölt állat a másikon üres
 * szívvel maradna, amíg a képernyő újra be nem töltődik.
 *
 * A teljes azonosítólista egyszer jön le (`/api/favorites` csak azonosítókat
 * ad), utána a jelölés helyben, hálózat nélkül eldönthető.
 */

interface FavoritesCtx {
  /** Az összes kedvenc állat azonosítója. */
  ids:       Set<string>;
  loading:   boolean;
  isFavorite: (animalId: string) => boolean;
  /** Be/ki kapcsolás. Hamis értékkel tér vissza, ha a szerver elutasította. */
  toggle:    (animalId: string) => Promise<boolean>;
  reload:    () => void;
}

const Ctx = createContext<FavoritesCtx | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds]         = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  /** Épp folyamatban lévő váltások – kétszeri koppintás ne küldjön két kérést. */
  const [busy, setBusy]       = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    if (!user) { setIds(new Set()); return; }
    setLoading(true);
    try {
      const { animalIds } = await getFavoriteIds();
      setIds(new Set(animalIds));
    } catch {
      // A kedvencek hiánya nem akadályozza a böngészést: üres jelöléssel
      // megyünk tovább, és a következő betöltés újra megpróbálja.
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Ki-/bejelentkezéskor újra: a kedvencek a felhasználóhoz tartoznak.
  useEffect(() => { reload(); }, [reload]);

  const toggle = useCallback(async (animalId: string): Promise<boolean> => {
    if (!user || busy.has(animalId)) return false;

    const wasFavorite = ids.has(animalId);
    setBusy((prev) => new Set(prev).add(animalId));

    // Optimista: a szív azonnal váltson, különben a koppintás úgy érződik,
    // mintha nem történt volna semmi.
    setIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(animalId); else next.add(animalId);
      return next;
    });

    try {
      if (wasFavorite) await removeFavorite(animalId);
      else             await addFavorite(animalId);
      return true;
    } catch {
      // A szerver a hiteles forrás: sikertelen művelet után visszaállítunk.
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(animalId); else next.delete(animalId);
        return next;
      });
      return false;
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(animalId);
        return next;
      });
    }
  }, [user, ids, busy]);

  const isFavorite = useCallback((animalId: string) => ids.has(animalId), [ids]);

  return (
    <Ctx.Provider value={{ ids, loading, isFavorite, toggle, reload }}>
      {children}
    </Ctx.Provider>
  );
}

/**
 * A szolgáltató hiánya nem hiba: a szív ikon olyan képernyőn is megjelenhet,
 * ahol nincs bejelentkezés. Ilyenkor üres jelölést adunk vissza, és a
 * váltás nem csinál semmit — így a hívónak nem kell külön ágat írnia.
 */
export function useFavorites(): FavoritesCtx {
  return useContext(Ctx) ?? {
    ids:        new Set<string>(),
    loading:    false,
    isFavorite: () => false,
    toggle:     async () => false,
    reload:     () => {},
  };
}

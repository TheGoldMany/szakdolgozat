import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Page } from "./api";

/**
 * Adatlekérés a képernyőkhöz.
 *
 * MIÉRT NINCS BENNE KÖNYVTÁR: a webes oldal sem használ adatlekérő könyvtárat
 * (nincs SWR, React Query, Apollo) — 86 kliens-komponens sima `fetch` +
 * `useState` / `useEffect` / `useCallback` mintával dolgozik. Egy külön
 * könyvtár behozása itt kettéosztaná a projektet: két minta, két hibakezelés,
 * két gyorsítótár-viselkedés. Ez a fájl ugyanazt a mintát csomagolja be, csak
 * egyszer megírva.
 *
 * Amit a képernyőkről levesz, és amit eddig mindenki külön (és hiányosan) írt
 * meg: a hibaág, az elavult válaszok eldobása, és a lemondás lecsatoláskor.
 */

/** Egy lekérés állapota. */
export interface ApiState<T> {
  data:    T | null;
  error:   ApiError | null;
  /** Az ELSŐ betöltés fut. Az újratöltés nem ez — arra a `refreshing` való. */
  loading: boolean;
  reload:  () => void;
}

/** A nem várt hibát is `ApiError`-rá alakítjuk, hogy a felületnek egy alakja legyen. */
function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError("server", null, err instanceof Error ? err.message : "Ismeretlen hiba.");
}

/**
 * Egyszeri lekérés, újratöltéssel.
 *
 * A `deps` ugyanúgy működik, mint a `useEffect`-nél: ha változik, újra lekér.
 * A `fetcher`-t NE inline függvényként add át, mert az minden rendereléskor új
 * — `useCallback`-be csomagolva add, vagy stabil modulszintű függvényként.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [data,    setData]    = useState<T | null>(null);
  const [error,   setError]   = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Melyik lekérés az aktuális?
   *
   * Gyors szűrőváltásnál a korábbi kérés megérkezhet a későbbi UTÁN, és
   * felülírná a frissebb eredményt — a lista ilyenkor nem ahhoz tartozna, ami
   * a szűrőben áll. A sorszám ezt zárja ki.
   */
  const runId  = useRef(0);
  const alive  = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const run = useCallback(async () => {
    const mine = ++runId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (!alive.current || mine !== runId.current) return;
      setData(result);
    } catch (err) {
      if (!alive.current || mine !== runId.current) return;
      setError(toApiError(err));
    } finally {
      if (alive.current && mine === runId.current) setLoading(false);
    }
    // A fetcher a hívó felelőssége: a deps mondja meg, mikor avul el.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, error, loading, reload: run };
}

/** Egy lapozott lista állapota. */
export interface PagedState<T> {
  items:       T[];
  error:       ApiError | null;
  /** Az első betöltés. */
  loading:     boolean;
  /** Húzásra indított frissítés. */
  refreshing:  boolean;
  /** A következő oldal töltése a lista alján. */
  loadingMore: boolean;
  hasMore:     boolean;
  refresh:     () => void;
  loadMore:    () => void;
}

/**
 * Oldalszámos, görgetésre bővülő lista.
 *
 * Három dolgot old meg, amit a képernyőkön eddig külön kellett volna:
 *
 * 1. HIBAÁG. A korábbi listakezelés `try/finally` volt `catch` nélkül: ha a
 *    lekérés elhasalt, a lista üres maradt, és a felhasználó azt hitte, nincs
 *    találat. Az „üres" és a „nem sikerült betölteni" nem ugyanaz.
 *
 * 2. ELAVULT VÁLASZ. Szűrőváltásnál a régi kérés felülírhatta a frissebbet.
 *
 * 3. ISMÉTELT LAPKÉRÉS. A `FlatList` az `onEndReached`-et görgetés közben
 *    többször is kilövi. Egy `loading` jelző erre kevés, mert az csak az első
 *    betöltésre igaz — kell egy külön „épp töltök még egy lapot" állapot.
 */
export function usePagedList<T>(
  fetchPage: (page: number) => Promise<Page<T>>,
  deps: unknown[] = [],
): PagedState<T> {
  const [items,       setItems]       = useState<T[]>([]);
  const [error,       setError]       = useState<ApiError | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);

  const runId = useRef(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const load = useCallback(async (nextPage: number, append: boolean) => {
    const mine = ++runId.current;
    if (append) setLoadingMore(true);
    else if (!append && nextPage === 1) setError(null);

    try {
      const result = await fetchPage(nextPage);
      if (!alive.current || mine !== runId.current) return;

      setItems((prev) => (append ? [...prev, ...result.items] : result.items));
      setTotalPages(result.info.totalPages);
      setPage(nextPage);
      setError(null);
    } catch (err) {
      if (!alive.current || mine !== runId.current) return;
      // Bővítéskor NEM ürítjük a listát: ami már látszik, az érvényes marad,
      // csak a következő lap nem jött meg.
      setError(toApiError(err));
      if (!append) setItems([]);
    } finally {
      if (!alive.current || mine !== runId.current) return;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Szűrőváltásnál elölről: a régi lapok már nem ehhez a szűréshez tartoznak.
  useEffect(() => {
    setLoading(true);
    setItems([]);
    setPage(1);
    setTotalPages(1);
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const hasMore = page < totalPages;

  const refresh = useCallback(() => {
    setRefreshing(true);
    load(1, false);
  }, [load]);

  const loadMore = useCallback(() => {
    // A FlatList görgetés közben többször is kilövi az onEndReached-et.
    if (!hasMore || loading || loadingMore || refreshing) return;
    load(page + 1, true);
  }, [hasMore, loading, loadingMore, refreshing, page, load]);

  return { items, error, loading, refreshing, loadingMore, hasMore, refresh, loadMore };
}

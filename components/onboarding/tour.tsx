"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft, ArrowRight, Check, PawPrint } from "lucide-react";

/**
 * Végigvezető bemutató (tour).
 *
 * Egy motor, ami tetszőleges lépéssorozatot tud lejátszani bármelyik oldalon.
 * A lépések a `lib/tours.ts`-ben vannak, oldalanként — ez a fájl csak azt
 * tudja, HOGYAN kell megmutatni őket, azt nem, hogy MIT.
 *
 * Amit a korábbi, csak vezérlőpultos változathoz képest másképp csinál, és
 * miért:
 *
 * • HIÁNYZÓ CÉLPONT. Régen a kereséskor még nem létező elemnél a kód
 *   továbblépett, de a kiemelés téglalapját NEM ürítette — így a reflektor a
 *   RÉGI elemen maradt, miközben már a következő lépés szövege látszott. Most
 *   előbb újrapróbálkozunk (az elemek gyakran csak később jelennek meg), és ha
 *   tényleg nincs meg, a lépés kimarad, a téglalap pedig kiürül.
 *
 * • KATTINTÁSOK. Régen a kiemelt lépéseknél nem volt valódi takaró elem, csak
 *   egy hatalmas árnyék — így a mögötte lévő oldalra RÁ LEHETETT kattintani,
 *   miközben az ablak `aria-modal`-nak vallotta magát. Most van igazi háttér,
 *   ami el is nyeli a kattintást.
 *
 * • BILLENTYŰZET. A fókusz belép az ablakba, csapdában marad, és bezáráskor
 *   visszatér oda, ahonnan jött. Enélkül a Tab a háttérben lévő oldalra vitte a
 *   fókuszt, ahol a felhasználó nem látta, hol jár.
 *
 * • MOZGÁSÉRZÉKENYSÉG. `prefers-reduced-motion` esetén nincs sima görgetés és
 *   nincs átmenet — a projekt többi része is így viselkedik.
 *
 * • KIS KIJELZŐ. Telefonon a buborék nem lebeg, hanem alulra tapad: a 320 pontos
 *   kártya egy keskeny kijelzőn kiszorult a képernyőről vagy épp a kiemelt
 *   elemet takarta.
 */

export interface TourStep {
  /** A kiemelendő elem CSS-kiválasztója. `null` = középre igazított kártya. */
  selector: string | null;
  title: string;
  body:   string;
}

export interface Tour {
  /** Egyedi azonosító – ezen a néven jegyezzük meg, hogy látta-e. */
  id: string;
  /**
   * Tartalmi verzió. Emeld, ha a bemutató szövege érdemben változik: a korábbi
   * nézők így megkapják az újat.
   */
  version: number;
  /** A fejlécben megjelenő név – az újraindító gomb ezt írja ki. */
  title: string;
  steps: TourStep[];
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD    = 8;    // a reflektor túlnyúlása a kiemelt elemen
const GAP    = 14;   // távolság a reflektor és a buborék között
const CARD_W = 320;
const MOBILE = 640;  // ez alatt alulra tapadó lap, nem lebegő kártya

/** A célpont megjelenésére ennyi ideig várunk, mielőtt kihagyjuk a lépést. */
const TARGET_RETRIES   = 6;
const TARGET_RETRY_MS  = 120;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * A célpont megkeresése — csak ha LÁTSZIK is.
 *
 * A méret ellenőrzése nem szőrszálhasogatás: a fejléc menüje `hidden md:flex`,
 * tehát telefonon ott van a HTML-ben, de nulla méretű. Enélkül a reflektor a
 * bal felső sarokba, egy láthatatlan pontra állt volna rá, és a felhasználó
 * egy üres kiemelést bámult volna. Nulla méret = nincs mit megmutatni, a lépés
 * kimarad.
 */
function visibleTarget(selector: string): HTMLElement | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

/** A fókuszcsapdához: az ablakon belüli, billentyűzettel elérhető elemek. */
const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface Props {
  tour: Tour;
  /** Induljon-e magától. A hívó dönti el (pl. látta-e már). */
  autoStart: boolean;
  /** Lefut, amikor a bemutató véget ér – ide való a „láttam" megjegyzése. */
  onSeen?: () => void;
}

export function Tour({ tour, autoStart, onSeen }: Props) {
  const steps = tour.steps;

  const [mounted, setMounted] = useState(false);
  const [active, setActive]   = useState(false);
  const [index, setIndex]     = useState(0);
  const [rect, setRect]       = useState<Rect | null>(null);
  const [isNarrow, setNarrow] = useState(false);
  /**
   * Megvan-e már, hogy hova mutasson ez a lépés?
   *
   * Amíg a célpontra várunk (az elemek gyakran később jelennek meg), a
   * buborékot NEM rajzoljuk ki. Enélkül a felhasználó fél másodpercre
   * elolvashatott volna egy olyan lépést, amit a rendszer épp kihagyni készül,
   * mert az elem nincs is az oldalon — ez mérve is látszott.
   */
  const [resolved, setResolved] = useState(false);

  const startedRef  = useRef(false);
  const cardRef     = useRef<HTMLDivElement>(null);
  const returnToRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const update = () => setNarrow(window.innerWidth < MOBILE);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const start = useCallback(() => {
    // Ahonnan indítottuk, oda visszük vissza a fókuszt a végén.
    returnToRef.current = document.activeElement as HTMLElement | null;
    setIndex(0);
    setRect(null);
    setActive(true);
  }, []);

  /**
   * Önindítás az első látogatáskor.
   *
   * A „láttam" jelzés már a MEGNYITÁSKOR elmegy, nem a végigjátszáskor: aki
   * félbehagyja és továbblép, azt ne zaklassuk ugyanazzal újra. Újranézni
   * bármikor lehet az újraindító gombbal.
   */
  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    startedRef.current = true;
    // Rövid késleltetés: az oldal elemei ilyenkor már a helyükön vannak, tehát
    // a reflektor nem egy még mozgásban lévő elemre áll rá.
    const t = setTimeout(() => {
      start();
      onSeen?.();
    }, 600);
    return () => clearTimeout(t);
  }, [autoStart, start, onSeen]);

  // Kézi indítás: bárhonnan indítható eseménnyel, saját azonosítóra szűrve.
  useEffect(() => {
    const handler = (e: Event) => {
      const wanted = (e as CustomEvent<{ id?: string }>).detail?.id;
      if (wanted && wanted !== tour.id) return;
      start();
    };
    window.addEventListener("start-tour", handler);
    return () => window.removeEventListener("start-tour", handler);
  }, [start, tour.id]);

  const finish = useCallback(() => {
    setActive(false);
    onSeen?.();
    // A fókusz visszakerül oda, ahonnan a bemutató indult.
    returnToRef.current?.focus?.();
  }, [onSeen]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) { finish(); return i; }
      return i + 1;
    });
  }, [steps.length, finish]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  const step = active ? steps[index] : null;

  /**
   * A kiemelt elem helyének megkeresése.
   *
   * Ha nincs meg, ÚJRAPRÓBÁLKOZUNK — a listák, térképek, késleltetve betöltődő
   * blokkok gyakran csak a bemutató indulása után jelennek meg. Csak a
   * próbálkozások elfogyása után hagyjuk ki a lépést, és olyankor a téglalapot
   * is kiürítjük, hogy a reflektor ne ragadjon az előző elemen.
   */
  useLayoutEffect(() => {
    if (!step) return;

    if (!step.selector) { setRect(null); setResolved(true); return; }

    setResolved(false);
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const smooth = !prefersReducedMotion();

    const attempt = () => {
      if (cancelled) return;
      const el = visibleTarget(step.selector!);

      if (el) {
        el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
        // A görgetés után mérünk: menet közben a téglalap még mozogna.
        timer = setTimeout(() => {
          if (cancelled) return;
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          setResolved(true);
        }, smooth ? 260 : 0);
        return;
      }

      if (tries++ < TARGET_RETRIES) {
        timer = setTimeout(attempt, TARGET_RETRY_MS);
        return;
      }

      // Tényleg nincs ilyen elem ezen az oldalon (pl. szerepkörtől függő blokk).
      setRect(null);
      if (index < steps.length - 1) setIndex((i) => i + 1);
      else finish();
    };

    attempt();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [step, index, steps.length, finish]);

  /** Görgetéskor és átméretezéskor a reflektor kövesse az elemet. */
  useEffect(() => {
    if (!active || !step?.selector) return;
    const onMove = () => {
      const el = visibleTarget(step.selector!);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [active, step]);

  /**
   * Görgetészár a háttéroldalon.
   *
   * Enélkül a lapon való görgetés elcsúsztatja a kiemelt elemet a buborék alól,
   * és a felhasználó azt hiszi, elromlott.
   */
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [active]);

  /** Billentyűzet: Esc zár, nyilak lépnek, a Tab az ablakban marad. */
  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")          { e.preventDefault(); finish(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
      else if (e.key === "Tab") {
        const nodes = cardRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const last  = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, next, prev]);

  /** Megnyitáskor a fókusz az ablakba kerül. */
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      cardRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [active]);

  if (!mounted || !active || !step) return null;

  const hasSpot = !!step.selector && !!rect;
  const isLast  = index === steps.length - 1;
  const isFirst = index === 0;

  // A buborék helye. Kis kijelzőn alulra tapad, ott nincs mit számolni.
  let cardStyle: React.CSSProperties;
  if (isNarrow) {
    cardStyle = { left: 12, right: 12, bottom: 12, width: "auto" };
  } else if (!hasSpot) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const r  = rect!;
    const fitsRight  = r.left + r.width + GAP + CARD_W < vw;
    const fitsBelow  = r.top + r.height + GAP + 200 < vh;

    if (fitsBelow) {
      cardStyle = {
        top:  r.top + r.height + GAP,
        left: Math.max(12, Math.min(r.left, vw - CARD_W - 12)),
      };
    } else if (fitsRight) {
      cardStyle = {
        top:  Math.max(12, Math.min(r.top, vh - 240)),
        left: r.left + r.width + GAP,
      };
    } else {
      // Nem fér se alá, se mellé: fölé tesszük.
      cardStyle = {
        top:  Math.max(12, r.top - GAP - 200),
        left: Math.max(12, Math.min(r.left, vw - CARD_W - 12)),
      };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label={tour.title}>
      {/* Valódi háttér: elnyeli a kattintást, hogy a bemutató alatt ne lehessen
          véletlenül a mögötte lévő oldalt használni. */}
      <div className="absolute inset-0 bg-black/60" onClick={finish} aria-hidden />

      {/* Reflektor: kivágja a kiemelt elemet a sötétítésből. Nem fog kattintást,
          hogy a mögötte lévő háttér zárhassa a bemutatót. */}
      {hasSpot && (
        <div
          className="pointer-events-none absolute rounded-xl motion-safe:transition-all motion-safe:duration-300"
          style={{
            top:    rect!.top - PAD,
            left:   rect!.left - PAD,
            width:  rect!.width + PAD * 2,
            height: rect!.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
          aria-hidden
        />
      )}

      {/* A buborék csak akkor jelenik meg, ha már tudjuk, hova mutat. */}
      {resolved && (
      <div
        ref={cardRef}
        className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-2xl bg-white p-5 shadow-2xl sm:w-[320px]"
        style={cardStyle}
      >
        {/* Képernyőolvasónak: melyik lépésnél tartunk. A látó felhasználó ezt a
            pontokból vagy a számlálóból látja. */}
        <p className="sr-only" aria-live="polite">
          {index + 1}. lépés {steps.length}-ből: {step.title}
        </p>

        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
              <PawPrint className="h-4 w-4 text-brand-600" />
            </span>
            <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
          </div>
          <button
            onClick={finish}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Bemutató bezárása"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          {/* Rövid bemutatónál pöttyök, hosszúnál számláló: hét fölött a pöttyök
              már nem mondanak semmit, csak elfoglalják a helyet. */}
          {steps.length <= 7 ? (
            <div className="flex gap-1.5" aria-hidden>
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (i === index ? "w-4 bg-brand-500" : "w-1.5 bg-gray-200")
                  }
                />
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-gray-400" aria-hidden>
              {index + 1} / {steps.length}
            </span>
          )}

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Vissza
              </button>
            )}
            <button
              onClick={next}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              {isLast
                ? (<><Check className="h-3.5 w-3.5" /> Kész</>)
                : (<>Tovább <ArrowRight className="h-3.5 w-3.5" /></>)}
            </button>
          </div>
        </div>

        {!isLast && (
          <button
            onClick={finish}
            className="mt-3 w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            Bemutató kihagyása
          </button>
        )}
      </div>
      )}
    </div>,
    document.body
  );
}

/** Bemutató indítása bárhonnan. `id` nélkül az aktuális oldalét indítja. */
export function startTour(id?: string): void {
  window.dispatchEvent(new CustomEvent("start-tour", { detail: { id } }));
}

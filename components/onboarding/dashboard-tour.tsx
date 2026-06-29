"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowLeft, ArrowRight, Check, PawPrint } from "lucide-react";

export interface TourStep {
  /** CSS selector of the element to highlight. `null` = centered card (welcome / finish). */
  selector: string | null;
  title: string;
  body:   string;
}

interface Rect { top: number; left: number; width: number; height: number }

const PAD = 8;          // spotlight padding around the target
const GAP = 14;         // gap between spotlight and tooltip
const CARD_W = 320;     // tooltip width

export function DashboardTour({ steps, autoStart }: { steps: TourStep[]; autoStart: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive]   = useState(false);
  const [index, setIndex]     = useState(0);
  const [rect, setRect]       = useState<Rect | null>(null);
  const startedRef = useRef(false);

  useEffect(() => setMounted(true), []);

  const start = useCallback(() => {
    setIndex(0);
    setActive(true);
  }, []);

  // Auto-start once on first visit + manual restart via custom event
  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      const t = setTimeout(start, 600); // let the dashboard settle
      return () => clearTimeout(t);
    }
  }, [autoStart, start]);

  useEffect(() => {
    const handler = () => start();
    window.addEventListener("start-dashboard-tour", handler);
    return () => window.removeEventListener("start-dashboard-tour", handler);
  }, [start]);

  const step = active ? steps[index] : null;

  // Find target + compute its rect; auto-skip steps whose target is missing
  const measure = useCallback(() => {
    if (!step) return;
    if (!step.selector) { setRect(null); return; }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      // target not present (e.g. role-hidden nav item) → skip forward
      setIndex((i) => (i < steps.length - 1 ? i + 1 : i));
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step, steps.length]);

  // Scroll target into view when the step changes
  useLayoutEffect(() => {
    if (!step) return;
    if (step.selector) {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const t = setTimeout(measure, 300);
    measure();
    return () => clearTimeout(t);
  }, [step, measure]);

  // Keep the spotlight attached on scroll / resize
  useEffect(() => {
    if (!active) return;
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [active, measure]);

  const finish = useCallback((markSeen: boolean) => {
    setActive(false);
    if (markSeen) {
      fetch("/api/onboarding", { method: "POST" }).catch(() => {});
    }
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) { finish(true); return i; }
      return i + 1;
    });
  }, [steps.length, finish]);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard: Esc to close, arrows to navigate
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, next, prev]);

  if (!mounted || !active || !step) return null;

  const isCentered = !step.selector || !rect;
  const isLast  = index === steps.length - 1;
  const isFirst = index === 0;

  // Tooltip position
  let cardStyle: React.CSSProperties;
  if (isCentered) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placeRight = vw >= 1024 && rect!.left + rect!.width + GAP + CARD_W < vw;
    if (placeRight) {
      let top = rect!.top;
      top = Math.min(top, vh - 220);
      top = Math.max(12, top);
      cardStyle = { top, left: rect!.left + rect!.width + GAP };
    } else {
      // place below, clamped horizontally
      let left = rect!.left;
      left = Math.min(left, vw - CARD_W - 12);
      left = Math.max(12, left);
      const top = Math.min(rect!.top + rect!.height + GAP, vh - 220);
      cardStyle = { top, left };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true">
      {/* Overlay + spotlight */}
      {isCentered ? (
        <div className="absolute inset-0 bg-black/60" onClick={() => finish(true)} />
      ) : (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-300"
          style={{
            top:    rect!.top - PAD,
            left:   rect!.left - PAD,
            width:  rect!.width + PAD * 2,
            height: rect!.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute w-[320px] max-w-[calc(100vw-24px)] rounded-2xl bg-white p-5 shadow-2xl"
        style={cardStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100">
              <PawPrint className="h-4 w-4 text-brand-600" />
            </span>
            <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
          </div>
          <button
            onClick={() => finish(true)}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Bezárás"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          {/* progress dots */}
          <div className="flex gap-1.5">
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
              {isLast ? (<><Check className="h-3.5 w-3.5" /> Kész</>) : (<>Tovább <ArrowRight className="h-3.5 w-3.5" /></>)}
            </button>
          </div>
        </div>

        {!isLast && (
          <button
            onClick={() => finish(true)}
            className="mt-3 w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            Bemutató kihagyása
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

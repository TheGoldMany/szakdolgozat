"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Camera, X } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { DailyPanel } from "@/components/daily/daily-panel";

/**
 * A Napi állatok lebegő gombja a jobb alsó sarokban.
 *
 * Elhelyezés: mobilon a fix alsó menüsáv (3,5rem) és a készülék biztonsági
 * sávja FÖLÉ kell kerülnie, különben a sáv eltakarja. Asztali gépen nincs alsó
 * sáv, ezért ott alacsonyabban ülhet.
 *
 * A panel portálba kerül, a `document.body` alá: a fejléc `backdrop-filter`-e
 * és a lapon belüli `transform`-ok új pozicionálási keretet hoznak létre, és
 * egy azon belül rendert fix elem nem a képernyőhöz igazodna.
 */
export function DailyLauncher() {
  const t = useTranslations("daily");
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Oldalváltáskor csukódjon be: a panel tartalma az előző oldalhoz tartozott.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Nyitott panel mellett ne guruljon a háttér.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape zárja – a modálisoknál ez az elvárt viselkedés.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // A bejelentkezés betöltése közben ne villanjon fel semmi.
  if (status === "loading") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("launcherLabel")}
        title={t("title")}
        className="press daily-fab fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/25 transition-colors hover:bg-brand-700 md:right-6"
      >
        <Camera className="h-6 w-6" />
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-end justify-center sm:items-center">
          <div
            className="animate-fade-in absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
            className="animate-modal relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Camera className="h-4 w-4 text-brand-500" />
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Bezárás"
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <DailyPanel loggedIn={!!session?.user?.id} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

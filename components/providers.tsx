"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

/**
 * iOS Safari csak akkor alkalmazza a `:active` stílusokat koppintásra, ha az
 * oldalon van érintés-figyelő. Enélkül iPhone-on a gombok nyomás-visszajelzése
 * (a rövid összenyomás) egyszerűen nem látszik – asztali böngészőben és
 * Androidon viszont igen, ezért könnyű elnézni.
 *
 * Ez az üres figyelő pontosan ezt kapcsolja be. Passzív, tehát a görgetést
 * nem lassítja, és semmit nem csinál a puszta létezésén kívül.
 */
function useTouchActiveStates() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useTouchActiveStates();

  return (
    <SessionProvider>
      {children}
      <Toaster
        position="bottom-right"
        // Mobilon a képernyő alján fix menüsáv ül; enélkül a buborék mögé
        // csúszna, és a felhasználó sosem látná a visszajelzést.
        mobileOffset={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
        toastOptions={{
          classNames: {
            toast:       "!rounded-xl !shadow-lg !border !border-gray-100",
            success:     "!bg-white !text-gray-900",
            error:       "!bg-white !text-gray-900",
            info:        "!bg-white !text-gray-900",
            description: "!text-gray-500",
          },
        }}
      />
    </SessionProvider>
  );
}

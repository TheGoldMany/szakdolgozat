import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "./auth";
import { openNotification, resolveNotificationLink } from "./notification-link";
import { clearBadge, registerForPush } from "./push";

/**
 * A push bekötése: regisztráció és a koppintás kezelése.
 *
 * Miért hook és nem szolgáltató (provider): nincs megosztandó állapota. Egy
 * helyen kell meghívni, az `AuthProvider`-en belül — azon kívül nem tudná,
 * ki van bejelentkezve.
 */
export function usePush(): void {
  const { user } = useAuth();
  const router = useRouter();

  // Regisztráció bejelentkezés után. Kijelentkezéskor NEM itt törlünk: azt az
  // `AuthProvider.logout` végzi, mert a szerverhívásnak még élő munkamenet
  // kell, ami a kijelentkezés után már nincs.
  useEffect(() => {
    if (!user) return;
    void registerForPush();
  }, [user?.id]);

  /**
   * A már feldolgozott koppintás azonosítója.
   *
   * A `useLastNotificationResponse` a LEGUTÓBBI választ adja vissza, és
   * újracsatoláskor ugyanazt még egyszer — enélkül minden képernyőváltás
   * után újra odaugranánk, ahova az értesítés mutat, akár percekkel később.
   */
  const handled = useRef<string | null>(null);
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!response) return;

    // Csak a magára az értesítésre való koppintás számít, a gombokra nem
    // (gombunk jelenleg nincs, de a fejlécben megjelenő rendszergombok igen).
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    void clearBadge();

    const data = response.notification.request.content.data;
    const href = typeof data?.href === "string" ? data.href : null;

    // Ugyanaz a leképezés, mint az értesítéslistában: amihez van mobil
    // képernyő, oda visz; a többi a böngészőben nyílik. Ha nincs cél,
    // legalább a listát mutassuk meg — ne nyeljük el a koppintást.
    const target = resolveNotificationLink(href);
    if (target.kind === "none") {
      router.push("/notifications");
      return;
    }
    void openNotification(target, (path) => router.push(path as never));
  }, [response]);
}

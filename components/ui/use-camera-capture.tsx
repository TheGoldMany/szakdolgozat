"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImageIcon, X } from "lucide-react";

/**
 * Fotó készítése a telefon kamerájával, súgóval arra az esetre, ha nem megy.
 *
 * A kamerát a böngésző egy `capture` attribútumos fájlmezővel nyitja meg. Ha a
 * telefon nem engedi a kamerát annak a böngészőnek (iOS-en a Safari
 * webhelybeállítása vagy az app kamera-engedélye, Képernyőidő, Facebook /
 * Messenger belső böngészője), a rendszer kamerafelülete megnyílik, de fekete
 * képet mutat, a weboldal pedig erről semmit nem tud meg. Ezt a beállítást a
 * weboldal nem tudja felülírni.
 *
 * Amit meg tudunk tenni, hogy a látogató ne akadjon el:
 *  1. Ha a böngésző már előre megmondja, hogy a kamera tiltva van
 *     (`navigator.permissions`), a kamera helyett rögtön a súgót mutatjuk.
 *  2. Ha a kamerából fotó nélkül tér vissza (megszakította, mert fekete volt),
 *     megjelenik a súgó: rövid, a telefonjára szabott lépések, és egy gomb,
 *     amivel a galériából azonnal választhat helyette.
 */
export function useCameraCapture(
  onFiles: (files: FileList) => void,
  openGallery: () => void,
) {
  const t = useTranslations("common");
  const inputRef  = useRef<HTMLInputElement>(null);
  const pending   = useRef(false);
  const [help, setHelp] = useState(false);

  const showHelp = useCallback(() => {
    pending.current = false;
    setHelp(true);
  }, []);

  // Fotó nélküli visszatérés: a `cancel` eseményt az újabb böngészők adják
  // (iOS Safari 16.4+, Chrome 113+). A régebbieknél az ablak fókusz-
  // visszatérése jelzi, hogy a választó bezárult; ha addig nem jött fájl,
  // az is megszakításnak számít.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const onCancel = () => { if (pending.current) showHelp(); };
    const onFocus  = () => {
      if (!pending.current) return;
      window.setTimeout(() => { if (pending.current) showHelp(); }, 1200);
    };
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onFocus);
    return () => {
      input.removeEventListener("cancel", onCancel);
      window.removeEventListener("focus", onFocus);
    };
  }, [showHelp]);

  const open = useCallback(async () => {
    setHelp(false);
    // Ha a böngésző tudja, hogy a kamera tiltva van, felesleges a fekete
    // kamerafelületet megnyitni: rögtön a súgó jön.
    try {
      const status = await navigator.permissions?.query({ name: "camera" as PermissionName });
      if (status?.state === "denied") { showHelp(); return; }
    } catch {
      /* a böngésző nem ismeri ezt a lekérdezést: megpróbáljuk */
    }
    pending.current = true;
    inputRef.current?.click();
  }, [showHelp]);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(e) => {
        pending.current = false;
        if (e.target.files?.length) { setHelp(false); onFiles(e.target.files); }
        e.target.value = "";
      }}
    />
  );

  const helpPanel = help ? (
    <CameraHelp
      onClose={() => setHelp(false)}
      onGallery={() => { setHelp(false); openGallery(); }}
      onRetry={() => { void open(); }}
      t={t}
    />
  ) : null;

  return { open, input, helpPanel };
}

type Env = "ios-safari" | "ios-other" | "android" | "in-app" | "other";

function detectEnv(): Env {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // Közösségi appok belső böngészője: ezek kapnak a legritkábban kamerát.
  if (/FBAN|FBAV|FB_IAB|Instagram|Messenger|Snapchat|TikTok|Line\//i.test(ua)) return "in-app";
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function CameraHelp({
  onClose, onGallery, onRetry, t,
}: {
  onClose: () => void;
  onGallery: () => void;
  onRetry: () => void;
  t: ReturnType<typeof useTranslations<"common">>;
}) {
  const env = detectEnv();
  const steps =
    env === "ios-safari" ? t("cameraHelpIosSafari")
    : env === "ios-other" ? t("cameraHelpIosOther")
    : env === "android"   ? t("cameraHelpAndroid")
    : env === "in-app"    ? t("cameraHelpInApp")
    : t("cameraHelpOther");

  return (
    <div role="status" className="relative mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute right-2 top-2 rounded-md p-1 text-amber-800 hover:bg-amber-100"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-6 font-semibold text-amber-950">{t("cameraHelpTitle")}</p>
      <p className="mt-1 leading-relaxed text-amber-900">{steps}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGallery}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          {t("cameraHelpGallery")}
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:border-amber-400"
        >
          <Camera className="h-3.5 w-3.5" />
          {t("cameraHelpRetry")}
        </button>
      </div>
    </div>
  );
}

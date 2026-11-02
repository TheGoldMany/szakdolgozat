"use client";

import { useEffect, useState } from "react";

/** A kapcsolati cím két része: a teljes cím sehol nem szerepel egyben a HTML-ben. */
const USER = "info";
const DOMAIN = "allatimenhelyek.hu";

/** Mondaton belüli említéshez (szerveroldali szövegekben), kattintás nélkül. */
export const EMAIL_AT_TEXT = `${USER} [kukac] ${DOMAIN}`;

/**
 * Az e-mail-cím védett megjelenítése.
 *
 * A címet a robotok a HTML-ből gyűjtik be, és célzott adathalász levelek
 * jönnek rá. Ezért a szerver által küldött HTML-ben nincs benne: a böngésző
 * rakja össze a betöltés után. Addig (és JavaScript nélkül) „info [kukac]
 * allatimenhelyek.hu” olvasható, ami embernek egyértelmű.
 */
export function EmailLink({ subject, className, icon, children }: {
  subject?: string;
  className?: string;
  /** A szöveg elé kerülő ikon. */
  icon?: React.ReactNode;
  /** Ha meg van adva, ez a link szövege (pl. gombfelirat); különben maga a cím. */
  children?: React.ReactNode;
}) {
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => { setAddress(`${USER}@${DOMAIN}`); }, []);

  if (!address) {
    return <span className={className}>{icon}{children ?? EMAIL_AT_TEXT}</span>;
  }
  const href = `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return <a href={href} className={className}>{icon}{children ?? address}</a>;
}

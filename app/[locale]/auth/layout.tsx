import type { Metadata } from "next";

// Belépés, regisztráció, jelszó-visszaállítás: nincs keresőbe való tartalmuk,
// és négy nyelven ugyanaz az űrlap, amit a Google duplikátumnak látna.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

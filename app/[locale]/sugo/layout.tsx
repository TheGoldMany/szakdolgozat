import type { Metadata } from "next";
import { huOnlyAlternates } from "@/lib/page-metadata";

// A súgó kliens komponens, ezért a metaadat itt, a layoutban él.
export const metadata: Metadata = {
  title:       "Útmutató",
  description: "Minden, amit az ÁllatiMenhelyek.hu használatához tudni kell: örökbefogadás, bejelentés, térkép.",
  alternates:  huOnlyAlternates("/sugo"),
};

export default function SugoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "ÁllatiMenhelyek.hu",
    template: "%s | ÁllatiMenhelyek.hu",
  },
  description:
    "Találd meg új legjobb barátod! Böngéssz örökbefogadható állatok között magyarországi menhelyekről.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { withAuth } from "next-auth/middleware";
import { routing } from "./i18n/routing";
import { Role } from "@prisma/client";

const intlMiddleware = createIntlMiddleware(routing);

const authMiddleware = withAuth(
  function onSuccess(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as Role | undefined;
    if (pathname.startsWith("/dashboard")) {
      if (role !== Role.SHELTER_ADMIN && role !== Role.SUPER_ADMIN) {
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }
    // locale-aware protected paths: intl middleware must also run for [locale] routing
    return intlMiddleware(req);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const protectedPaths = ["/dashboard", "/profile", "/applications", "/messages"];
        if (protectedPaths.some((p) => pathname.startsWith(p))) return !!token;
        return true;
      },
    },
    pages: { signIn: "/auth/login" },
  }
);

/**
 * A fizetési útvonalak, nyelvi előtag nélkül.
 *
 * MIÉRT ITT, ÉS NEM AZ OLDALAKBAN
 *
 * Az oldalban hívott `notFound()` a `force-dynamic` útvonalaknál már a
 * streamelés megkezdése UTÁN fut: a „nem található" tartalom kimegy, de
 * 200-as státuszkóddal. Egy kikapcsolt funkciónál ez rossz — a keresők
 * indexelnék, és a hívó nem tudná megkülönböztetni a működőtől.
 *
 * A middleware minden renderelés előtt fut, tehát itt a 404 valóban 404. És
 * mivel egy helyen van a lista, egy új fizetési oldal sem maradhat véletlenül
 * nyitva azért, mert valaki elfelejtette beleírni a kaput a komponensbe.
 *
 * Az oldalakban lévő `notFound()` SZÁNDÉKOSAN ott marad: ez a réteg a
 * státuszkódot garantálja, az pedig azt, hogy a komponens akkor se
 * rendereljen, ha valaha más úton hívnák meg.
 */
const PAYMENT_PATHS = [
  "/donate",
  "/campaigns",
  "/finances",
  "/platformdij",
  "/dashboard/tiers",
  "/dashboard/campaigns",
  "/dashboard/subscriptions",
];

/** Kezdődik-e az útvonal a megadott szakasszal (a `/donate-x` NEM számít). */
function matchesPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

function isPaymentPath(pathname: string): boolean {
  // A nyelvi előtagot le kell vágni: a `/hu/donate` ugyanaz, mint a `/donate`.
  const withoutLocale = pathname.replace(
    new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`),
    ""
  ) || "/";
  return PAYMENT_PATHS.some((p) => matchesPath(withoutLocale, p));
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (process.env.NEXT_PUBLIC_PAYMENTS_ENABLED !== "true" && isPaymentPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const isProtected = ["/dashboard", "/profile", "/applications", "/messages"].some((p) =>
    pathname.startsWith(p)
  );
  if (isProtected) {
    return (authMiddleware as unknown as (req: NextRequest) => NextResponse)(req);
  }
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)"],
};

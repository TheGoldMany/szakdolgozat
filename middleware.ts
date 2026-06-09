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

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
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

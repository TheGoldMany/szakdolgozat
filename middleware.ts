import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as Role | undefined;

    // /dashboard/* csak SHELTER_ADMIN vagy SUPER_ADMIN számára
    if (pathname.startsWith("/dashboard")) {
      if (role !== Role.SHELTER_ADMIN && role !== Role.SUPER_ADMIN) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // A middleware csak akkor fut, ha a felhasználó be van jelentkezve
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Ezek az útvonalak bejelentkezést igényelnek
        const protectedPaths = ["/dashboard", "/profile", "/applications"];
        if (protectedPaths.some((p) => pathname.startsWith(p))) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/applications/:path*"],
};

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { encode as jwtEncode, decode as jwtDecode } from "next-auth/jwt";
import { verifyPassword } from "@/lib/password";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const REMEMBER_MAX_AGE    = 30 * 24 * 60 * 60; // 30 nap

/**
 * Milyen gyakran olvassuk újra a szerepkört az adatbázisból.
 *
 * A szerepkör a bejelentkezéskor kerül a sütibe, és eddig 30 napig nem
 * frissült. A dashboard-kaput a middleware a sütiből olvassa — vagyis egy
 * lefokozott menhelyi admin vagy főadmin akár 30 napig bejutott, egy törölt
 * fiók sütije pedig tovább működött. Öt perc: a jogfosztás legfeljebb ennyi
 * idő alatt érvényesül, és a lekérdezés nem fut minden egyes kérésnél.
 */
const ROLE_REFRESH_MS = 5 * 60 * 1000;
const NO_REMEMBER_MAX_AGE = 12 * 60 * 60;       // 12 óra

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: REMEMBER_MAX_AGE },
  // A NextAuth a `Secure` sütit (és a `__Secure-` előtagot) magától csak akkor
  // kapcsolja be, ha a NEXTAUTH_URL `https://`-sel kezdődik — egy elgépelt
  // `http://` csendben kikapcsolná, és a munkamenet-süti titkosítatlan
  // kapcsolaton is elmenne. A Vercelen minden környezet HTTPS, ott kötelező.
  useSecureCookies: Boolean(process.env.VERCEL) || (process.env.NEXTAUTH_URL ?? "").startsWith("https://"),
  jwt: {
    async encode(params) {
      const rememberMe = (params.token?.rememberMe as boolean) ?? true;
      return jwtEncode({ ...params, maxAge: rememberMe ? REMEMBER_MAX_AGE : NO_REMEMBER_MAX_AGE });
    },
    async decode(params) {
      return jwtDecode(params);
    },
  },
  pages: {
    signIn: "/auth/login",
    error:  "/auth/login",
  },
  providers: [
    // Google OAuth – needs GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId:     process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          // A Google hitelesíti az e-mail tulajdonjogát, ezért biztonságos az
          // azonos e-mailű, meglévő fiókkal való automatikus összekötés
          // (különben "OAuthAccountNotLinked" hibát kap a jelszavas felhasználó).
          allowDangerousEmailAccountLinking: true,
        })]
      : []),

    // Facebook OAuth – needs FACEBOOK_CLIENT_ID + FACEBOOK_CLIENT_SECRET env vars
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [FacebookProvider({
          clientId:     process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
          allowDangerousEmailAccountLinking: true,
        })]
      : []),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:      { label: "Email",       type: "email"    },
        password:   { label: "Jelszó",      type: "password" },
        rememberMe: { label: "Jegyezz meg", type: "text"     },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Korlát nélkül korlátlan jelszópróbálgatást engedett. Két kulcson:
        // IP-re (egy támadó sok fiókra) és e-mailre (sok IP egy fiókra).
        // A `null` a NextAuth-ban „hibás adatok" — szándékosan nem árulja el,
        // hogy a fiók létezik-e vagy csak korlátba ütköztünk.
        const fwd   = req?.headers?.["x-forwarded-for"];
        const ip    = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || "unknown";
        const email = credentials.email.toLowerCase().slice(0, 200);
        if (!checkRateLimit(`login-ip:${ip}`, 10, 15 * 60_000)
         || !checkRateLimit(`login-email:${email}`, 5, 15 * 60_000)) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        // Csak a bejelentkezéshez szükséges oszlopokat kérjük le – így egy
        // esetleges séma-eltérés (pl. újonnan felvett, DB-ben még nem létező
        // oszlop) nem tudja bedönteni a teljes lekérdezést és a login-t.
        const user = await prisma.user.findUnique({
          where:  { email: credentials.email },
          select: {
            id: true, email: true, name: true, image: true,
            role: true, password: true, emailVerified: true,
          },
        });

        if (!user || !user.password) return null;

        const isValid = await verifyPassword(credentials.password, user.password);
        if (!isValid) return null;

        // Jelszavas fiók esetén kötelező a megerősített email-cím
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          image:      user.image,
          role:       user.role,
          rememberMe: credentials.rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session: sessionData }) {
      // Credentials sign-in
      if (user) {
        token.id         = user.id;
        token.role       = (user as { role: Role }).role;
        token.image      = user.image ?? null;
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? true;
      }
      // OAuth sign-in: fetch role + id from DB (provider doesn't know role)
      if (account && account.provider !== "credentials" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where:  { email: token.email },
          select: { id: true, role: true, image: true },
        });
        if (dbUser) {
          token.id    = dbUser.id;
          token.role  = dbUser.role;
          token.image = dbUser.image ?? token.picture ?? null;
        }
      }
      // A szerepkör időszakos újraolvasása — lásd ROLE_REFRESH_MS.
      if (token.id && !user) {
        const checkedAt = (token.roleCheckedAt as number | undefined) ?? 0;
        if (Date.now() - checkedAt > ROLE_REFRESH_MS) {
          const fresh = await prisma.user.findUnique({
            where:  { id: token.id as string },
            select: { role: true, deletionScheduledAt: true },
          });
          if (!fresh || fresh.deletionScheduledAt) {
            // Törölt fiók: a munkamenet azonosító nélkül marad, így minden
            // védett végpont 401-et ad, és a middleware kijelentkeztetettnek látja.
            token.id   = "";
            token.role = "" as Role;
          } else {
            token.role = fresh.role;
          }
          token.roleCheckedAt = Date.now();
        }
      }
      if (user) token.roleCheckedAt = Date.now();

      // Client called update({ image }) after avatar change
      if (trigger === "update" && sessionData?.image !== undefined) {
        token.image = sessionData.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id   as string;
        session.user.role  = token.role as Role;
        session.user.image = (token.image ?? token.picture ?? null) as string | null;
      }
      return session;
    },
  },
};

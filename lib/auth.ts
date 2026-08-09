import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { encode as jwtEncode, decode as jwtDecode } from "next-auth/jwt";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

const REMEMBER_MAX_AGE    = 30 * 24 * 60 * 60; // 30 nap
const NO_REMEMBER_MAX_AGE = 12 * 60 * 60;       // 12 óra

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: REMEMBER_MAX_AGE },
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

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

        const isValid = await compare(credentials.password, user.password);
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

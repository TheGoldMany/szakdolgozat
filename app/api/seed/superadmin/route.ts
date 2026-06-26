import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

// Only callable in Vercel preview or local dev — never in production
export async function POST() {
  const env = process.env.VERCEL_ENV;
  if (env === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const password = await hash("123456", 12);

  await prisma.user.upsert({
    where:  { email: "terrarisztika1@gmail.com" },
    update: { password, role: "SUPER_ADMIN", emailVerified: new Date() },
    create: {
      email:         "terrarisztika1@gmail.com",
      name:          "Super Admin",
      password,
      role:          "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });

  return NextResponse.json({ ok: true, email: "terrarisztika1@gmail.com" });
}

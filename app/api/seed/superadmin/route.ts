import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const token = req.headers.get("x-seed-token");
  if (!process.env.SEED_SECRET || token !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

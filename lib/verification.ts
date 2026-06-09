import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 óra

/**
 * Generál egy új email-megerősítő tokent a megadott címhez (a régieket törli),
 * és elküldi a megerősítő emailt. Fire-and-forget hibakezelés a hívó oldalán.
 */
export async function issueVerificationToken(email: string, name?: string | null) {
  // A cím korábbi tokenjeinek törlése
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token   = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  await sendVerificationEmail(email, token, name);
}

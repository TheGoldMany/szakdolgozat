import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendReportMessageEmail } from "@/lib/email";
import { requireAuthUser } from "@/lib/api-auth";

const schema = z.object({
  message: z.string().min(10, "Legalább 10 karakter szükséges").max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const body   = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Érvénytelen adatok" },
      { status: 400 }
    );
  }

  const [report, sender] = await Promise.all([
    prisma.animalReport.findUnique({
      where:  { id: params.id },
      select: { contactEmail: true, contactName: true, name: true, breed: true, type: true, userId: true },
    }),
    prisma.user.findUnique({
      where:  { id: user!.id },
      select: { name: true, email: true },
    }),
  ]);

  if (!report) {
    return NextResponse.json({ error: "Nem található" }, { status: 404 });
  }
  if (report.userId === user!.id) {
    return NextResponse.json({ error: "Saját bejelentésedre nem küldhetsz üzenetet" }, { status: 400 });
  }

  const BASE        = process.env.NEXTAUTH_URL ?? "https://allatimenhelyek.hu";
  const reportTitle = report.name ?? report.breed ?? "Névtelen bejelentés";
  const reportUrl   = `${BASE}/reports/${params.id}`;
  const senderName  = sender?.name ?? "Ismeretlen felhasználó";
  const senderEmail = sender?.email ?? "";

  try {
    await sendReportMessageEmail({
      to:          report.contactEmail,
      contactName: report.contactName,
      senderName,
      senderEmail,
      reportTitle,
      reportUrl,
      message:     parsed.data.message,
    });
  } catch (err) {
    console.error("Email sending failed:", err);
    return NextResponse.json(
      { error: "Az email küldése sikertelen. Kérjük, vedd fel a kapcsolatot közvetlenül a megadott elérhetőségeken." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

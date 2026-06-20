import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name:     z.string().min(1).max(200),
  url:      z.string().url(),
  fileType: z.string().optional(),
});

async function checkAccess(shelterId: string, userId: string, role: string) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "SHELTER_ADMIN") {
    const record = await prisma.shelterAdmin.findFirst({ where: { shelterId, userId } });
    return !!record;
  }
  return false;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkAccess(params.id, session.user.id, session.user.role ?? "")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const docs = await prisma.shelterDocument.findMany({
      where:   { shelterId: params.id },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(docs);
  } catch (error) {
    console.error('[api/shelters/[id]/documents GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkAccess(params.id, session.user.id, session.user.role ?? "")))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: "Érvénytelen adatok" }, { status: 400 });

  const doc = await prisma.shelterDocument.create({
    data: { shelterId: params.id, ...parsed.data },
  });
  return NextResponse.json(doc, { status: 201 });
}

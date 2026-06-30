import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/shelters/list — lightweight active-shelter list for selects
export async function GET() {
  try {
    const shelters = await prisma.shelter.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(shelters);
  } catch (error) {
    console.error("[api/shelters/list GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

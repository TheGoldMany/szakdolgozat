import { NextRequest, NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { toggleLike } from "@/lib/daily-posts";

/** POST /api/daily-posts/[id]/like – kedvelés be/ki. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = await requireAuthUser(req);
  if (error) return error;

  const result = await toggleLike(params.id, user!.id);
  if (!result) return NextResponse.json({ error: "Nem található" }, { status: 404 });

  return NextResponse.json(result);
}

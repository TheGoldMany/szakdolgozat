import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Bejelentkezés szükséges" }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
        tokenPayload: JSON.stringify({ userId: authUser.id }),
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

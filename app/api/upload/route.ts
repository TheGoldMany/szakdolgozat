import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Bejelentéshez nem kell bejelentkezés, egyébként igen
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
          tokenPayload: JSON.stringify({ userId: authUser?.id ?? "anonymous" }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Blob uploaded:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

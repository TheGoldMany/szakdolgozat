import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Bejelentéshez nem kell bejelentkezés, egyébként igen.
        //
        // Korlát nélkül ez a végpont bárkinek ingyenes tárhelyet adott a mi
        // Blob-keretünkből. Az anonim feltöltő szűkebb keretet kap: egy
        // bejelentéshez legfeljebb hat kép kell.
        const key   = authUser ? `upload-user:${authUser.id}` : `upload-anon:${getClientIp(request)}`;
        const limit = authUser ? 60 : 12;
        if (!checkRateLimit(key, limit, 60 * 60_000)) {
          throw new Error("Túl sok feltöltés. Próbáld újra később.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 5 * 1024 * 1024, // 5 MB
          // A kliens választja a fájlnevet; utótag nélkül a cím kitalálható,
          // és egy előre lefoglalt név a valódi feltöltést elutasíttatná.
          addRandomSuffix: true,
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

import { NextResponse } from "next/server";
import { readLocalSourceImage } from "../localSourceImage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function getLocalSourceImageResponse(includeBody: boolean) {
  const localSourceImage = await readLocalSourceImage();
  if (!localSourceImage) {
    return NextResponse.json({ error: "Local source image not found." }, { status: 404 });
  }

  if (localSourceImage.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Local source image must be 10MB or smaller." },
      { status: 413 },
    );
  }

  const body = includeBody
    ? new Blob([new Uint8Array(localSourceImage.bytes)], {
        type: localSourceImage.mimeType,
      })
    : null;

  return new Response(body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Length": String(localSourceImage.size),
      "Content-Type": localSourceImage.mimeType,
      "X-Image-Workbench-Source": localSourceImage.fileName,
    },
  });
}

export async function GET() {
  return getLocalSourceImageResponse(true);
}

export async function HEAD() {
  return getLocalSourceImageResponse(false);
}

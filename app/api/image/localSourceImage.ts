import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const LOCAL_SOURCE_IMAGE_DIR = "local-images";

const LOCAL_SOURCE_IMAGE_NAMES = ["source", "default", "input"];
const MIME_TYPES_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

export type LocalSourceImage = {
  absolutePath: string;
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  size: number;
};

function getMimeType(fileName: string) {
  return MIME_TYPES_BY_EXTENSION.get(path.extname(fileName).toLowerCase());
}

function isSupportedImageFile(fileName: string) {
  return Boolean(getMimeType(fileName));
}

async function findLocalSourceImagePath() {
  let entries;
  try {
    entries = await readdir(/*turbopackIgnore: true*/ LOCAL_SOURCE_IMAGE_DIR, {
      withFileTypes: true,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }

    throw error;
  }

  const imageFileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(isSupportedImageFile)
    .sort((left, right) => left.localeCompare(right));

  if (imageFileNames.length === 0) {
    return null;
  }

  const preferredFileName = LOCAL_SOURCE_IMAGE_NAMES.flatMap((name) =>
    [...MIME_TYPES_BY_EXTENSION.keys()].map((extension) => `${name}${extension}`),
  ).find((fileName) => imageFileNames.includes(fileName));
  const fileName = preferredFileName ?? imageFileNames[0];

  return {
    absolutePath: `${LOCAL_SOURCE_IMAGE_DIR}/${fileName}`,
    fileName,
    mimeType: getMimeType(fileName) as string,
  };
}

export async function readLocalSourceImage(): Promise<LocalSourceImage | null> {
  const sourceImagePath = await findLocalSourceImagePath();
  if (!sourceImagePath) {
    return null;
  }

  const metadata = await stat(/*turbopackIgnore: true*/ sourceImagePath.absolutePath);
  if (!metadata.isFile()) {
    return null;
  }

  return {
    ...sourceImagePath,
    bytes: await readFile(
      /*turbopackIgnore: true*/ sourceImagePath.absolutePath,
    ),
    size: metadata.size,
  };
}

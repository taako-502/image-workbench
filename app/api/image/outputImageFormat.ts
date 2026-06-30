import { getServerEnv } from "./geminiEnv";

const OUTPUT_EXTENSION_ENV = "GEMINI_OUTPUT_IMAGE_EXTENSION";
const DEFAULT_OUTPUT_EXTENSION = "jpg";

const MIME_TYPES_BY_EXTENSION = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

export function getOutputImageMimeType() {
  const extension =
    getServerEnv(OUTPUT_EXTENSION_ENV).toLowerCase() || DEFAULT_OUTPUT_EXTENSION;

  return MIME_TYPES_BY_EXTENSION.get(extension) ?? "image/jpeg";
}

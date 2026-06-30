import { getServerEnv } from "./geminiEnv";

const OUTPUT_EXTENSION_ENV = "GEMINI_OUTPUT_IMAGE_EXTENSION";
const OUTPUT_NAME_ENV = "GEMINI_OUTPUT_IMAGE_NAME";
const DEFAULT_OUTPUT_EXTENSION = "jpg";
const DEFAULT_OUTPUT_NAME = "image-workbench";

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

export function getOutputImageName() {
  return getServerEnv(OUTPUT_NAME_ENV) || DEFAULT_OUTPUT_NAME;
}

import { getServerEnv } from "./geminiEnv";
import {
  DEFAULT_IMAGE_ASPECT_RATIO,
  getImageAspectRatioOrDefault,
  normalizeImageAspectRatio,
} from "../../imageAspectRatios";

export const IMAGE_ASPECT_RATIO_ENV = "GEMINI_IMAGE_ASPECT_RATIO";

export const OUTPUT_IMAGE_SIZES = ["1K", "2K", "4K"] as const;

export type OutputImageSize = (typeof OUTPUT_IMAGE_SIZES)[number];

type GeminiImageConfig = {
  aspect_ratio: string;
  image_size?: OutputImageSize;
};

export function isOutputImageSize(value: unknown): value is OutputImageSize {
  return (
    typeof value === "string" &&
    OUTPUT_IMAGE_SIZES.includes(value as OutputImageSize)
  );
}

export function getConfiguredImageAspectRatio() {
  return getImageAspectRatioOrDefault(
    getServerEnv(IMAGE_ASPECT_RATIO_ENV) || DEFAULT_IMAGE_ASPECT_RATIO,
  );
}

export function getGeminiImageConfig(
  imageSize?: OutputImageSize,
  requestedAspectRatio?: string,
): GeminiImageConfig {
  const aspectRatio = requestedAspectRatio
    ? normalizeImageAspectRatio(requestedAspectRatio)
    : getConfiguredImageAspectRatio();

  return {
    aspect_ratio: aspectRatio,
    ...(imageSize ? { image_size: imageSize } : {}),
  };
}

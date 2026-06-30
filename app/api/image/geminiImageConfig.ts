import { getServerEnv } from "./geminiEnv";

export const IMAGE_ASPECT_RATIO_ENV = "GEMINI_IMAGE_ASPECT_RATIO";

export const OUTPUT_IMAGE_SIZES = ["1K", "2K", "4K"] as const;

const DEFAULT_ASPECT_RATIO = "4:3";
const ASPECT_RATIO_PRESETS: Record<string, string> = {
  default: DEFAULT_ASPECT_RATIO,
  landscape: DEFAULT_ASPECT_RATIO,
  standard: DEFAULT_ASPECT_RATIO,
  "480x360": DEFAULT_ASPECT_RATIO,
  icon: "1:1",
  square: "1:1",
  "1x1": "1:1",
  "1200x630": "40:21",
  og: "40:21",
  ogp: "40:21",
  "open-graph": "40:21",
  open_graph: "40:21",
};

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

function getGreatestCommonDivisor(left: number, right: number) {
  let a = left;
  let b = right;

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}

function normalizeAspectRatio(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "")
    .replace(/px/g, "");

  if (!normalized) {
    return DEFAULT_ASPECT_RATIO;
  }

  if (ASPECT_RATIO_PRESETS[normalized]) {
    return ASPECT_RATIO_PRESETS[normalized];
  }

  const dimensionMatch = normalized.match(/^(\d+)(?:x|:)(\d+)$/);
  if (!dimensionMatch) {
    return value.trim();
  }

  const width = Number(dimensionMatch[1]);
  const height = Number(dimensionMatch[2]);
  if (width <= 0 || height <= 0) {
    return value.trim();
  }

  const divisor = getGreatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export function getGeminiImageConfig(imageSize?: OutputImageSize): GeminiImageConfig {
  const aspectRatio = normalizeAspectRatio(
    getServerEnv(IMAGE_ASPECT_RATIO_ENV) || DEFAULT_ASPECT_RATIO,
  );

  return {
    aspect_ratio: aspectRatio,
    ...(imageSize ? { image_size: imageSize } : {}),
  };
}

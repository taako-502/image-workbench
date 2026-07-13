export const DEFAULT_IMAGE_ASPECT_RATIO = "4:3";

export const IMAGE_ASPECT_RATIO_OPTIONS = [
  { value: "4:3", label: "4:3 Standard" },
  { value: "1:1", label: "1:1 Square" },
  { value: "16:9", label: "16:9 Landscape" },
  { value: "9:16", label: "9:16 Portrait" },
  { value: "3:4", label: "3:4 Portrait" },
  { value: "4:5", label: "4:5 Social" },
  { value: "40:21", label: "40:21 OGP" },
] as const;

const ASPECT_RATIO_PRESETS: Record<string, string> = {
  default: DEFAULT_IMAGE_ASPECT_RATIO,
  landscape: DEFAULT_IMAGE_ASPECT_RATIO,
  standard: DEFAULT_IMAGE_ASPECT_RATIO,
  "480x360": DEFAULT_IMAGE_ASPECT_RATIO,
  icon: "1:1",
  square: "1:1",
  "1x1": "1:1",
  "1200x630": "40:21",
  og: "40:21",
  ogp: "40:21",
  "open-graph": "40:21",
  open_graph: "40:21",
};

export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIO_OPTIONS)[number]["value"];

export function isImageAspectRatio(value: unknown): value is ImageAspectRatio {
  return (
    typeof value === "string" &&
    IMAGE_ASPECT_RATIO_OPTIONS.some((option) => option.value === value)
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

export function normalizeImageAspectRatio(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, "")
    .replace(/px/g, "");

  if (!normalized) {
    return DEFAULT_IMAGE_ASPECT_RATIO;
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

export function isValidImageAspectRatio(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = normalizeImageAspectRatio(value);
  const ratioMatch = normalized.match(/^(\d+):(\d+)$/);
  if (!ratioMatch) {
    return false;
  }

  return Number(ratioMatch[1]) > 0 && Number(ratioMatch[2]) > 0;
}

export function getImageAspectRatioOrDefault(value: string) {
  const normalized = normalizeImageAspectRatio(value);
  return isValidImageAspectRatio(normalized)
    ? normalized
    : DEFAULT_IMAGE_ASPECT_RATIO;
}

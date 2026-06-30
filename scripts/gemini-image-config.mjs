const DEFAULT_ASPECT_RATIO = "4:3";
const ASPECT_RATIO_PRESETS = {
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

function getGreatestCommonDivisor(left, right) {
  let a = left;
  let b = right;

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a;
}

function normalizeAspectRatio(value) {
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

export function getGeminiImageConfig(env) {
  const aspectRatio =
    env.GEMINI_IMAGE_ASPECT_RATIO ||
    process.env.GEMINI_IMAGE_ASPECT_RATIO ||
    DEFAULT_ASPECT_RATIO;

  return {
    aspect_ratio: normalizeAspectRatio(aspectRatio),
  };
}

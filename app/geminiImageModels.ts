export const GEMINI_IMAGE_MODELS = [
  {
    id: "gemini-3-pro-image",
    label: "Nano Banana Pro",
    description: "Gemini 3 Pro Image",
  },
  {
    id: "gemini-3.1-flash-image",
    label: "Nano Banana 2",
    description: "Gemini 3.1 Flash Image",
  },
  {
    id: "gemini-3.1-flash-lite-image",
    label: "Nano Banana Lite",
    description: "Gemini 3.1 Flash Lite Image",
  },
] as const;

export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export type GeminiImageModel = (typeof GEMINI_IMAGE_MODELS)[number]["id"];

export function isGeminiImageModel(value: unknown): value is GeminiImageModel {
  return (
    typeof value === "string" &&
    GEMINI_IMAGE_MODELS.some((model) => model.id === value)
  );
}

export function getGeminiImageModelLabel(modelId: GeminiImageModel) {
  return (
    GEMINI_IMAGE_MODELS.find((model) => model.id === modelId)?.label ?? modelId
  );
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const OUTPUT_MIME_TYPE = "image/jpeg";
const MODEL_ENV = "GEMINI_IMAGE_MODEL";
const COMMON_PROMPT_ENV = "GEMINI_COMMON_PROMPT";
const INTERACTIONS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

type GeminiImageOutput = {
  type?: string;
  data?: string;
  mime_type?: string;
};

type GeminiInteractionResponse = {
  error?: {
    code?: number | string;
    message?: string;
  };
  output_image?: GeminiImageOutput;
  outputs?: GeminiImageOutput[];
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getModel() {
  return process.env[MODEL_ENV]?.trim() || DEFAULT_MODEL;
}

function getTextInputs(prompt: string) {
  const commonPrompt = process.env[COMMON_PROMPT_ENV]?.trim();
  const userPrompt = prompt.trim();
  const inputs = [];

  if (commonPrompt) {
    inputs.push({
      type: "text" as const,
      text: commonPrompt,
    });
  }

  if (userPrompt) {
    inputs.push({
      type: "text" as const,
      text: userPrompt,
    });
  }

  return inputs;
}

function getClientErrorMessage(status: number, message: string) {
  if (status === 401 || status === 403) {
    return "Gemini API authentication failed. Check GEMINI_API_KEY and project permissions.";
  }

  if (status === 429) {
    return `Gemini API quota/rate limit error: ${message}`;
  }

  if (status >= 400 && status < 500) {
    return message;
  }

  return `Gemini image generation failed: ${message}`;
}

function getOutputImage(response: GeminiInteractionResponse) {
  return (
    response.output_image ??
    response.outputs?.find((output) => output.type === "image" && output.data)
  );
}

export async function POST(request: Request) {
  let body: { prompt?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown };
  } catch {
    return jsonError("Request must use JSON.");
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const textInputs = getTextInputs(prompt);
  if (textInputs.length === 0) {
    return jsonError(`Prompt is required unless ${COMMON_PROMPT_ENV} is set.`);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError("Server is missing GEMINI_API_KEY.", 500);
  }

  const model = getModel();
  const response = await fetch(INTERACTIONS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: textInputs,
    }),
  });

  const payload = (await response.json()) as GeminiInteractionResponse;
  if (!response.ok) {
    const message =
      payload.error?.message ??
      `Gemini image generation failed with status ${response.status}.`;
    console.error("Gemini image generation failed", {
      model,
      status: response.status,
      message,
    });

    return jsonError(
      getClientErrorMessage(response.status, message),
      response.status >= 400 && response.status < 500 ? response.status : 502,
    );
  }

  const outputImage = getOutputImage(payload);
  if (!outputImage?.data) {
    return jsonError("Gemini did not return an image.", 502);
  }

  const mimeType = outputImage.mime_type || OUTPUT_MIME_TYPE;
  return NextResponse.json({
    image: {
      dataUrl: `data:${mimeType};base64,${outputImage.data}`,
      mimeType,
    },
  });
}

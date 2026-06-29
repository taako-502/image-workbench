import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-3-pro-image";
const OUTPUT_MIME_TYPE = "image/jpeg";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const OUTPUT_SIZES = new Set(["1K", "2K", "4K"]);
const MODEL_ENV = "GEMINI_IMAGE_MODEL";
const COMMON_PROMPT_ENV = "GEMINI_COMMON_PROMPT";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

type GeminiApiError = {
  name?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  error?: {
    error?: {
      message?: string;
      code?: string;
    };
    message?: string;
    code?: string;
  };
};

type ParsedGeminiError = {
  status?: number;
  message?: string;
};

function parseGeminiJsonError(message: string): ParsedGeminiError {
  try {
    const parsed = JSON.parse(message) as {
      error?: {
        code?: number;
        message?: string;
      };
    };

    return {
      status: parsed.error?.code,
      message: parsed.error?.message,
    };
  } catch {
    return {};
  }
}

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      cause: error.cause,
    };
  }

  return error;
}

function getGeminiError(error: unknown) {
  const apiError = error as GeminiApiError;
  const rawMessage = apiError.message ?? "Gemini image edit failed.";
  const parsedError = parseGeminiJsonError(rawMessage);
  const status = apiError.status ?? apiError.statusCode ?? parsedError.status;
  const message =
    apiError.error?.error?.message ??
    apiError.error?.message ??
    parsedError.message ??
    rawMessage ??
    "Gemini image edit failed.";

  return { status, message };
}

function getClientErrorMessage(status: number | undefined, message: string) {
  if (status === 401 || status === 403) {
    return "Gemini API authentication failed. Check GEMINI_API_KEY and project permissions.";
  }

  if (status === 429) {
    return "Gemini API quota is exhausted for this key or project. Check quota/billing or try again later.";
  }

  if (status && status >= 400 && status < 500) {
    return message;
  }

  if (message !== "Gemini image edit failed.") {
    return `Gemini image edit failed: ${message}`;
  }

  return "Gemini image edit failed. Check the server logs.";
}

function getTextInputs(prompt: string) {
  const commonPrompt = process.env[COMMON_PROMPT_ENV]?.trim();
  const userPrompt = prompt.trim();

  if (!commonPrompt) {
    return [
      {
        type: "text" as const,
        text: userPrompt,
      },
    ];
  }

  return [
    {
      type: "text" as const,
      text: commonPrompt,
    },
    {
      type: "text" as const,
      text: userPrompt,
    },
  ];
}

function getModel() {
  return process.env[MODEL_ENV]?.trim() || DEFAULT_MODEL;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return jsonError("Request must use multipart/form-data.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Could not read form data.");
  }

  const image = formData.get("image");
  const prompt = formData.get("prompt");
  const size = formData.get("size");

  if (!isFile(image) || image.size === 0) {
    return jsonError("Image is required.");
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    return jsonError("Prompt is required.");
  }

  if (typeof size !== "string" || !OUTPUT_SIZES.has(size)) {
    return jsonError("Output size must be 1K, 2K, or 4K.");
  }

  if (!ACCEPTED_TYPES.has(image.type)) {
    return jsonError("Accepted image types are PNG, JPEG, and WEBP.");
  }

  if (image.size > MAX_FILE_SIZE) {
    return jsonError("Image must be 10MB or smaller.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError("Server is missing GEMINI_API_KEY.", 500);
  }

  try {
    const imageBytes = Buffer.from(await image.arrayBuffer());
    const ai = new GoogleGenAI({ apiKey });
    const model = getModel();
    const interaction = await ai.interactions.create({
      model,
      input: [
        ...getTextInputs(prompt),
        {
          type: "image",
          mime_type: image.type,
          data: imageBytes.toString("base64"),
        },
      ],
      response_format: {
        type: "image",
        mime_type: OUTPUT_MIME_TYPE,
        image_size: size,
      },
    });

    const outputImage = interaction.output_image;
    if (!outputImage?.data) {
      return jsonError("Gemini did not return an edited image.", 502);
    }

    return NextResponse.json({
      image: {
        dataUrl: `data:${OUTPUT_MIME_TYPE};base64,${outputImage.data}`,
        mimeType: OUTPUT_MIME_TYPE,
      },
    });
  } catch (error) {
    const { status, message } = getGeminiError(error);
    console.error("Gemini image edit failed", {
      model: getModel(),
      status,
      message,
      details: getErrorDetails(error),
    });

    return jsonError(
      getClientErrorMessage(status, message),
      status && status >= 400 && status < 500 ? status : 502,
    );
  }
}

import { NextResponse } from "next/server";
import {
  getGeminiImageConfig,
  isOutputImageSize,
  type OutputImageSize,
} from "../geminiImageConfig";
import { getServerEnv, getValueSuffix } from "../geminiEnv";
import {
  LOCAL_SOURCE_IMAGE_DIR,
  readLocalSourceImage,
} from "../localSourceImage";
import {
  getOutputImageMimeType,
  getOutputImageName,
} from "../outputImageFormat";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-3-pro-image-preview";
const OUTPUT_MIME_TYPE = "image/jpeg";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MODEL_ENV = "GEMINI_IMAGE_MODEL";
const COMMON_PROMPT_ENV = "GEMINI_COMMON_PROMPT";
const INTERACTIONS_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

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
    return `Gemini API quota/rate limit error: ${message}`;
  }

  if (status && status >= 400 && status < 500) {
    return message;
  }

  if (message !== "Gemini image edit failed.") {
    return `Gemini image edit failed: ${message}`;
  }

  return "Gemini image edit failed. Check the server logs.";
}

function getCommonPrompt() {
  return getServerEnv(COMMON_PROMPT_ENV);
}

function getTextParts(prompt: string) {
  const commonPrompt = getServerEnv(COMMON_PROMPT_ENV);
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

function getModel() {
  return getServerEnv(MODEL_ENV) || DEFAULT_MODEL;
}

function getOutputImage(response: GeminiInteractionResponse) {
  return response.output_image ?? findImageOutput(response);
}

function findImageOutput(value: unknown): GeminiImageOutput | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const current = value as GeminiImageOutput;
  if (current.type === "image" && current.data) {
    return current;
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const image = findImageOutput(item);
        if (image) {
          return image;
        }
      }
    } else if (child && typeof child === "object") {
      const image = findImageOutput(child);
      if (image) {
        return image;
      }
    }
  }

  return undefined;
}

async function createInteraction({
  apiKey,
  imageData,
  imageMimeType,
  model,
  prompt,
  size,
}: {
  apiKey: string;
  imageData: string;
  imageMimeType: string;
  model: string;
  prompt: string;
  size: OutputImageSize;
}) {
  const imageConfig = getGeminiImageConfig(size);
  const response = await fetch(INTERACTIONS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      generation_config: {
        image_config: imageConfig,
      },
      input: [
        ...getTextParts(prompt),
        {
          type: "image",
          mime_type: imageMimeType,
          data: imageData,
        },
      ],
    }),
  });

  const payload = (await response.json()) as GeminiInteractionResponse;
  if (!response.ok) {
    return {
      error: {
        status: response.status,
        message:
          payload.error?.message ??
          `Gemini image edit failed with status ${response.status}.`,
        details: payload.error,
      },
      imageConfig,
    };
  }

  return { imageConfig, interaction: payload };
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

  const uploadedImage = formData.get("image");
  const prompt = formData.get("prompt");
  const size = formData.get("size");

  const hasCommonPrompt = Boolean(getCommonPrompt());
  if (typeof prompt !== "string" || (!prompt.trim() && !hasCommonPrompt)) {
    return jsonError(`Prompt is required unless ${COMMON_PROMPT_ENV} is set.`);
  }

  if (!isOutputImageSize(size)) {
    return jsonError("Output size must be 1K, 2K, or 4K.");
  }

  let imageData: string;
  let imageMimeType: string;
  let sourceImageName: string;

  if (isFile(uploadedImage) && uploadedImage.size > 0) {
    if (!ACCEPTED_TYPES.has(uploadedImage.type)) {
      return jsonError("Accepted image types are PNG, JPEG, and WEBP.");
    }

    if (uploadedImage.size > MAX_FILE_SIZE) {
      return jsonError("Image must be 10MB or smaller.");
    }

    imageData = Buffer.from(await uploadedImage.arrayBuffer()).toString("base64");
    imageMimeType = uploadedImage.type;
    sourceImageName = uploadedImage.name;
  } else {
    const localSourceImage = await readLocalSourceImage();
    if (!localSourceImage) {
      return jsonError(
        `Image is required. Upload an image or add one to ${LOCAL_SOURCE_IMAGE_DIR}/.`,
      );
    }

    if (!ACCEPTED_TYPES.has(localSourceImage.mimeType)) {
      return jsonError("Accepted image types are PNG, JPEG, and WEBP.");
    }

    if (localSourceImage.size > MAX_FILE_SIZE) {
      return jsonError(
        `Local source image must be 10MB or smaller: ${localSourceImage.fileName}`,
      );
    }

    imageData = localSourceImage.bytes.toString("base64");
    imageMimeType = localSourceImage.mimeType;
    sourceImageName = `${LOCAL_SOURCE_IMAGE_DIR}/${localSourceImage.fileName}`;
  }

  const apiKey = getServerEnv("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonError("Server is missing GEMINI_API_KEY.", 500);
  }

  try {
    const model = getModel();
    const result = await createInteraction({
      apiKey,
      imageData,
      imageMimeType,
      model,
      prompt,
      size,
    });

    if (result.error) {
      console.error("Gemini image edit failed", {
        model,
        imageConfig: result.imageConfig,
        apiKeySuffix: getValueSuffix(apiKey),
        status: result.error.status,
        message: result.error.message,
        sourceImage: sourceImageName,
      });

      return jsonError(
        getClientErrorMessage(result.error.status, result.error.message),
        result.error.status >= 400 && result.error.status < 500
          ? result.error.status
          : 502,
      );
    }

    const outputImage = getOutputImage(result.interaction);
    if (!outputImage?.data) {
      return jsonError("Gemini did not return an edited image.", 502);
    }
    const mimeType = outputImage.mime_type || OUTPUT_MIME_TYPE;

    return NextResponse.json({
      image: {
        dataUrl: `data:${mimeType};base64,${outputImage.data}`,
        downloadBaseName: getOutputImageName(),
        downloadMimeType: getOutputImageMimeType(),
        mimeType,
      },
    });
  } catch (error) {
    const { status, message } = getGeminiError(error);
    console.error("Gemini image edit failed", {
      model: getModel(),
      apiKeySuffix: getValueSuffix(apiKey),
      status,
      message,
      sourceImage: sourceImageName,
      details: getErrorDetails(error),
    });

    return jsonError(
      getClientErrorMessage(status, message),
      status && status >= 400 && status < 500 ? status : 502,
    );
  }
}

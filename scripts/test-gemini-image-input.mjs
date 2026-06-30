import { readFile } from "node:fs/promises";
import path from "node:path";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_PROMPT =
  "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation";

function parseEnv(contents) {
  const env = {};

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, "");
  }

  return env;
}

async function loadEnv() {
  try {
    return parseEnv(await readFile(".env", "utf8"));
  } catch {
    return {};
  }
}

function findImageOutput(value) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (value.type === "image" && value.data) {
    return value;
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

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  throw new Error("Use a .jpg, .jpeg, .png, or .webp image.");
}

async function main() {
  const imagePath = process.argv[2];
  const prompt = process.argv[3] || DEFAULT_PROMPT;
  const env = await loadEnv();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model = env.GEMINI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

  if (!imagePath) {
    throw new Error(
      "Usage: yarn test:image-input /path/to/image.jpg \"optional prompt\"",
    );
  }

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from the environment or .env.");
  }

  const imageBytes = await readFile(imagePath);
  const mimeType = getMimeType(imagePath);

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image",
          mime_type: mimeType,
          data: imageBytes.toString("base64"),
        },
      ],
    }),
  });

  const text = await response.text();
  console.log(`status: ${response.status}`);
  console.log(`model: ${model}`);
  console.log(`api key suffix: ${apiKey.slice(-8)}`);

  if (!response.ok) {
    console.log(text);
    process.exit(1);
  }

  const payload = JSON.parse(text);
  const outputImage = findImageOutput(payload);
  console.log(outputImage?.data ? "image: returned" : "image: not returned");
  if (!outputImage?.data) {
    console.log(JSON.stringify(payload, null, 2).slice(0, 2000));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

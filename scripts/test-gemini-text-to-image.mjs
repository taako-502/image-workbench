import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getGeminiImageConfig } from "./gemini-image-config.mjs";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const DEFAULT_MODEL = "gemini-3.1-flash-image";
const DEFAULT_OUTPUT = "tmp/gemini-text-to-image-output.jpg";

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

function getOutputImage(payload) {
  return payload.output_image ?? findImageOutput(payload);
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

async function main() {
  const prompt = process.argv[2];
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;
  const env = await loadEnv();
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const model = env.GEMINI_IMAGE_MODEL || process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
  const imageConfig = getGeminiImageConfig(env);

  if (!prompt) {
    throw new Error(
      'Usage: yarn test:text-to-image "Create a picture of..." [output.jpg]',
    );
  }

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from the environment or .env.");
  }

  const response = await fetch(ENDPOINT, {
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
        {
          type: "text",
          text: prompt,
        },
      ],
    }),
  });

  const payload = await response.json();
  console.log(`status: ${response.status}`);
  console.log(`model: ${model}`);
  console.log(`image config: ${JSON.stringify(imageConfig)}`);
  console.log(`api key suffix: ${apiKey.slice(-8)}`);

  if (!response.ok) {
    console.log(JSON.stringify(payload));
    process.exit(1);
  }

  const outputImage = getOutputImage(payload);
  if (!outputImage?.data) {
    console.log(JSON.stringify(payload, null, 2).slice(0, 2000));
    throw new Error("Gemini did not return an image.");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(outputImage.data, "base64"));
  console.log(`saved: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

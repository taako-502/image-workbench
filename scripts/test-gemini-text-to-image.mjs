import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
  return (
    payload.output_image ??
    payload.outputs?.find((output) => output.type === "image" && output.data)
  );
}

async function main() {
  const prompt = process.argv[2];
  const outputPath = process.argv[3] || DEFAULT_OUTPUT;
  const env = await loadEnv();
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;

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
  console.log(`api key suffix: ${apiKey.slice(-8)}`);

  if (!response.ok) {
    console.log(JSON.stringify(payload));
    process.exit(1);
  }

  const outputImage = getOutputImage(payload);
  if (!outputImage?.data) {
    console.log(JSON.stringify(payload));
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

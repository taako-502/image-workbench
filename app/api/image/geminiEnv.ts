import { readFileSync } from "node:fs";
import path from "node:path";

function parseEnv(contents: string) {
  const env: Record<string, string> = {};

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

function getDotEnv() {
  try {
    return parseEnv(readFileSync(path.join(process.cwd(), ".env"), "utf8"));
  } catch {
    return {};
  }
}

export function getServerEnv(name: string) {
  return getDotEnv()[name]?.trim() || process.env[name]?.trim() || "";
}

export function getValueSuffix(value: string) {
  return value ? value.slice(-8) : "(missing)";
}

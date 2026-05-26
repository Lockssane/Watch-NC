import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..", "..");
const envPath = path.join(rootDir, ".env");

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const separator = trimmed.indexOf("=");
  if (separator < 1) return null;
  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadDotEnv() {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const entry = parseEnvLine(line);
    if (!entry || process.env[entry.key] !== undefined) continue;
    process.env[entry.key] = entry.value;
  }
}

loadDotEnv();

function boolEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function listEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  host: process.env.AIS_RELAY_HOST || "127.0.0.1",
  port: Number(process.env.AIS_RELAY_PORT || 8790),
  defaultSource: process.env.AIS_SOURCE || "auto",
  defaultScope: process.env.AIS_SCOPE || "nc",
  aisstream: {
    apiKey: process.env.AISSTREAM_API_KEY || "",
    upstreamUrl: process.env.AISSTREAM_URL || "wss://stream.aisstream.io/v0/stream",
    allowInsecureTls: boolEnv("AIS_RELAY_INSECURE_TLS", false),
  },
  aishub: {
    apiKey: process.env.AISHUB_API_KEY || "",
    endpoint: process.env.AISHUB_ENDPOINT || "",
  },
  aiscatcher: {
    host: process.env.AISCATCHER_HOST || "127.0.0.1",
    port: Number(process.env.AISCATCHER_PORT || 10110),
  },
  cors: {
    allowedOrigins: listEnv("AIS_RELAY_ALLOWED_ORIGINS", [
      "http://127.0.0.1:8787",
      "http://127.0.0.1:8788",
      "http://localhost:8787",
      "http://localhost:8788",
    ]),
  },
};

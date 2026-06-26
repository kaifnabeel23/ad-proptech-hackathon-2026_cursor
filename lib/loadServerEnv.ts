import { existsSync, readFileSync } from "fs";
import { join } from "path";

/** Prevent accidental client-side import. */
if (typeof window !== "undefined") {
  throw new Error("@/lib/loadServerEnv must only be used on the server");
}

/**
 * Load .env files into process.env for missing keys only (server-side).
 * Never logs values. Helps when OPENROUTER_API_KEY lives in parent .env.
 */
export function loadServerEnv(): void {
  const root = process.cwd();
  const candidates = [
    join(root, ".env.local"),
    join(root, ".env"),
    join(root, "..", ".env"),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;

    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const eq = trimmed.indexOf("=");
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

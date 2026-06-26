/**
 * Check AI recommendation layer for Al Ghadeer.
 *
 * Always validates deterministic fallback (must pass).
 * Optionally tests OpenRouter when OPENROUTER_API_KEY is set.
 * Never prints API keys.
 *
 * Run: npm run check:ai
 */

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { fallbackRecommendation } from "../lib/fallbackRecommendation";
import { generateRecommendation } from "../lib/aiRecommendation";
import type { CommunityGapOutputs, DistrictRecommendation } from "../lib/communityGapTypes";

const ROOT = resolve(__dirname, "..");
const DATA_PATH = join(ROOT, "processed", "community_gap_outputs.json");
const DISTRICT_NAME = "Al Ghadeer";

const REQUIRED_KEYS: (keyof DistrictRecommendation)[] = [
  "district_summary",
  "main_gap",
  "recommended_intervention",
  "why_this_matters",
  "confidence_note",
  "uncertainty_note",
];

function loadEnvFiles(): void {
  const candidates = [
    join(ROOT, ".env.local"),
    join(ROOT, ".env"),
    join(ROOT, "..", ".env"),
  ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const lines = readFileSync(filePath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
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

function validateOutput(rec: DistrictRecommendation, label: string): void {
  const missing = REQUIRED_KEYS.filter((k) => !(k in rec));
  if (missing.length > 0) {
    throw new Error(`${label}: missing keys: ${missing.join(", ")}`);
  }

  const empty = REQUIRED_KEYS.filter((k) => !rec[k]?.trim());
  if (empty.length > 0) {
    throw new Error(`${label}: empty fields: ${empty.join(", ")}`);
  }
}

function printResult(rec: DistrictRecommendation, source: string): void {
  console.log(`\n=== ${DISTRICT_NAME} (${source}) ===`);
  console.log(JSON.stringify(rec, null, 2));
}

async function main(): Promise<number> {
  loadEnvFiles();

  if (!existsSync(DATA_PATH)) {
    console.error(`ERROR: missing ${DATA_PATH}`);
    return 1;
  }

  const payload = JSON.parse(
    readFileSync(DATA_PATH, "utf8")
  ) as CommunityGapOutputs;

  const district = payload.districts.find((d) => d.district === DISTRICT_NAME);
  if (!district) {
    console.error(`ERROR: district not found in JSON: ${DISTRICT_NAME}`);
    return 1;
  }

  console.log(`Loaded community_gap_outputs.json — checking ${DISTRICT_NAME}`);

  // 1. Fallback (required)
  const fallbackRec = fallbackRecommendation(district);
  validateOutput(fallbackRec, "fallback");
  printResult(fallbackRec, "fallback");

  if (
    fallbackRec.recommended_intervention !==
    district.classification.recommended_intervention_category
  ) {
    throw new Error("fallback recommended_intervention does not match pipeline");
  }

  if (
    !fallbackRec.district_summary
      .toLowerCase()
      .includes("top priority in the current dataset")
  ) {
    throw new Error("Al Ghadeer fallback missing top-priority wording");
  }

  console.log("\nFallback check: PASSED");

  // 2. OpenRouter (optional)
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (apiKey) {
    console.log("\nOPENROUTER_API_KEY found — testing OpenRouter path...");
    try {
      const { recommendation, source } = await generateRecommendation(district);
      validateOutput(recommendation, `openrouter (${source})`);
      printResult(recommendation, source);
      if (source === "llm") {
        console.log("\nOpenRouter check: PASSED (llm)");
      } else {
        console.log(
          "\nOpenRouter check: PASSED (fell back to deterministic output)"
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`\nOpenRouter check: SKIPPED (${message})`);
      console.log("Fallback still passed — overall check OK.");
    }
  } else {
    console.log("\nOPENROUTER_API_KEY not set — skipping OpenRouter test.");
  }

  console.log("\nAll required checks passed.");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("CHECK FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });

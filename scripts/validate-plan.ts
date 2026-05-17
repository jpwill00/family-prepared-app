#!/usr/bin/env tsx
/**
 * Validates plan/*.yaml files against the app's Zod schemas.
 * Exit 0 if all valid (or no files found), exit 1 on validation errors.
 *
 * Usage: pnpm run validate-plan
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import yaml from "js-yaml";
import { z } from "zod";

// Import schemas directly (relative path from scripts/ to src/)
import {
  HouseholdSchema,
  CommunicationPlanSchema,
  EvacuationPlanSchema,
  ResourceInventorySchema,
  LegalDocumentsSchema,
  UtilityShutoffsSchema,
} from "../src/lib/schemas/plan.js";

const PLAN_DIR = resolve(import.meta.dirname, "..", "plan");

const SCHEMA_MAP: Record<string, z.ZodSchema> = {
  "household.yaml": HouseholdSchema,
  "communications.yaml": CommunicationPlanSchema,
  "evacuation.yaml": EvacuationPlanSchema,
  "inventory.yaml": ResourceInventorySchema,
  "documents.yaml": LegalDocumentsSchema,
  "utilities.yaml": UtilityShutoffsSchema,
};

interface ValidationResult {
  file: string;
  valid: boolean;
  errors?: string[];
}

function validatePlan(): ValidationResult[] {
  if (!existsSync(PLAN_DIR)) {
    console.log("ℹ  No plan/ directory found. Nothing to validate.");
    return [];
  }

  const files = readdirSync(PLAN_DIR).filter((f) => f.endsWith(".yaml"));
  if (files.length === 0) {
    console.log("ℹ  No .yaml files in plan/. Nothing to validate.");
    return [];
  }

  const results: ValidationResult[] = [];

  for (const file of files) {
    const schema = SCHEMA_MAP[file];
    if (!schema) {
      results.push({
        file,
        valid: false,
        errors: [
          `Unknown plan file. Expected one of: ${Object.keys(SCHEMA_MAP).join(", ")}`,
        ],
      });
      continue;
    }

    const filePath = join(PLAN_DIR, file);
    const raw = readFileSync(filePath, "utf-8");

    let parsed: unknown;
    try {
      parsed = yaml.load(raw);
    } catch (err) {
      results.push({
        file,
        valid: false,
        errors: [
          `YAML syntax error: ${err instanceof Error ? err.message : String(err)}`,
        ],
      });
      continue;
    }

    const result = schema.safeParse(parsed);
    if (result.success) {
      results.push({ file, valid: true });
    } else {
      const errors = result.error.issues.map(
        (issue) => `  ${issue.path.join(".")}: ${issue.message}`
      );
      results.push({ file, valid: false, errors });
    }
  }

  return results;
}

// --- Main ---
const results = validatePlan();
let hasErrors = false;

for (const r of results) {
  if (r.valid) {
    console.log(`✓ ${r.file}`);
  } else {
    hasErrors = true;
    console.error(`✗ ${r.file}`);
    for (const err of r.errors ?? []) {
      console.error(err);
    }
  }
}

if (results.length > 0 && !hasErrors) {
  console.log(`\n✓ All ${results.length} plan file(s) valid.`);
}

process.exit(hasErrors ? 1 : 0);

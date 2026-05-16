import yaml from "js-yaml";
import {
  HouseholdSchema,
  CommunicationPlanSchema,
  EvacuationPlanSchema,
  ResourceInventorySchema,
  LegalDocumentsSchema,
  UtilityShutoffsSchema,
} from "@/lib/schemas/plan";
import type {
  Household,
  CommunicationPlan,
  EvacuationPlan,
  ResourceInventory,
  LegalDocuments,
  UtilityShutoffs,
} from "@/types/plan";
import type { ZodSchema } from "zod";

// ---------------------------------------------------------------------------
// Core primitives
// ---------------------------------------------------------------------------

export function serializeYaml(value: unknown): string {
  return yaml.dump(value, { lineWidth: 120, noRefs: true });
}

function parseAndValidate<T>(raw: string, schema: ZodSchema<T>, label: string): T {
  const parsed = yaml.load(raw);
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`YAML parse error in ${label}: ${result.error.message}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Per-zone serializers
// ---------------------------------------------------------------------------

export function serializeHousehold(data: Household): string {
  return serializeYaml(data);
}

export function parseHousehold(raw: string): Household {
  return parseAndValidate(raw, HouseholdSchema, "household");
}

export function serializeCommunicationPlan(data: CommunicationPlan): string {
  return serializeYaml(data);
}

export function parseCommunicationPlan(raw: string): CommunicationPlan {
  return parseAndValidate(raw, CommunicationPlanSchema, "communicationPlan");
}

export function serializeEvacuationPlan(data: EvacuationPlan): string {
  return serializeYaml(data);
}

export function parseEvacuationPlan(raw: string): EvacuationPlan {
  return parseAndValidate(raw, EvacuationPlanSchema, "evacuationPlan");
}

export function serializeResourceInventory(data: ResourceInventory): string {
  return serializeYaml(data);
}

export function parseResourceInventory(raw: string): ResourceInventory {
  return parseAndValidate(raw, ResourceInventorySchema, "resourceInventory");
}

export function serializeLegalDocuments(data: LegalDocuments): string {
  return serializeYaml(data);
}

export function parseLegalDocuments(raw: string): LegalDocuments {
  return parseAndValidate(raw, LegalDocumentsSchema, "legalDocuments");
}

export function serializeUtilityShutoffs(data: UtilityShutoffs): string {
  return serializeYaml(data);
}

export function parseUtilityShutoffs(raw: string): UtilityShutoffs {
  return parseAndValidate(raw, UtilityShutoffsSchema, "utilityShutoffs");
}

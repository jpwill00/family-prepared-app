import { z } from "zod";

// Marker shape for fields that will be encrypted in Sprint 3.
// The `secure` field is metadata only — not persisted in the value itself.
export const SecureString = z.object({
  value: z.string(),
  secure: z.literal(true),
});

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

export const HouseholdMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  role: z.string().optional(),
  dateOfBirth: z
    .object({ value: z.string(), secure: z.literal(true) })
    .optional(),
  ssn: z.object({ value: z.string(), secure: z.literal(true) }).optional(),
  medicalNotes: z.string().optional(),
  dietary: z.string().optional(),
  photoRef: z.string().optional(),
});

export const HouseholdSchema = z.object({
  schemaVersion: z.literal(1),
  members: z.array(HouseholdMemberSchema),
  petCount: z.number().int().nonnegative().optional(),
  homeAddress: z.string().optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// PACE communication plan
// ---------------------------------------------------------------------------

export const PaceMethodSchema = z.object({
  method: z.string().min(1),
  contact: z.string().optional(),
  notes: z.string().optional(),
});

export const CommunicationPlanSchema = z.object({
  schemaVersion: z.literal(1),
  outOfTownContact: z
    .object({ name: z.string(), phone: z.string(), relation: z.string().optional() })
    .optional(),
  primary: PaceMethodSchema,
  alternate: PaceMethodSchema,
  contingency: PaceMethodSchema,
  emergency: PaceMethodSchema,
  radioFrequency: z.string().optional(),
  meetingWord: z
    .object({ value: z.string(), secure: z.literal(true) })
    .optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Evacuation plan
// ---------------------------------------------------------------------------

export const RendezvousPointSchema = z.object({
  label: z.string().min(1),
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  notes: z.string().optional(),
});

export const EvacuationRouteSchema = z.object({
  label: z.string().min(1),
  description: z.string().optional(),
  destinationAddress: z.string().optional(),
});

export const EvacuationPlanSchema = z.object({
  schemaVersion: z.literal(1),
  primaryRoute: EvacuationRouteSchema,
  alternateRoute: EvacuationRouteSchema.optional(),
  rendezvousPoints: z.array(RendezvousPointSchema),
  outOfAreaContact: z
    .object({ name: z.string(), phone: z.string() })
    .optional(),
  specialNeeds: z.string().optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Resource inventory (go-bag, water, medications)
// ---------------------------------------------------------------------------

export const InventoryItemSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(["go-bag", "water", "food", "medication", "equipment", "other"]),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  expirationDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  // medication dosage is sensitive
  dosage: z
    .object({ value: z.string(), secure: z.literal(true) })
    .optional(),
});

export const ResourceInventorySchema = z.object({
  schemaVersion: z.literal(1),
  waterGallonsPerPersonPerDay: z.number().positive().optional(),
  items: z.array(InventoryItemSchema),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Legal documents
// ---------------------------------------------------------------------------

export const LegalDocumentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    "passport",
    "birth-certificate",
    "drivers-license",
    "insurance",
    "will",
    "medical-power-of-attorney",
    "deed",
    "vehicle-title",
    "other",
  ]),
  owner: z.string().optional(),
  location: z.string().optional(),
  fileRef: z.string().optional(),
  // scanned payload / account numbers are sensitive
  payload: z
    .object({ value: z.string(), secure: z.literal(true) })
    .optional(),
  expirationDate: z.string().optional(),
  notes: z.string().optional(),
});

export const LegalDocumentsSchema = z.object({
  schemaVersion: z.literal(1),
  documents: z.array(LegalDocumentSchema),
  safeLocation: z
    .object({ value: z.string(), secure: z.literal(true) })
    .optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Utility shutoffs
// ---------------------------------------------------------------------------

export const UtilityShutoffSchema = z.object({
  id: z.string().uuid(),
  utility: z.enum(["water", "gas", "electric", "other"]),
  location: z.string().min(1),
  instructions: z.string().optional(),
  photoRef: z.string().optional(),
  toolRequired: z.string().optional(),
});

export const UtilityShutoffsSchema = z.object({
  schemaVersion: z.literal(1),
  shutoffs: z.array(UtilityShutoffSchema),
  utilityProvider: z
    .object({
      water: z.string().optional(),
      gas: z.string().optional(),
      electric: z.string().optional(),
    })
    .optional(),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

// ---------------------------------------------------------------------------
// Top-level repo schema (the full in-memory model)
// ---------------------------------------------------------------------------

export const RepoSchema = z.object({
  schemaVersion: z.literal(1),
  household: HouseholdSchema.optional(),
  communicationPlan: CommunicationPlanSchema.optional(),
  evacuationPlan: EvacuationPlanSchema.optional(),
  resourceInventory: ResourceInventorySchema.optional(),
  legalDocuments: LegalDocumentsSchema.optional(),
  utilityShutoffs: UtilityShutoffsSchema.optional(),
});

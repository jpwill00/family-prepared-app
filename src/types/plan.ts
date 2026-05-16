import { z } from "zod";
import {
  HouseholdSchema,
  HouseholdMemberSchema,
  CommunicationPlanSchema,
  PaceMethodSchema,
  EvacuationPlanSchema,
  EvacuationRouteSchema,
  RendezvousPointSchema,
  ResourceInventorySchema,
  InventoryItemSchema,
  LegalDocumentsSchema,
  LegalDocumentSchema,
  UtilityShutoffsSchema,
  UtilityShutoffSchema,
  RepoSchema,
  SecureString,
} from "@/lib/schemas/plan";

export type SecureString = z.infer<typeof SecureString>;

export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type Household = z.infer<typeof HouseholdSchema>;

export type PaceMethod = z.infer<typeof PaceMethodSchema>;
export type CommunicationPlan = z.infer<typeof CommunicationPlanSchema>;

export type RendezvousPoint = z.infer<typeof RendezvousPointSchema>;
export type EvacuationRoute = z.infer<typeof EvacuationRouteSchema>;
export type EvacuationPlan = z.infer<typeof EvacuationPlanSchema>;

export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type ResourceInventory = z.infer<typeof ResourceInventorySchema>;

export type LegalDocument = z.infer<typeof LegalDocumentSchema>;
export type LegalDocuments = z.infer<typeof LegalDocumentsSchema>;

export type UtilityShutoff = z.infer<typeof UtilityShutoffSchema>;
export type UtilityShutoffs = z.infer<typeof UtilityShutoffsSchema>;

export type Repo = z.infer<typeof RepoSchema>;

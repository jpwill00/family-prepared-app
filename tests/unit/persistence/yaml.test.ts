import { describe, it, expect } from "vitest";
import {
  serializeHousehold,
  parseHousehold,
  serializeCommunicationPlan,
  parseCommunicationPlan,
  serializeEvacuationPlan,
  parseEvacuationPlan,
  serializeResourceInventory,
  parseResourceInventory,
  serializeLegalDocuments,
  parseLegalDocuments,
  serializeUtilityShutoffs,
  parseUtilityShutoffs,
} from "@/lib/persistence/yaml";
import type {
  Household,
  CommunicationPlan,
  EvacuationPlan,
  ResourceInventory,
  LegalDocuments,
  UtilityShutoffs,
} from "@/types/plan";

// ---------------------------------------------------------------------------
// Household
// ---------------------------------------------------------------------------

const household: Household = {
  schemaVersion: 1,
  members: [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Jane Smith",
      role: "primary adult",
      dateOfBirth: { value: "1985-06-15", secure: true },
      ssn: { value: "123-45-6789", secure: true },
      medicalNotes: "EpiPen required",
      dietary: "vegetarian",
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Leo Smith",
      role: "child",
    },
  ],
  homeAddress: "123 Main St, Springfield, OR 97477",
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("household round-trip", () => {
  it("serializes and parses back to identical data", () => {
    const yaml = serializeHousehold(household);
    expect(typeof yaml).toBe("string");
    expect(yaml).toContain("Jane Smith");

    const parsed = parseHousehold(yaml);
    expect(parsed).toEqual(household);
  });

  it("throws on invalid data", () => {
    expect(() => parseHousehold("schemaVersion: 2\nmembers: []")).toThrow();
  });

  it("handles colon-in-value without truncation", () => {
    const data: Household = {
      schemaVersion: 1,
      members: [],
      homeAddress: "Building A: Unit 42, Portland, OR",
    };
    const parsed = parseHousehold(serializeHousehold(data));
    expect(parsed.homeAddress).toBe("Building A: Unit 42, Portland, OR");
  });
});

// ---------------------------------------------------------------------------
// CommunicationPlan
// ---------------------------------------------------------------------------

const communicationPlan: CommunicationPlan = {
  schemaVersion: 1,
  outOfTownContact: { name: "Aunt Carol", phone: "541-555-0100", relation: "aunt" },
  primary: { method: "Cell phone", contact: "Jane: 541-555-0200" },
  alternate: { method: "Text message", contact: "Jane: 541-555-0200" },
  contingency: { method: "GMRS radio", notes: "Channel 15, tone 0" },
  emergency: { method: "Landline at school", contact: "Springfield Elementary: 541-555-0300" },
  radioFrequency: "462.5500",
  meetingWord: { value: "sunflower", secure: true },
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("communicationPlan round-trip", () => {
  it("serializes and parses back to identical data", () => {
    const yaml = serializeCommunicationPlan(communicationPlan);
    const parsed = parseCommunicationPlan(yaml);
    expect(parsed).toEqual(communicationPlan);
  });

  it("preserves all four PACE tiers", () => {
    const parsed = parseCommunicationPlan(serializeCommunicationPlan(communicationPlan));
    expect(parsed.primary.method).toBe("Cell phone");
    expect(parsed.alternate.method).toBe("Text message");
    expect(parsed.contingency.method).toBe("GMRS radio");
    expect(parsed.emergency.method).toBe("Landline at school");
  });

  it("throws on invalid data", () => {
    expect(() => parseCommunicationPlan("schemaVersion: 1\nprimary: null")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// EvacuationPlan
// ---------------------------------------------------------------------------

const evacuationPlan: EvacuationPlan = {
  schemaVersion: 1,
  primaryRoute: {
    label: "North via I-5",
    description: "Take I-5 north to exit 194, then Highway 126 east",
    destinationAddress: "456 Oak Ave, Eugene, OR 97401",
  },
  alternateRoute: {
    label: "East via Highway 126",
    description: "Highway 126 east to Sisters, OR",
  },
  rendezvousPoints: [
    {
      label: "Springfield Library",
      address: "225 5th St, Springfield, OR 97477",
      lat: 44.0462,
      lng: -123.0224,
      notes: "Meet at the main entrance",
    },
  ],
  outOfAreaContact: { name: "Uncle Bob", phone: "541-555-0400" },
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("evacuationPlan round-trip", () => {
  it("serializes and parses back to identical data", () => {
    const yaml = serializeEvacuationPlan(evacuationPlan);
    const parsed = parseEvacuationPlan(yaml);
    expect(parsed).toEqual(evacuationPlan);
  });

  it("preserves rendezvous point coordinates", () => {
    const parsed = parseEvacuationPlan(serializeEvacuationPlan(evacuationPlan));
    expect(parsed.rendezvousPoints[0].lat).toBe(44.0462);
    expect(parsed.rendezvousPoints[0].lng).toBe(-123.0224);
  });
});

// ---------------------------------------------------------------------------
// ResourceInventory
// ---------------------------------------------------------------------------

const resourceInventory: ResourceInventory = {
  schemaVersion: 1,
  waterGallonsPerPersonPerDay: 1,
  items: [
    {
      id: "00000000-0000-0000-0000-000000000010",
      category: "water",
      name: "7-gallon water barrel",
      quantity: 4,
      unit: "barrels",
      location: "garage shelf",
      expirationDate: "2027-01-01",
    },
    {
      id: "00000000-0000-0000-0000-000000000011",
      category: "medication",
      name: "EpiPen",
      quantity: 2,
      unit: "units",
      dosage: { value: "0.3mg IM, repeat once after 5 min if needed", secure: true },
      expirationDate: "2026-12-01",
    },
  ],
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("resourceInventory round-trip", () => {
  it("serializes and parses back to identical data", () => {
    const yaml = serializeResourceInventory(resourceInventory);
    const parsed = parseResourceInventory(yaml);
    expect(parsed).toEqual(resourceInventory);
  });

  it("preserves secure dosage field", () => {
    const parsed = parseResourceInventory(serializeResourceInventory(resourceInventory));
    expect(parsed.items[1].dosage?.secure).toBe(true);
    expect(parsed.items[1].dosage?.value).toContain("0.3mg");
  });
});

// ---------------------------------------------------------------------------
// LegalDocuments
// ---------------------------------------------------------------------------

const legalDocuments: LegalDocuments = {
  schemaVersion: 1,
  documents: [
    {
      id: "00000000-0000-0000-0000-000000000020",
      type: "passport",
      owner: "Jane Smith",
      location: "fireproof safe",
      expirationDate: "2030-06-15",
    },
    {
      id: "00000000-0000-0000-0000-000000000021",
      type: "insurance",
      owner: "Smith Family",
      payload: { value: "Policy #: ABC-12345-X", secure: true },
      location: "filing cabinet drawer 2",
    },
  ],
  safeLocation: { value: "Master closet, top shelf behind winter coats", secure: true },
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("legalDocuments round-trip", () => {
  it("serializes and parses back to identical data", () => {
    const yaml = serializeLegalDocuments(legalDocuments);
    const parsed = parseLegalDocuments(yaml);
    expect(parsed).toEqual(legalDocuments);
  });

  it("preserves secure safeLocation field", () => {
    const parsed = parseLegalDocuments(serializeLegalDocuments(legalDocuments));
    expect(parsed.safeLocation?.secure).toBe(true);
    expect(parsed.safeLocation?.value).toContain("Master closet");
  });
});

// ---------------------------------------------------------------------------
// UtilityShutoffs
// ---------------------------------------------------------------------------

const utilityShutoffs: UtilityShutoffs = {
  schemaVersion: 1,
  shutoffs: [
    {
      id: "00000000-0000-0000-0000-000000000030",
      utility: "gas",
      location: "Left side of house, behind azalea bush",
      instructions: "Turn the valve 90° clockwise with a crescent wrench",
      toolRequired: "crescent wrench",
    },
    {
      id: "00000000-0000-0000-0000-000000000031",
      utility: "water",
      location: "Meter box at curb, street-side of front yard",
      instructions: "Turn handle clockwise until perpendicular to pipe",
    },
    {
      id: "00000000-0000-0000-0000-000000000032",
      utility: "electric",
      location: "Main panel in garage, east wall",
      instructions: "Flip main breaker (top, labeled MAIN) to OFF",
    },
  ],
  utilityProvider: {
    gas: "NW Natural",
    water: "Springfield Utility Board",
    electric: "EWEB",
  },
  updatedAt: "2026-05-01T12:00:00Z",
};

describe("utilityShutoffs round-trip", () => {
  it("serializes and parses back to identical data", () => {
    const yaml = serializeUtilityShutoffs(utilityShutoffs);
    const parsed = parseUtilityShutoffs(yaml);
    expect(parsed).toEqual(utilityShutoffs);
  });

  it("preserves all three utility types", () => {
    const parsed = parseUtilityShutoffs(serializeUtilityShutoffs(utilityShutoffs));
    const types = parsed.shutoffs.map((s) => s.utility);
    expect(types).toContain("gas");
    expect(types).toContain("water");
    expect(types).toContain("electric");
  });
});

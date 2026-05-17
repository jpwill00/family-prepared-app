# Building Your Family Prep Plan with Claude Code

This guide shows how to use Claude Code (AI assistant) to collaboratively build your
family emergency preparedness plan. Claude writes structured data files that sync to
Google Drive, where your family accesses them via the PWA on their phones.

## Prerequisites

1. **Claude Code** installed (CLI, desktop app, or IDE extension)
2. This repo cloned locally: `git clone https://github.com/jpwill00/family-prepared-app.git`
3. Dependencies installed: `cd family-prepared-app && pnpm install`
4. `.env.local` with your `VITE_GOOGLE_CLIENT_ID` (see `.env.example`)

## How It Works

```
You talk to Claude → Claude writes plan/*.yaml → sync script → Google Drive → Family's PWA
```

1. You describe your family's situation in natural language
2. Claude creates structured YAML files in the `plan/` directory
3. You run `pnpm run sync-plan` to push a snapshot to Google Drive
4. Family members open the PWA on their phones and tap "Restore latest"

## Getting Started: Your First Plan

Open Claude Code in this project directory and have a conversation like this:

### Step 1: Household

> "We're a family of 4 in Seattle at 1234 Pine St. Two adults — Jordan (age 40, no
> medical issues) and Alex (38, needs daily thyroid medication). Two kids — Sam (12)
> and Pat (8, peanut allergy). We have a dog named Buddy."

Claude will create `plan/household.yaml` with all members, address, medical notes,
dietary restrictions, and pet count.

### Step 2: Communications (PACE)

> "Our primary comms is cell phones — we have a family group text. Alternate is our
> Signal group chat. Contingency is ham radio on 146.52 MHz (I have a Baofeng UV-5R,
> range about 2 miles). Emergency is leaving a physical note in a ziplock at Gasworks
> Park south entrance bench. Our out-of-town contact is Uncle Jim at 555-0199."

Claude will create `plan/communications.yaml` with all four PACE tiers populated.

### Step 3: Evacuation

> "Primary evacuation route is north on I-5 to Everett (Aunt Sarah's house, 2200 Oak Ave).
> Alternate is east on I-90 to Issaquah (cousin Mike's). Rally point is Gasworks Park
> (47.6456, -122.3344). Second rally point is our kids' school (Maple Elementary).
> Our out-of-area contact is Uncle Jim in Portland."

Claude will create `plan/evacuation.yaml` with routes, rendezvous points, and contacts.

### Step 4: Inventory

> "In our go-bag: 3 days of water (1 gallon/person/day), Mountain House freeze-dried
> meals (expires 2028-06), first aid kit, flashlight + batteries, portable radio, copies
> of IDs. Medications: Alex's levothyroxine 75mcg daily (30-day supply, expires 2026-12).
> Pat's EpiPen (expires 2027-03). We also have 10 gallons of stored water in the garage."

Claude will create `plan/inventory.yaml` with categorized items and expiration dates.

### Step 5: Documents

> "Important docs: passports in the fireproof safe in the office closet. Insurance policy
> (State Farm, number SF-12345) in the same safe. Will and medical power of attorney at
> our attorney's office (Johnson Law, 555-0200). Vehicle titles in the filing cabinet."

Claude will create `plan/documents.yaml` with document references and locations.

### Step 6: Utilities

> "Water shutoff: front yard near the sidewalk, needs a meter key (in the garage on the
> tool wall). Gas shutoff: right side of house by the meter, needs a crescent wrench.
> Electric: main panel in the basement, flip the main breaker. Our providers are Seattle
> City Light (electric), PSE (gas), Seattle Public Utilities (water)."

Claude will create `plan/utilities.yaml` with shutoff locations, tools, and providers.

## Validate and Sync

After Claude writes the files, validate them:

```bash
pnpm run validate-plan
```

If everything passes, push to Drive:

```bash
pnpm run sync-plan
```

First time, it will prompt you to authorize via Google (Device Flow — opens a browser).
After that, tokens are cached and sync is automatic.

### Dry Run (no Drive push)

```bash
pnpm run sync-plan:dry
```

This validates and builds the ZIP without uploading — useful for checking your work.

## Updating Your Plan

Come back anytime and tell Claude what changed:

> "Alex switched from levothyroxine to Synthroid 88mcg. Update the medication."

> "We added a generator (Honda EU2200i) to the garage. It runs on gasoline, 8-hour
> runtime on a full tank. Safety note: never run it indoors."

> "Our new rally point is Green Lake Park instead of Gasworks — the parking lot by
> the community center."

Claude will update the relevant YAML file. Run `pnpm run sync-plan` to push changes.

## Writing Custom Content

Beyond structured plan data, Claude can write articles in `custom/`:

> "Write me a family communications protocol document. Include: how to send the
> 'all safe' signal, what to do if you can't reach anyone for 2 hours, and how to
> use the ham radio for someone who's never touched one."

Claude will create `custom/communications-protocol/article.md` (or similar).

## File Reference

| File | What Claude Writes |
|------|-------------------|
| `plan/household.yaml` | Family members, address, medical, dietary, pets |
| `plan/communications.yaml` | PACE tiers, radio frequency, out-of-town contact |
| `plan/evacuation.yaml` | Routes, rally points, special needs |
| `plan/inventory.yaml` | Go-bag items, medications, water, food, equipment |
| `plan/documents.yaml` | Document types, locations, expiration dates |
| `plan/utilities.yaml` | Shutoff locations, tools needed, utility providers |
| `custom/**/*.md` | Custom articles, protocols, reference documents |

## Schema Quick Reference

All plan files require `schemaVersion: 1` at the top. Here are the key shapes:

### communications.yaml

```yaml
schemaVersion: 1
outOfTownContact: { name, phone, relation }
primary: { method, contact, notes }
alternate: { method, contact, notes }
contingency: { method, contact, notes }
emergency: { method, contact, notes }
radioFrequency: "string"
updatedAt: "ISO-8601 datetime"
```

### household.yaml

```yaml
schemaVersion: 1
members:
  - id: "uuid"
    name: "string"
    role: "adult | child | pet-owner"
    medicalNotes: "string"
    dietary: "string"
homeAddress: "string"
petCount: 1
updatedAt: "ISO-8601 datetime"
```

### evacuation.yaml

```yaml
schemaVersion: 1
primaryRoute: { label, description, destinationAddress }
alternateRoute: { label, description, destinationAddress }
rendezvousPoints:
  - { label, address, lat, lng, notes }
outOfAreaContact: { name, phone }
specialNeeds: "string"
updatedAt: "ISO-8601 datetime"
```

### inventory.yaml

```yaml
schemaVersion: 1
waterGallonsPerPersonPerDay: 1
items:
  - id: "uuid"
    category: "go-bag | water | food | medication | equipment | other"
    name: "string"
    quantity: 1
    unit: "gallons | days | count"
    expirationDate: "YYYY-MM-DD"
    location: "string"
    notes: "string"
updatedAt: "ISO-8601 datetime"
```

### documents.yaml

```yaml
schemaVersion: 1
documents:
  - id: "uuid"
    type: "passport | birth-certificate | drivers-license | insurance | will | medical-power-of-attorney | deed | vehicle-title | other"
    owner: "string"
    location: "string"
    expirationDate: "YYYY-MM-DD"
    notes: "string"
updatedAt: "ISO-8601 datetime"
```

### utilities.yaml

```yaml
schemaVersion: 1
shutoffs:
  - id: "uuid"
    utility: "water | gas | electric | other"
    location: "string"
    instructions: "string"
    toolRequired: "string"
utilityProvider:
  water: "string"
  gas: "string"
  electric: "string"
updatedAt: "ISO-8601 datetime"
```

## Tips

- **Sensitive data**: Fields like SSN and DOB are encrypted in the PWA. When writing
  via Claude Code, mark them as secure objects: `{ value: "123-45-6789", secure: true }`.
  The PWA encrypts these at rest.

- **UUIDs**: Claude should generate real UUIDs for `id` fields (e.g., via `crypto.randomUUID()`).

- **Dates**: Use ISO-8601 format with timezone offset (e.g., `2026-05-17T10:00:00-07:00`).

- **Incremental updates**: You don't have to rebuild the whole plan at once. Update one
  file at a time and sync.

- **Custom content**: Any `.md` file in `custom/` will appear in the PWA's Custom zone.
  Organize by folder (e.g., `custom/radio-protocols/`, `custom/meeting-plans/`).

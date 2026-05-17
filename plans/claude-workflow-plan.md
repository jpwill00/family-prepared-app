# Plan — Workflow Design: Family Prep Plan with Claude-Assisted Data Capture

## Context

The **family-prepared-app** is production-ready through Sprint 4: PWA installed on GitHub Pages, 6 plan zones with forms, 10 bundled library areas, AES-GCM encryption, Google Drive snapshot sync, and ZIP-based pack import/export. 140 tests pass, CI/CD is automated.

The user's new goal is to articulate **how a non-technical family actually uses this system** — including a Claude Code-assisted workflow where the AI helps build and populate the plan. The user wants to understand: what's the end-to-end getting-started experience, what's missing, and how to simplify access.

---

## Skills Registry Findings

### Related Skills Found

| Skill | Category | Relevance |
|-------|----------|-----------|
| `architecture-extensible-user-data-pwa-four-zone-repo` | architecture | Core pattern: four-zone layout, content registry, fork-to-edit |
| `vite-react-pwa-sprint0-scaffold` | tooling | Sprint 0 scaffold verified; pnpm v10 build approvals |
| `pwa-sprint-planning-sequential-pr-workflow` | architecture | Sprint execution pattern; Web Crypto + GitHub sync |
| `browser-mcp-react-pwa-testing` | testing | Manual test via Chrome MCP; React fiber injection; offline sim |
| `debugging-oauth-scope-root-cause-analysis` | debugging | `drive.file` limitation: Picker grants folder metadata only, not children |
| `fastapi-drive-free-feature-flags` | architecture | Drive-free mode pattern; feature flags for optional integrations |
| `react-pwa-sprint1-multi-pr-gotchas` | architecture | Zod `.default()` vs `.optional()`, idb-keyval jsdom mock, Tailwind v4 |
| `react-pwa-sprint3-4-deploy-gotchas` | ci-cd | JSZip Uint8Array in Node, GitHub Pages SPA 404.html, deploy trigger |

### Key Findings

**What Worked**:
- Four-zone repo layout cleanly separates user data / bundled content / community packs / custom
- `drive.file` scope avoids CASA audit; Drive native ACL handles sharing (no app-side permission logic)
- ZIP snapshot model for Drive sync: simple, versioned, avoids per-file conflict logic
- Content registry pattern: new folder = GUI action, new content_type = code + ADR
- `pnpm build && pnpm preview` for PWA/SW testing (never `pnpm dev`)

**What Failed** (Critical!):
- `drive.file` does NOT grant access to files INSIDE a user-selected folder — only the folder object itself. This means Drive sync must use app-created files only (current approach is correct).
- JSZip `Blob` fails in Vitest Node env — always accept `Blob | Uint8Array` in test-facing code.
- GitHub Pages returns blank on deep links — need `cp dist/index.html dist/404.html` in deploy.
- `tsc -b` catches errors that `tsc --noEmit` misses (Zod `.default()` generic inference).

---

## Current State: What Exists Today

### Completed Sprints (0–4)

| Sprint | Delivers |
|--------|----------|
| 0 | Vite + React + TS + Tailwind + PWA scaffold, CI/CD |
| 1 | 6 plan zones + content registry + 10 library areas + persistence |
| 2 | Google Drive snapshot sync (`drive.file`, push/pull/restore) |
| 3 | AES-GCM encryption + LockScreen passphrase gate |
| 4 | Pack import/export (ZIP-based manifest lifecycle) |

### GitHub Repos

| Repo | URL | Status |
|------|-----|--------|
| `family-prepared-app` | github.com/jpwill00/family-prepared-app | Active; Sprints 0–4 merged |
| `family-prepared-template` | github.com/jpwill00/family-prepared-template | Seed library (10 areas) |
| `family-prepared-packs` | github.com/jpwill00/family-prepared-packs | Stub `packs.json` |

### What's Missing (remaining sprints)

- **Sprint 5** — Maps (geo_layer, PMTiles, offline tiles, draw tools)
- **Sprint 6** — Community pack registry browser (fetch + browse + install from GitHub)
- **Sprint 7** — PDF export (analog backup, print-ready)
- **No `instructions/` directory** — user guides referenced in CLAUDE.md don't exist yet
- **No README** with usage instructions for non-technical users
- **No Claude Code workflow documentation** for AI-assisted plan building

---

## Detailed Workflow: Getting Started Building Your Family Prep Plan

### Path A: Browser GUI (Non-Technical User)

```
1. Visit https://jpwill00.github.io/family-prepared-app/ on any device
2. "Add to Home Screen" → installed as offline PWA
3. First run: onboarding seed imports 10 library areas into IndexedDB
4. Navigate sidebar → Plan zones → fill forms:
   - Household (members, address, medical, dietary)
   - Communications (PACE tiers: primary/alternate/contingency/emergency)
   - Evacuation (routes, rendezvous points, out-of-town contact)
   - Inventory (go-bag, medications, water, food, expirations)
   - Documents (reference to scanned IDs, insurance)
   - Utilities (shutoff locations + photos)
5. Settings → Connect Drive → authorize (drive.file scope)
6. Settings → "Snapshot Now" → ZIP pushed to Drive
7. Share Drive folder with family members (Drive's native sharing UI)
8. Family member installs PWA → connects same Drive → "Restore latest"
```

### Path B: Claude Code-Assisted (Power User + AI Collaboration)

This is the **new workflow you're asking about**. Here's how it works today and what needs to be built:

```
1. User clones the app repo locally:
   git clone https://github.com/jpwill00/family-prepared-app.git
   cd family-prepared-app && pnpm install

2. User opens Claude Code in the project directory

3. User describes their preparedness state conversationally:
   "We're a family of 4 in Seattle. Our primary comms is cell phones,
    alternate is family group chat on Signal, contingency is VHF radio
    (I have a Baofeng UV-5R), emergency is leaving a note at the
    mailbox. Our rally point is Gasworks Park..."

4. Claude Code creates/updates YAML files in the plan/ zone:
   - plan/communications.yaml (PACE tiers populated)
   - plan/household.yaml (4 members, Seattle address)
   - plan/evacuation.yaml (rally point: Gasworks Park)

5. Claude Code can also:
   - Write custom .md articles in custom/ (e.g., "Our family radio protocol")
   - Add reference documents the user provides (.pdf, .doc stored alongside)
   - Review library content and suggest what's relevant
   - Generate checklists based on conversation ("your go-bag is missing X")

6. User verifies via `pnpm dev` → browser → forms show populated data

7. User syncs to Drive:
   - Option A: Via the PWA GUI (Settings → Snapshot Now)
   - Option B: Claude Code generates the ZIP and uploads via Drive API
```

### Path C: Hybrid (Browser + Claude for Rich Content)

```
1. User fills basic forms in the browser (household, contacts)
2. User opens Claude Code for complex content:
   "Help me write a detailed communications plan. We have 2 adults,
    2 kids (ages 8 and 12). The kids have Gabb phones without internet.
    We need to plan for: earthquake (likely), wildfire smoke (annual),
    power outage (winter storms)..."
3. Claude generates a comprehensive document → saves to plan/ or custom/
4. User refreshes PWA → new content appears
5. Drive sync captures the latest state
```

---

## What's Missing for This Vision

### 1. Claude Code ↔ PWA Data Bridge (Critical Gap)

**Problem**: Currently, the PWA reads from IndexedDB (browser), but Claude Code operates on the filesystem. There's no shared format between the two.

**Solution**: The YAML files in `plan/` ARE the bridge. The app already knows how to read/write YAML (Sprint 1). What's needed:

- A **CLI/script mode** or **import-from-filesystem** capability where the PWA can ingest YAML files from disk (or a ZIP) into IndexedDB
- OR: Claude Code writes YAML → user runs `pnpm dev` → app detects local files → imports to IDB
- OR: Claude Code generates a ZIP (same format as Drive snapshots) → user imports via the Packs import dialog

**Recommended approach**: Add a "Import from local files" button in the PWA that reads `plan/*.yaml` from a user-selected folder (via File System Access API or drag-drop). This lets Claude Code write files locally and the PWA picks them up.

### 2. User-Facing Documentation (Missing)

The CLAUDE.md references `instructions/usage-guide.md` and `instructions/sharing-with-family.md` but neither exists. Non-technical users need:

- **Getting Started Guide** — how to install, first-run, fill plan
- **Sharing Guide** — how Drive sharing works, what family members see
- **Claude Code Workflow Guide** — how to use AI to build your plan
- **Content Contribution Guide** — how to add files (.md, .pdf, .mp4) to your plan

### 3. Rich Media Support (Partially Missing)

The plan says users can add `.md, .doc, .pdf, .mp4, .mp3` files. Currently:
- `.md` files work (library/custom zones render Markdown)
- Binary files (.doc, .pdf, .mp4, .mp3) have no viewer or storage path defined
- Need: a "file attachment" concept in plan zones (reference to a file stored in IDB or OPFS)

### 4. Auto-Sync / Version Tracking (Future)

Users want their copy to "sync back to the most recent version of the app." This is the **template-sync** problem:
- App code updates: The PWA auto-updates via service worker (already works)
- Library content updates: Need a "check for library updates" feature that fetches from the template repo
- User data: Never overwritten (four-zone architecture handles this)

### 5. Non-Technical Access Simplification

Current barriers for non-technical users:
- No custom domain (just `jpwill00.github.io/family-prepared-app/`)
- No onboarding tutorial/wizard in the app
- No mobile-optimized responsive testing documented
- No "share this app with your family" one-click flow

---

## Recommendations: Priority Order

### Immediate (This Session)

1. **Document the Claude Code workflow** — Write a guide showing how Claude Code + the user collaborate to build a plan. This is actionable now.

2. **Create `instructions/` directory** with:
   - `usage-guide.md` — Getting started for non-technical users
   - `sharing-with-family.md` — Drive sharing workflow
   - `claude-workflow.md` — AI-assisted plan building

### Short-Term (Next Sprint)

3. **Add "Import from files" to the PWA** — File System Access API or drag-drop folder import. This bridges Claude Code's filesystem writes with the PWA's IndexedDB.

4. **Add "file attachment" support to plan zones** — Store binary files (PDF, images) alongside YAML data in IDB, reference them from plan records.

### Medium-Term

5. **Template sync check** — On app load (if online), check if `family-prepared-template` has newer library content. Offer one-click update.

6. **Sprint 7 PDF export** — Critical for the "analog backup" promise and for sharing with family members who don't want to use an app.

7. **Onboarding wizard** — Guided first-run that walks through plan zones with examples.

---

## Simplification Opportunities

| Current Friction | Simplification |
|-----------------|---------------|
| User must know GitHub Pages URL | Custom domain OR QR code sharing |
| Drive OAuth requires Google Cloud Console setup | App-level OAuth client ID (already done for you) |
| No guided first-run experience | Onboarding wizard with pre-fill suggestions |
| Claude Code requires `git clone` + `pnpm install` | Claude Desktop app can work with any directory; or provide a "download ZIP" option |
| Family sharing requires Drive knowledge | In-app "Share with family" button that generates a Drive share link |
| Binary files (.pdf, .mp4) not supported | Attachment zone with drag-drop upload to IDB/OPFS |

---

## Verification

To validate this plan works end-to-end:

1. **Browser path**: Visit the deployed PWA → fill one plan zone → Drive snapshot → verify ZIP on Drive
2. **Claude Code path**: In the repo directory, write a `plan/communications.yaml` file → run `pnpm dev` → verify the app shows the data (requires the import bridge)
3. **Sharing**: Share the Drive folder with a second Google account → second device installs PWA → restores snapshot → sees the plan
4. **Offline**: Disconnect network → verify all filled plan data is accessible → reconnect → snapshot succeeds

---

## Implementation Plan: Claude Code Workflow Script

### What We're Building

A **CLI helper script** (`scripts/sync-plan.ts`) that:
1. Reads plan YAML files from the local repo's `plan/` directory
2. Validates them against the same Zod schemas the PWA uses
3. Generates a Drive-compatible snapshot ZIP (with `manifest.json`)
4. Pushes the ZIP directly to Google Drive via REST API (OAuth Device Flow for CLI auth)

This lets Claude Code write YAML files → run the sync script → family members pull from Drive in the PWA.

### Architecture

```
User ←→ Claude Code (terminal)
              │
              ├─ Writes plan/*.yaml files (Zod-validated schemas)
              ├─ Writes custom/*.md articles
              ├─ Adds attachments (pdf, images, etc.)
              │
              ▼
         scripts/sync-plan.ts (Node CLI)
              │
              ├─ Validates all YAML against Zod schemas
              ├─ Bundles into snapshot ZIP (manifest.json + plan/*.yaml)
              ├─ Authenticates to Drive (OAuth Device Flow, token cached in .env.local)
              ├─ Pushes ZIP to My Drive/family-prepared-app/snapshots/
              │
              ▼
         Google Drive (family-prepared-app/ folder)
              │
              └─ Family members open PWA → Settings → "Restore latest" → plan appears
```

### File Plan

| File | Purpose |
|------|---------|
| `scripts/sync-plan.ts` | CLI: validate plan → build ZIP → push to Drive |
| `scripts/validate-plan.ts` | CLI: validate plan/*.yaml without pushing (dry run) |
| `plan/` (repo root) | YAML files that Claude Code writes directly |
| `plan/household.yaml` | Household data (same schema as app) |
| `plan/communications.yaml` | PACE communication plan |
| `plan/evacuation.yaml` | Evacuation routes + rendezvous |
| `plan/inventory.yaml` | Go-bag, medications, water, food |
| `plan/documents.yaml` | Legal document references |
| `plan/utilities.yaml` | Utility shutoff locations |
| `custom/` (repo root) | User-authored Markdown articles |
| `instructions/claude-workflow.md` | Guide: how to use Claude Code to build your plan |
| `instructions/usage-guide.md` | Guide: PWA usage for non-technical family members |
| `instructions/sharing-with-family.md` | Guide: Drive sharing + multi-device setup |

### YAML Schema Reference (for Claude Code authoring)

Claude Code writes these files. The format matches what the PWA expects:

```yaml
# plan/communications.yaml
schemaVersion: 1
outOfTownContact:
  name: "Uncle Jim"
  phone: "+1-555-0199"
  relation: "uncle"
primary:
  method: "Cell phones (family group text)"
  contact: "+1-555-0100"
  notes: "Default for day-to-day check-ins"
alternate:
  method: "Signal encrypted group chat"
  contact: "Family Signal group"
  notes: "If cell towers are congested"
contingency:
  method: "VHF radio, channel 7 (Baofeng UV-5R)"
  contact: "146.520 MHz national simplex"
  notes: "Range ~2 miles LOS; requires radio + battery"
emergency:
  method: "Physical note at rally point mailbox"
  contact: "Gasworks Park south entrance bench"
  notes: "Leave a dated note in ziplock bag"
radioFrequency: "146.520 MHz"
updatedAt: "2026-05-17T10:00:00-07:00"
```

### Workflow: Getting Started (Step by Step)

**Prerequisites**: Claude Code installed, repo cloned, `pnpm install` done.

```
Step 1: Tell Claude about your family
─────────────────────────────────────
You: "We're a family of 4 in Seattle. Two adults (Jordan, Alex), two
     kids (Sam age 12, Pat age 8). Our address is 1234 Pine St."

Claude: Creates plan/household.yaml with members, address, roles.

Step 2: Describe your communications plan
──────────────────────────────────────────
You: "Our primary comms is cell phones. Alternate is Signal group.
     Contingency is ham radio on 146.52. Emergency is a note at
     Gasworks Park."

Claude: Creates plan/communications.yaml with PACE tiers populated.

Step 3: Describe evacuation
───────────────────────────
You: "Primary route is north on I-5 to Everett. Alternate is
     east on I-90 to Issaquah. Rally point is Gasworks Park
     (47.6456, -122.3344). Out-of-area contact is Uncle Jim."

Claude: Creates plan/evacuation.yaml with routes + rendezvous.

Step 4: Validate and sync
─────────────────────────
Claude: Runs `pnpm run validate-plan` to confirm YAML is valid.
Claude: Runs `pnpm run sync-plan` to push snapshot to Drive.
Output: "✓ Snapshot pushed: 2026-05-17T10-00-00.zip"

Step 5: Family accesses on their phones
───────────────────────────────────────
Family member: Opens PWA → Settings → "Restore latest" → plan appears.
```

### What This Solves

| Problem | Solution |
|---------|----------|
| Claude can't write to IndexedDB | Claude writes YAML → script pushes ZIP to Drive → PWA pulls |
| User must manually fill every form | Claude populates plan from natural conversation |
| Non-technical user needs to clone a repo | They don't — they use the PWA. Only the plan author uses Claude Code |
| Binary files (PDF, photos) aren't supported | Include them in the ZIP alongside YAML; PWA needs minor extension to display |
| Plan data gets stale | Claude can update any section conversationally, re-sync with one command |

### What's Still Missing After This

1. **PWA display of file attachments** (photos of shutoffs, scanned IDs) — currently YAML references `photoRef` / `fileRef` strings but has no viewer
2. **Automatic template sync** — check if library content has upstream updates
3. **Onboarding wizard** in the PWA for users who don't use Claude Code
4. **PDF export** (Sprint 7) — printable analog backup
5. **Maps** (Sprint 5) — offline evacuation route visualization

### Verification

1. Claude writes `plan/communications.yaml` → `pnpm run validate-plan` passes
2. `pnpm run sync-plan` → ZIP appears in Google Drive `family-prepared-app/snapshots/`
3. Open PWA → Settings → Restore latest → Communications plan shows PACE tiers
4. Offline: disconnect → plan data still accessible in PWA
5. Another device: install PWA → connect Drive → restore → same data appears

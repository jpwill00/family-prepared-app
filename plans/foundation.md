# Plan — Family Emergency Preparedness PWA (Drive-backed, MIT, community-archived)

## Context

The household — not the agency — is the primary unit of disaster resilience. Existing
preparedness apps are either online-first (useless when infrastructure fails), proprietary
(plans locked to a vendor), or technical (terminal/Git required). The two research files in
[research/](research/) argue for a **local-first PWA** with **plain-text Markdown + YAML**
storage, **PDF analog backup**, **PACE-tiered comms**, and **OPSEC** features (per-field
encryption, challenge-response codes).

The repo already has a thoughtful [CLAUDE.md](CLAUDE.md) for this app, but it assumes
**GitHub** as the sync remote. The user's request pivots the remote to **Google Drive**
(family-friendlier, no terminal, native sharing UI) while keeping **GitHub** as the home
for the **public community pack registry**. License: **MIT** for app code, **CC-BY-4.0**
for bundled library content.

User's confirmed decisions (via AskUserQuestion):
1. **Drive role**: backup + share only — IndexedDB is source of truth; Drive holds versioned ZIP snapshots
2. **Community archive**: GitHub repo registry with JSON index
3. **Encryption**: per-field AES-GCM with passphrase (PBKDF2 600k, OWASP 2024)

## Scope of this plan

This is a **strategic / architectural plan** spanning multiple sprints. Each sprint becomes
its own PR(s) and gets a focused implementation plan when started. Sprint 0 is the only
sprint with low-level steps here, because it's the closest concrete action.

---

## Architecture Snapshot

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (offline-first PWA installed via "Add to Home")     │
│                                                             │
│   UI (React + shadcn) ──▶ Zustand ──▶ lib/persistence/idb   │
│                                            │                │
│                                            ▼                │
│                                 IndexedDB (idb-keyval)      │
│                                  ▲       ▲       ▲          │
│              ┌───────────────────┘       │       └──────┐   │
│              │ encrypted fields          │              │   │
│              │ (AES-GCM, passphrase)     │              │   │
│              ▼                           ▼              ▼   │
│   lib/crypto/secure.ts        lib/persistence/yaml   pdf.tsx│
│                                          │                  │
│                                          ▼                  │
│                                  lib/persistence/zip        │
│                                          │                  │
│                                          ▼                  │
│                          lib/drive/sync.ts (Sprint 2)       │
└──────────────────────────────────────────────────┬──────────┘
                                                   │
                       ┌───────────────────────────┼─────────────────────┐
                       ▼                                                 ▼
       Google Drive (per-family)                          GitHub (public)
       ─ My Drive/family-prepared-app/                     ─ family-prepared-app (app, MIT)
         snapshots/2026-05-09T14-22.zip                   ─ family-prepared-template
         snapshots/2026-05-08T09-10.zip                     (seed library + scaffold)
         current.zip  (latest pointer)                    ─ family-prepared-packs
       ─ Shared with invited family members                 (community pack registry)
         via Drive's native ACL                              packs.json + zips
```

Four-zone repo layout (already in CLAUDE.md, retained):
- `plan/` — user data, never overwritten on upgrade
- `library/` — bundled reference content; "fork to edit" copies into `custom/`
- `packs/` — installed community packs; lockfile in `packs/_installed.yaml`
- `custom/` — user-created content areas; one-click "export as pack"

Verified pattern: see
[architecture-extensible-user-data-pwa-four-zone-repo](../../.agent-brain/ProjectMnemosyne/skills/architecture-extensible-user-data-pwa-four-zone-repo.md).

---

## Sprint Roadmap

### Sprint 0 — Scaffold (smallest viable PWA)

**Goal**: clean `pnpm build`, PWA artifacts emitted, lint/typecheck/tests pass.

Concrete steps (verified workflow from
[vite-react-pwa-sprint0-scaffold](../../.agent-brain/ProjectMnemosyne/skills/vite-react-pwa-sprint0-scaffold.md)):

1. `brew install node pnpm` (do NOT `npm i -g pnpm` — Safety Net blocks it).
2. Scaffold to `/tmp/scaffold` with `pnpm create vite@latest /tmp/scaffold --template react-ts`, copy artifacts back.
3. Write a complete `package.json` including:
   ```json
   "pnpm": { "onlyBuiltDependencies": ["esbuild", "lefthook"] }
   ```
   to avoid the non-TTY `pnpm approve-builds` prompt.
4. Tailwind v4 via `@tailwindcss/vite` (CSS-first; no `tailwind.config.ts`).
5. `tsconfig.app.json`: `"ignoreDeprecations": "6.0"`, `"baseUrl": "."`, `"paths": { "@/*": ["./src/*"] }`.
6. `vite.config.ts`: `VitePWA({ registerType: "autoUpdate", devOptions: { enabled: false }, workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"] }, manifest: { ... } })`.
7. Register SW *only* in `src/main.tsx` (`virtual:pwa-register`); add `"vite-plugin-pwa/client"` to tsconfig `types`.
8. Vitest in a separate `vitest.config.ts` for `setupFiles` to be picked up.
9. Lefthook + ESLint flat config (use `jsxA11y.flatConfigs.recommended`).

**Critical files to create**:
- `package.json`, `pnpm-lock.yaml`
- `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`
- `index.html`, `public/icons/*`, `public/manifest.webmanifest`
- `.github/workflows/ci.yml` (test, lint, pre-deploy, auto-merge gates per CLAUDE.md)
- `.github/workflows/deploy-pages.yml`

**Verification**: `pnpm test --run && pnpm typecheck && pnpm lint && pnpm build`; check `dist/sw.js` and `dist/manifest.webmanifest` exist.

---

### Sprint 1 — Plan zone + content registry + persistence + bundled library

**Goal**: a usable single-device app for one family, populated with the **10 reference content areas already authored** in the [`family-prepared-template`](../../Projects/family-prepared-template/library/) sibling repo. Drive is *not* yet wired.

**Bundled library content** (verbatim from `family-prepared-template/library/manifest.yaml`):

| Path | Title | Articles already written |
|---|---|---|
| `library/first-aid/` | First Aid | bleeding-control, burns, cpr-basics |
| `library/communications/` | Communications | pace-plan, radio-basics |
| `library/water/` | Water | water-purification, water-storage |
| `library/food/` | Food & Nutrition | emergency-food-supply, food-safety-power-outage |
| `library/shelter/` | Shelter & Warmth | emergency-heat, home-shelter-in-place |
| `library/evacuation/` | Evacuation | evacuation-planning, go-bag |
| `library/documents/` | Important Documents | documents-to-copy |
| `library/power/` | Power & Lighting | backup-power-options, generator-safety |
| `library/pets/` | Pets & Animals | pet-emergency-kit |
| `library/mental-health/` | Mental Health & Stress | disaster-stress |

These are the **starting point for both content and the library zone schema**. All 10 areas are `content_type: article_collection`. The first PR should consume this repo as a git submodule *or* fetch it as the seed ZIP at first-run (Sprint 3 split — see roadmap below); for Sprint 1 we vendor the directory directly under `seed/library/` and copy it into IDB on first launch.

**Plan-zone schemas to write** (driven by the library areas above + research file 1's PACE / OPSEC tables):

| Plan path | Schema | Notes |
|---|---|---|
| `plan/household.yaml` | `Household` | members[], dietary, medical, photo refs; SSN/DOB are `secure: true` |
| `plan/communications.yaml` | `CommunicationPlan` | **PACE tiers** (Primary/Alternate/Contingency/Emergency) — explicit from research |
| `plan/evacuation.yaml` | `EvacuationPlan` | rendezvous points, primary/alternate routes, out-of-town contact |
| `plan/inventory.yaml` | `ResourceInventory` | go-bag items, medication dosages, expirations, water gallons (1/person/day) |
| `plan/documents.yaml` | `LegalDocuments` | refs to scanned IDs/insurance; payload `secure: true` |
| `plan/utilities.yaml` | `UtilityShutoffs` | water/gas/electric shutoff locations + photos |

**Critical files**:
- `src/lib/schemas/plan.ts` — Zod schemas for the six plan-zone entities above. Mark sensitive fields with `secure: true`.
- `src/types/plan.ts` — `z.infer<>` derived TS types.
- `src/lib/store/plan.ts` — Zustand store; full repo state in memory.
- `src/lib/persistence/idb.ts` — `loadRepo()`, `saveRepo()` via `idb-keyval`. **All** IDB access lives here (CLAUDE.md rule).
- `src/lib/persistence/yaml.ts` — `parseYaml()`, `serializeYaml()` round-trip safe.
- `src/lib/content/registry.ts` — type→renderer map: `structured_record_set`, `article_collection`, `geo_layer`, `checklist`.
- `src/lib/content/types.ts` — TS types for `_meta.yaml` per zone.
- `src/components/plan/*` — household, communication (PACE form), evacuation, inventory, documents, utilities forms.
- `src/components/library/ArticleView.tsx` — Markdown viewer with frontmatter (sources, last_reviewed) + "Fork to edit" button.
- `src/components/shared/AppShell.tsx` — sidebar shows the 10 library areas + the 6 plan entities + zone routing.
- `seed/library/**` — the 10 vendored area folders from the template repo.
- `tests/unit/persistence/yaml.test.ts` — round-trip per zone.
- `tests/unit/content/seed.test.ts` — every shipped article parses; every `_meta.yaml` resolves to a known content_type.

**Tests required**: schema validation; YAML round-trip; registry resolves all four built-in types; "fork to edit" guard refuses writes to `library/` and `packs/`; seed library imports cleanly into IDB and renders in the AppShell.

---

### Sprint 2 — Google Drive sync (backup + share, **not** live mirror)

**Goal**: a family can install on multiple devices, snapshot their plan to Drive, and share read-access with invited family members through Drive's own UI.

**Why "snapshot" not "live mirror"**: snapshot ZIPs preserve the four-zone repo as a single file, sidestep per-file conflict logic, and let Drive's native version history substitute for git. The user explicitly chose this option.

**Critical files** (analogue to the verified GitHub flow in
[pwa-sprint-planning-sequential-pr-workflow](../../.agent-brain/ProjectMnemosyne/skills/pwa-sprint-planning-sequential-pr-workflow.md), swapping Octokit for Drive):

- `src/lib/drive/auth.ts` — Google Identity Services (`google.accounts.oauth2`) implicit-flow token client. **Pinned scope**: `https://www.googleapis.com/auth/drive.file` (per-file, app-created only — strictly minimum, avoids CASA review). [debugging-oauth-scope-root-cause-analysis](../../.agent-brain/ProjectMnemosyne/skills/debugging-oauth-scope-root-cause-analysis.md) is the cautionary tale.
- `src/lib/drive/sync.ts` — `pushSnapshot(zipBlob, version)`, `pullLatest()`, `listSnapshots()`, `restoreFromSnapshot(id)`. Drive Picker for choosing the family folder on first connect.
- `src/lib/persistence/zip.ts` — already needed for ZIP packs; reused here.
- `src/lib/persistence/idb.ts` — add `saveDriveTokens()`, `saveSyncMeta({lastPushAt, lastPushSnapshotId})`. Tokens never in `localStorage`.
- `src/components/settings/DriveConnect.tsx` — connect / disconnect / "snapshot now" / "restore from…".

**Sharing UX**: app does not implement ACLs. After first push, app shows a deep link to the family folder in Drive's web UI; user shares from Drive directly. The app trusts Drive's permission model.

**Multi-device**: each device pulls the most recent snapshot on Drive connect. Conflict UX = last-write-wins with a warning ("device B's plan is newer than yours; restore B's snapshot?"); no merge logic in MVP.

**Tests**: mocked `gapi.client.drive` for push/pull paths; offline → reconnect → snapshot succeeds; revoked token surfaces a re-auth prompt (parallel to the `DriveAuthError` learning from the FastAPI Drive skill — the lesson there is *categorize 401 distinctly*).

---

### Sprint 3 — Encryption + LockScreen

Per-field AES-GCM with passphrase. Verified pattern, transferable verbatim from
[pwa-sprint-planning-sequential-pr-workflow](../../.agent-brain/ProjectMnemosyne/skills/pwa-sprint-planning-sequential-pr-workflow.md):

- `src/lib/crypto/secure.ts` — `deriveKey(passphrase, salt)` (PBKDF2 SHA-256, **600,000** iterations, 256-bit AES-GCM key); `encrypt(value, key)` (12-byte IV via `crypto.getRandomValues`, base64-encode IV+ciphertext); `decrypt(blob, key)`.
- Salt: 16 random bytes, **stored as `number[]` in IDB** (typed arrays don't serialize cleanly).
- TypeScript gotcha: cast as `Uint8Array<ArrayBuffer>` (not `ArrayBufferLike`) when feeding `crypto.subtle`.
- `cryptoKey: CryptoKey | null` lives in Zustand only — never persisted.
- `<LockScreen>` wraps `App.tsx`; checks `hasEncryptedData()` on mount; decrypt-first-field as passphrase verification (wrong passphrase → `DOMException` thrown by Web Crypto).
- Schema work: every field flagged `secure: true` in Zod runs through encrypt/decrypt at the persistence boundary.

---

### Sprint 4 — Pack lifecycle (ZIP I/O only)

- `src/lib/packs/manifest.ts` — Zod schema for `pack.yaml` (id, version, license, author, sources, content_areas, requires.app_min_version, checksum).
- `src/lib/packs/import.ts` — drag-drop ZIP → validate manifest → write to `packs/<id>/` → update `packs/_installed.yaml` lockfile.
- `src/lib/packs/export.ts` — wrap a `custom/<area>/` folder with `pack.yaml` → produce shareable `.zip`.
- "Fork to edit" guard already in Sprint 1; pack imports respect zone read-only.
- **Defer to Sprint 5+**: registry browsing, one-click install, version updates, signing.

---

### Sprint 5 — Maps (`geo_layer` content type) — high-quality, offline-capable

**Why this matters**: a family preparedness plan without offline maps is incomplete — evacuation routes, rendezvous points, watershed/flood zones, utility shutoffs, and shelter locations all live in geographic space, and they have to render with the **internet down**. The [High-Quality Map Management Guide](../../Projects/family-plan/research/High-Quality%20Map%20Management%20Guide.md) is our guidance; this sprint applies its desktop/iPhone recipe to a **browser PWA**.

**Architectural pivot from CLAUDE.md**: Leaflet is retained as the renderer, but **MapLibre GL JS** is added as an option for vector tiles + WebGL performance. The single biggest deviation from the research guide: in a browser, **PMTiles** (single-file pyramid served via HTTP range requests) is preferred over MBTiles because MBTiles is SQLite — usable in-browser only via `sql.js` (heavy WASM) or a custom loader. PMTiles was designed for exactly this use case. MBTiles imports are still supported via a server-side or build-time conversion to PMTiles.

**Layered storage model** (mirrors research file recommendations §"Layered Storage Approach"):

| Layer | Format | Source | Storage | Render with |
|---|---|---|---|---|
| Raster basemap (topo / orthoimagery) | **PMTiles** (raster pyramid, PNG/WebP) | USGS US Topo / NAIP via QGIS → `pmtiles convert` | OPFS (Origin Private FS) or Cache API | MapLibre `raster-source` |
| Vector basemap (roads, contours, hydro) | **PMTiles** (Mapbox Vector Tiles, .pbf) | OSM extract via Geofabrik → `tippecanoe` → PMTiles | OPFS | MapLibre vector source |
| Hydrography overlay | GeoJSON | USGS 3DHP | IDB (small) or as-is | Leaflet GeoJSON layer |
| Elevation hill-shade | PMTiles raster | USGS 3DEP via `gdaldem hillshade` → tiles | OPFS | MapLibre `raster-source`, opacity 0.4 |
| User markups | **GeoJSON FeatureCollection** | hand-drawn in app | IDB, in `plan/maps/` | Leaflet draw layer |
| Sharing markups | **GPX** (waypoints/tracks), **KML** (polygons) | exports from app | n/a — file dialog | n/a |

**Content-type contract** (`_meta.yaml` for a `geo_layer`):

```yaml
content_type: geo_layer
title: Evacuation Routes — King County
default_view: { lat: 47.6, lng: -122.3, zoom: 11 }
basemap:
  type: pmtiles
  url: ./tiles/king-county-topo.pmtiles      # relative to the area folder
  attribution: "USGS US Topo (public domain)"
overlays:
  - type: pmtiles
    url: ./tiles/hillshade.pmtiles
    opacity: 0.4
  - type: geojson
    url: ./hydrography.geojson
  - type: geojson
    url: ./markups.geojson                   # user-drawn; lives in plan/ when "forked"
```

**Storage discipline (research §"Optimization and Conversion Workflows" + §"Strategic Management of Mobile Storage")**:

- **Cap zoom levels** at z16 for 1:24,000 topos (research §"Zoom Level Management") — going to z20 produces multi-GB files with no extra detail.
- **Nested detail** pattern (research §"onX Hunt"): one wide low-detail PMTiles for orientation; small high-detail PMTiles for "home", "rendezvous", "shelter" sites only.
- **Storage budget UI**: settings page shows total OPFS bytes used by maps + per-area breakdown + "Delete this region" button. Warn if approaching `navigator.storage.estimate().quota * 0.8`.
- **Eviction**: Cache API basemap tiles are evictable by the browser; OPFS is *persistent* but requests `navigator.storage.persist()` on first map import to reduce eviction risk.
- **Clipping the collar**: import workflow must offer "Clip to bounds" so USGS GeoPDF margins (legend, scale bar — research §"Conversion of GeoPDF to Mobile-Ready GeoTIFF") don't bloat tile pyramids.

**Authoritative sources to seed (research §"Authoritative Sourcing")**:

| Source | What | License | How we ingest |
|---|---|---|---|
| USGS National Map (3DEP, NAIP, US Topo, 3DHP) | Topo, imagery, elevation, hydrography | Public domain | User downloads GeoTIFF/GeoPDF → app's "Import & Tile" flow → PMTiles in OPFS |
| NOAA Digital Coast | Coastal/flood data | Public domain | GeoJSON for flood zones; raster for shoreline imagery |
| OpenStreetMap (Geofabrik extracts) | Roads, trails, urban features | ODbL | Pre-built PMTiles distributed via the community pack registry |
| Felt / MapTiler / Stadia (online basemaps) | Live styled tiles | Per-provider TOS | Optional online fallback when connected; never the only source |

**Critical files**:
- `src/lib/maps/pmtiles.ts` — wrapper around the official [`pmtiles`](https://github.com/protomaps/PMTiles/tree/main/js) JS library; resolves a `pmtiles://` URL to MapLibre/Leaflet sources.
- `src/lib/maps/storage.ts` — OPFS read/write helpers + `navigator.storage.estimate()` budget checks.
- `src/lib/maps/import.ts` — accepts a user-uploaded `.pmtiles`, `.mbtiles`, `.geojson`, `.kml`, or `.gpx`; for `.mbtiles`, runs `pmtiles convert` via a Web Worker (or refuses with a clear "convert this on your laptop first" message + linked instructions, depending on bundle size). KML/GPX → GeoJSON via `togeojson`.
- `src/lib/maps/export.ts` — markups → **GPX** (waypoints/tracks, research-recommended interchange) and **KML** (polygons). Round-trip tested.
- `src/lib/content/renderers/GeoLayerView.tsx` — registered with the content registry; uses MapLibre when a vector source is present, falls back to Leaflet for GeoJSON-only layers. Both ship; lazy-load MapLibre to keep the cold bundle small.
- `src/lib/content/renderers/draw.ts` — `leaflet-draw` (or MapLibre's `mapbox-gl-draw`) — point/line/polygon tools writing into `plan/maps/<area>/markups.geojson`.
- `src/components/maps/MapImportDialog.tsx` — drag-and-drop with format detection, attribution capture, license picker, area-of-interest preview.
- `src/components/settings/MapStorage.tsx` — storage budget + per-area delete.
- `tests/unit/maps/format-roundtrip.test.ts` — GPX→GeoJSON→GPX, KML→GeoJSON→KML, PMTiles header parse.

**Dependencies to add**:
```
pmtiles                    # https://github.com/protomaps/PMTiles
maplibre-gl                # WebGL renderer for vector tiles + raster
@tmcw/togeojson            # KML → GeoJSON
@mapbox/togpx              # GeoJSON → GPX
@mapbox/togeojson          # (alt; pick whichever is healthiest)
@turf/turf                 # geometry ops (clip, simplify, area)
```
Leaflet/react-leaflet stay; MapLibre is additive.

**Pack-able geo packs** (Sprint 4 + Sprint 6 alignment): community packs can ship under the existing pack manifest with `content_type: geo_layer`, e.g. `wildfire-evacuation-zones-king-county`. Their `pack.yaml` declares which PMTiles files to install; checksums apply per-file (not just per-zip) because tile pyramids can be hundreds of MB. Pack import becomes a *staged* operation for geo packs: download manifest → present user the storage cost → user confirms → fetch tiles into OPFS.

**Cloud-sharing alignment with Sprint 2**: tile pyramids are excluded from Drive snapshots by default (size + Drive API rate limits). The snapshot ZIP includes only `plan/maps/**/*.geojson|gpx|kml|_meta.yaml` and a "tile manifest" that references PMTiles by checksum/source URL. Restoring a snapshot on a new device pulls vectors/markups immediately and lets the user re-download tiles on demand.

**MVP / defer split**:

| Capability | Sprint 5 (MVP)? | Notes |
|---|---|---|
| Render GeoJSON overlays via Leaflet | ✅ | Smallest possible viable map |
| Render PMTiles raster basemap via MapLibre | ✅ | Core "offline topo" promise |
| Render PMTiles vector basemap | ✅ | OSM-derived city basemap |
| Hill-shade overlay from 3DEP | ✅ | One-time tile build documented in `docs/maps/usgs-pipeline.md` |
| Draw / edit markups (point/line/polygon) | ✅ | `leaflet-draw` |
| Import GPX / KML / GeoJSON / PMTiles | ✅ | UI dialog |
| Import MBTiles in-browser | ⏸ Sprint 6 | Worker-based PMTiles conversion is non-trivial |
| Live online basemaps (MapTiler / Stadia) | ⏸ Sprint 6 | Auth keys, TOS, low-priority for offline-first |
| Bathymetry / nautical charts (NOAA ENC) | ⏸ Sprint 7+ | Specialized; revisit if community asks |
| Cadastral parcel data (Regrid) | ⏸ Sprint 7+ | Licensed source; not MIT/CC-friendly by default |
| Cloud-GIS collab (Felt/Atlas links) | ❌ | Out of scope; we are local-first |

**Verification**:
1. With network disabled, open a `geo_layer` area: basemap renders, hill-shade renders, hydrography GeoJSON renders.
2. Draw a polygon → save → close PWA → reopen → polygon persists from IDB.
3. Export polygon as KML → import into Google Earth → shape appears in the right place.
4. Export track as GPX → import into a Garmin (or `gpx-viewer`) → coordinates and timestamps preserved.
5. Storage settings shows the correct OPFS bytes after each tile import; delete button frees them.
6. Drive snapshot from Sprint 2: the resulting `.zip` does *not* contain PMTiles bytes, but the tile manifest is present.

---

### Sprint 6 — Community pack registry (GitHub-hosted)

- New repo: `family-prepared-packs` (separate from app + template).
- `packs.json` index (id, latest version, download URL, checksum, license, author, tags).
- App fetches `VITE_REGISTRY_URL` (already in CLAUDE.md env vars), browses, one-click install (reuses Sprint 4 ZIP import).
- Contribution flow: PR a new `<id>/<version>/pack.zip` + index entry → CI validates manifest + checksum → merge.
- License: app stays MIT; bundled+community library content is **CC-BY-4.0** by default; per-pack `license:` field in manifest is authoritative.

---

### Sprint 7 — PDF export (analog backup)

`@react-pdf/renderer` (in CLAUDE.md stack). One PDF per zone + a combined "field package" PDF. Research file 1 specifically calls out waterproof/tear-proof printing — the PDF should be print-ready (page breaks, no background colors, readable on B&W laser). No new persistence — it reads straight from the Zustand store.

---

## Drive vs. GitHub: which serves what

| Concern | Drive | GitHub |
|---|---|---|
| Personal/family plan data | ✅ snapshot + share | ❌ |
| App source code | ❌ | ✅ MIT, repo: `family-prepared-app` |
| Template repo (seed library) | ❌ | ✅ CC-BY-4.0, `family-prepared-template` |
| Community pack registry | ❌ | ✅ `family-prepared-packs` |
| OAuth scope | `drive.file` only (app-created) | n/a |
| Versioning model | snapshot ZIPs + Drive native version history | git for code |

---

## Critical New / Modified Rules for CLAUDE.md

These edits to [CLAUDE.md](CLAUDE.md) should land in Sprint 0 alongside scaffolding:

- Replace `lib/github/` with `lib/drive/` in the "Never access X outside" rule.
- Add: **"Never request Drive scopes broader than `drive.file`."** Cite the OAuth-scope debugging skill.
- Add Drive snapshot path conventions: `My Drive/family-prepared-app/snapshots/<ISO>.zip` and `current.zip` pointer.
- Keep the `lib/github/` rule **only** for Sprint 6 (registry fetch — read-only, no auth).

---

## Verification (end-to-end smoke for the whole project)

After Sprint 4 (the earliest "real product" milestone):

1. `pnpm dev` → onboarding → fill household, comms (PACE), one inventory item with `secure: true`.
2. `pnpm preview` → install as PWA → DevTools "Offline" → confirm app still functional, IDB intact.
3. Settings → "Connect Drive" → device-flow consent → "Snapshot now" → check Drive UI shows `My Drive/family-prepared-app/snapshots/<ISO>.zip`.
4. Second browser profile → install PWA → connect same Drive account → "Restore latest" → plan appears.
5. Set passphrase in Sprint 3 build → close + reopen → LockScreen → wrong passphrase rejects, correct one decrypts.
6. Export `custom/<area>/` as ZIP pack → fresh profile → import the ZIP → article appears under `packs/`.
7. `pnpm e2e` (Playwright) covers the offline + IDB + SW caching paths;
   [browser-mcp-react-pwa-testing](../../.agent-brain/ProjectMnemosyne/skills/browser-mcp-react-pwa-testing.md) is the manual fallback for SW-quirky bugs.

---

---

## Manual Setup Guide (one-time, before Sprint 0)

These are **manual steps you (the human) perform** before any code runs. Each step ends with the artifact / value you'll need to paste into a config file or `.env`. Keep secrets out of the repo — only the **client IDs** belong in committed code. Drive and GitHub Device Flow are pure-SPA flows: there is **no client secret** to manage.

### A. GitHub — three repos

The app is split across three public repos (all under one GitHub user or org you control):

| Repo | Purpose | License |
|---|---|---|
| `family-prepared-app` | The PWA app source | **MIT** |
| `family-prepared-template` | Seed library (the 10 content areas) | **CC-BY-4.0** for content; **MIT** for any code |
| `family-prepared-packs` | Community pack registry — `packs.json` + zips | Per-pack license, default CC-BY-4.0 |

**Steps** (run from any local directory; you'll need [`gh`](https://cli.github.com) authenticated as you):

1. **Authenticate `gh`**: `gh auth login` → GitHub.com → HTTPS → Login with a browser → paste the one-time code. Verify with `gh auth status`.
2. **App repo**: already created as `<your-user>/family-prepared-app` (public). Clone it: `gh repo clone <your-user>/family-prepared-app ~/Projects/family-prepared-app`. Sprint 0 fills it in.
3. **Template repo** already exists locally at `/Users/jpw/Projects/family-prepared-template` — push it: from inside that dir, `gh repo create <your-user>/family-prepared-template --public --source=. --remote=origin --push`.
4. **Packs repo**: `gh repo create <your-user>/family-prepared-packs --public --description "Community-contributed packs for family-prepared"`. Inside it, commit a stub `packs.json`:
   ```json
   { "schema_version": 1, "packs": [] }
   ```
5. **Enable GitHub Pages** on the app repo: GitHub web UI → Settings → Pages → Source = "GitHub Actions". Sprint 0's `deploy-pages.yml` workflow will publish `dist/` on every push to `main`.
6. **Branch protection** on `main` for the app repo: Settings → Rules → Add ruleset → Branch protection. Require status checks `test`, `lint`, `pre-deploy` to pass; require PRs (no direct pushes — matches CLAUDE.md rule). Allow `auto-merge`.
7. Note these values for `.env.local` and CI:
   - `VITE_GITHUB_OWNER=<your-user>`
   - `VITE_TEMPLATE_REPO=<your-user>/family-prepared-template`
   - `VITE_PACKS_REPO=<your-user>/family-prepared-packs`
   - `VITE_REGISTRY_URL=https://raw.githubusercontent.com/<your-user>/family-prepared-packs/main/packs.json`

### B. Google Cloud — OAuth client for Drive

Drive sync (Sprint 2) needs a Google OAuth Client ID. **No client secret** is required for the browser-only implicit/Token-Client flow. Scope is **strictly `drive.file`** (per-file, app-created only) — this avoids Google's CASA security audit.

**Steps**:

1. Go to <https://console.cloud.google.com> → sign in with the Google account that will own the OAuth app.
2. **Create a project**: top bar → "Select a project" → "New project" → name `family-prepared-app` → Create. Switch to it.
3. **Enable the Drive API**: APIs & Services → Library → search "Google Drive API" → Enable.
4. **OAuth consent screen**: APIs & Services → OAuth consent screen.
   - User type: **External**.
   - App name: `family-prepared-app` · User support email: yours · Developer contact: yours.
   - Scopes: add **only** `https://www.googleapis.com/auth/drive.file`. Do **not** add `drive`, `drive.readonly`, or `drive.metadata` — those trigger the CASA audit.
   - Test users: add the Google accounts you'll test with (during Sprint 2 the app will be in "Testing" mode; production verification can wait until you're ready to publish).
5. **Create OAuth Client ID**: APIs & Services → Credentials → Create Credentials → **OAuth client ID** → Application type **Web application** → name `family-prepared-app web` → Authorized JavaScript origins:
   - `http://localhost:5173` (Vite dev)
   - `http://localhost:4173` (Vite preview)
   - `https://<your-user>.github.io` (Pages production)
   No "Authorized redirect URIs" needed — Google Identity Services token client is popup-based.
6. Copy the **Client ID** (looks like `1234567890-abc...apps.googleusercontent.com`).
7. Add to `.env.local` and to `.env.example` (empty value in the example):
   - `VITE_GOOGLE_CLIENT_ID=<the-client-id>`
8. **Add to GitHub Actions secrets**: app repo → Settings → Secrets and variables → Actions → New repository secret → name `VITE_GOOGLE_CLIENT_ID`, value as above. Also reference it in the workflow `env:` block (CLAUDE.md rule: any new env var lands in `.env.example` AND CI's env block).

⚠️ **OAuth scope discipline** — the [debugging-oauth-scope-root-cause-analysis](../../.agent-brain/ProjectMnemosyne/skills/debugging-oauth-scope-root-cause-analysis.md) skill describes a real incident where features broke for weeks because a scope was *quietly removed*. Document the chosen scope in `docs/adrs/ADR-00X-drive-scope.md` and never widen without an ADR.

### C. Local development environment (one-time per machine)

1. **Homebrew** (macOS): if not installed, `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`.
2. **Node + pnpm**: `brew install node pnpm`. Do **not** `npm i -g pnpm` — Safety Net blocks it. Verify: `node -v` (≥ 20), `pnpm -v` (≥ 10).
3. **GitHub CLI**: `brew install gh`. Auth: `gh auth login`.
4. **VS Code or your editor of choice** with the recommended extensions:
   - ESLint
   - Tailwind CSS IntelliSense
   - YAML (Red Hat)
   - Vitest
5. **Optional but recommended desktop tooling for Sprint 5 maps work**:
   - **QGIS** (free, <https://qgis.org>) — convert GeoTIFF/GeoPDF to tile pyramids
   - **GDAL** (`brew install gdal`) — `gdal_translate`, `gdaldem hillshade`
   - **`pmtiles` CLI** (<https://github.com/protomaps/go-pmtiles>) — `brew install protomaps/tap/pmtiles`
   - **`tippecanoe`** (`brew install tippecanoe`) — vector tile generation from GeoJSON

These map tools are only needed for **building** map packs, not for using the app. Most family users will install pre-built community packs from Sprint 6 onward.

### D. The `.env.local` you'll commit-not (and `.env.example` you will commit)

Keep this in the app repo root.

```bash
# .env.local — git-ignored, never committed
VITE_GOOGLE_CLIENT_ID=1234567890-abc...apps.googleusercontent.com
VITE_GITHUB_OWNER=<your-user>
VITE_TEMPLATE_REPO=<your-user>/family-prepared-template
VITE_PACKS_REPO=<your-user>/family-prepared-packs
VITE_REGISTRY_URL=https://raw.githubusercontent.com/<your-user>/family-prepared-packs/main/packs.json
```

```bash
# .env.example — committed, every key blank
VITE_GOOGLE_CLIENT_ID=
VITE_GITHUB_OWNER=
VITE_TEMPLATE_REPO=
VITE_PACKS_REPO=
VITE_REGISTRY_URL=
```

### E. End-to-end smoke after setup

Before writing any feature code, you should be able to:

1. `gh repo view <your-user>/family-prepared-app` — repo exists, Pages enabled.
2. `gh secret list --repo <your-user>/family-prepared-app` shows `VITE_GOOGLE_CLIENT_ID`.
3. From <https://console.cloud.google.com> → APIs & Services → Credentials, the OAuth client lists `http://localhost:5173` as an authorized origin.
4. From the app repo: `pnpm install && pnpm test --run && pnpm build` succeeds (after Sprint 0 lands).
5. From the deployed Pages URL `https://<your-user>.github.io/family-prepared-app/`, the PWA loads (after the first `main` push merges).

### F. What you do **not** need (deliberately)

- ❌ Any backend hosting (Vercel, Render, Fly, Railway). The app is 100% static.
- ❌ A database. IndexedDB on the device + ZIP snapshots in Drive replace it.
- ❌ Any paid map provider. USGS + NOAA + OSM are public-domain or open-licensed.
- ❌ A Google Cloud billing account. Drive API access stays inside the free tier with `drive.file` scope.
- ❌ A GitHub OAuth App (only relevant if we decide later to add GitHub-as-sync; Drive is the chosen remote).
- ❌ Domain registration. `https://<your-user>.github.io/family-prepared-app/` is the canonical URL until you decide otherwise.

---

## Open Questions (defer until they actually bite)

- **Multi-family OPSEC features** (challenge-response codes, manual encryption keys from research file 1) — design space, not MVP. Belongs in a Sprint 8+ "OPSEC" track.
- **AI assistance** (research mentions FEMA-CPG-trained agent) — explicit non-goal for offline-first MVP; revisit when registry is alive and we have community-validated content.
- **PACE Tier transitions automation** — research suggests auto-routing as connectivity degrades; out of scope for an MVP plan editor (would need network probes + radio integrations).
- **Native mobile** — PWA "Add to Home Screen" is sufficient until proven otherwise.

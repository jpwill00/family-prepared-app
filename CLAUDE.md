# family-prepared — Project Operating Manual

> Auto-loaded by Claude Code at the start of every session.
> Single source of truth for how to work in this codebase.

## Quick Links

| Topic | File |
|-------|------|
| React + Vite conventions | `.claude/shared/react-vite-patterns.md` |
| Tailwind + shadcn/ui rules | `.claude/shared/tailwind-shadcn-patterns.md` |
| Persistence (IndexedDB, YAML, ZIP, PDF) | `.claude/shared/persistence-patterns.md` |
| Zone rules + content registry + pack lifecycle | `.claude/shared/content-and-packs-patterns.md` |
| GitHub sync (Device Flow, Octokit, auto-create repo) | `.claude/shared/github-sync-patterns.md` |
| PWA + service worker rules | `.claude/shared/pwa-service-worker-rules.md` |
| PR workflow | `.claude/shared/pr-workflow.md` |
| Git commit policy | `.claude/shared/git-commit-policy.md` |
| Output style guidelines | `.claude/shared/output-style-guidelines.md` |
| Tool use optimization | `.claude/shared/tool-use-optimization.md` |
| Error handling | `.claude/shared/error-handling.md` |
| User guide (app usage, cloud backup, sharing) | `instructions/usage-guide.md` |
| Sharing plan with family (ZIP / GitHub / PDF) | `instructions/sharing-with-family.md` |

---

## What This App Does

Offline-first PWA for non-technical families to build, version, and share emergency-preparedness plans. Users copy a GitHub template repo and fill it in through a GUI — no terminal required. Plans are stored as Markdown + YAML (human-readable, git-versionable) and can be exported as a printable PDF or shareable ZIP pack.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 18 + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| State | Zustand |
| Storage | IndexedDB via idb-keyval |
| Serialization | js-yaml + remark |
| Pack I/O | jszip |
| PDF export | @react-pdf/renderer |
| Maps | react-leaflet + Leaflet |
| Routing | react-router-dom (data routers) |
| PWA | vite-plugin-pwa (Workbox) |
| Testing | Vitest + React Testing Library + Playwright |
| Linting | ESLint + typescript-eslint + eslint-plugin-jsx-a11y |
| Pre-commit | lefthook |
| Package manager | pnpm |
| Hosting | GitHub Pages |

---

## Critical Rules — Read Before Writing Any Code

### ❌ Never push directly to `main`
All changes go through a PR. See `.claude/shared/pr-workflow.md`.

### ❌ Never use `--no-verify`
See `.claude/shared/git-commit-policy.md`.

### ❌ Never write to `localStorage` or `IndexedDB` outside `lib/persistence/`
All persistence goes through `src/lib/persistence/*`. No exceptions.

```ts
// ❌ WRONG — direct idb-keyval in a component
import { set } from "idb-keyval";
await set("household", members);

// ✅ CORRECT — through the persistence module
import { saveRepo } from "@/lib/persistence/idb";
await saveRepo(updatedRepo);
```

### ❌ Never register the service worker outside `src/main.tsx`
See `.claude/shared/pwa-service-worker-rules.md`.

### ❌ Never access Google Drive API outside `src/lib/drive/`
Sprint 2 only. All Drive calls live in `lib/drive/auth.ts` and `lib/drive/sync.ts`.

### ❌ Never request Drive scopes broader than `drive.file`
The scope `https://www.googleapis.com/auth/drive.file` (app-created files only) is the maximum
permitted. Widening to `drive`, `drive.readonly`, or `drive.metadata` triggers Google's CASA
security audit and must be documented in an ADR before any code change.

### ❌ Never access GitHub API outside `src/lib/github/`
Sprint 6 only. Used read-only for the community pack registry — no auth, no writes.

### ✅ All YAML schemas need a Zod schema AND a round-trip test

```ts
// lib/schemas/plan.ts — Zod schema
// types/plan.ts — TypeScript types derived with z.infer<>
// tests/unit/persistence/yaml.test.ts — round-trip test
```

### ✅ Respect zone ownership on all writes

- `plan/` and `custom/` → freely writable by the user
- `library/` and `packs/` → read-only in GUI; "Fork to edit" copies to `custom/` first

### ✅ Adding a new `content_type` requires a code change + ADR

Adding a new **folder** of an existing type is a GUI-only action. Adding a new **type** (new renderer) requires a code change and an ADR in `docs/adrs/`.

### ✅ Sensitive fields get `secure: true` marker

```yaml
# In schema comments and _meta.yaml for Sprint 2 encryption pickup
field: ssn
secure: true
```

---

## Key File Paths

```
src/
├── main.tsx                    # Entry; registers SW (only here)
├── App.tsx                     # Router shell
├── routes/                     # One file = one page
│   ├── onboarding.tsx
│   ├── plan/                   # Zone: plan/
│   ├── library/                # Zone: library/ (read-only)
│   ├── packs/                  # Zone: packs/
│   ├── custom/                 # Zone: custom/
│   └── settings.tsx
├── components/
│   ├── ui/                     # shadcn/ui primitives (do not edit)
│   ├── plan/                   # Plan-specific components
│   ├── library/                # Library viewer components
│   ├── packs/                  # Import/export dialogs
│   ├── custom/                 # Markdown editor
│   └── shared/AppShell.tsx     # Sidebar + layout
├── lib/
│   ├── store/plan.ts           # Zustand store (full repo state)
│   ├── persistence/            # idb.ts | yaml.ts | zip.ts | pdf.tsx
│   ├── content/                # registry.ts | types.ts
│   ├── packs/                  # manifest.ts | import.ts | export.ts
│   ├── drive/                  # auth.ts | sync.ts (Sprint 2 — Google Drive backup)
│   ├── github/                 # registry.ts (Sprint 6 — read-only pack registry)
│   └── schemas/                # Zod schemas for all data types
├── styles/index.css            # Tailwind base + shadcn CSS vars
└── types/plan.ts               # TS types derived from Zod schemas
```

---

## Data Flow

```
User action (form, button)
        │
        ▼
Zustand store (plan.ts) ──── persists via ────▶ IndexedDB (idb-keyval)
        │                                             │
        ├──▶ Content registry → renderer              │ hydrates on startup
        │                                             │
        ├──▶ YAML serializer → ZIP export / PDF       │
        │                                             │
        └──▶ Drive sync adapter (Sprint 2)      ◀─────┘
```

---

## Common Commands

```bash
pnpm dev          # Start dev server (SW disabled in dev)
pnpm build        # Production build → dist/
pnpm preview      # Serve dist/ locally (tests PWA/SW)
pnpm test         # Watch mode tests
pnpm test --run   # Run tests once (CI mode)
pnpm lint         # ESLint check
pnpm typecheck    # tsc --noEmit
pnpm e2e          # Playwright end-to-end tests
```

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID for Drive sync (Sprint 2) |
| `VITE_GITHUB_OWNER` | GitHub username / org that owns the three repos |
| `VITE_TEMPLATE_REPO` | Seed library repo (e.g. `owner/family-prepared-template`) |
| `VITE_PACKS_REPO` | Community pack registry repo (e.g. `owner/family-prepared-packs`) |
| `VITE_REGISTRY_URL` | Community pack registry JSON URL — raw.githubusercontent.com (Sprint 6) |

---

## Git & Branch Conventions

- **Never work directly on `main`** — always branch first
  ```bash
  git checkout main && git pull
  git checkout -b {issue-number}-{short-description}
  ```
- Branch format: `{issue-number}-{short-description}`
- After `gh pr create`, CI auto-merges when all checks pass
- Full policy: `.claude/shared/git-commit-policy.md`

---

### Key Development Principles

1. KISS - *K*eep *I*t *S*imple *S*tupid -> Don't add complexity when a simpler solution works
1. YAGNI - *Y*ou *A*in't *G*onna *N*eed *I*t -> Don't add things until they are required
1. TDD - *T*est *D*riven *D*evelopment -> Write tests to drive the implementation
1. DRY - *D*on't *R*epeat *Y*ourself -> Don't duplicate functionality, data structures, or algorithms
1. SOLID - *S**O**L**I**D* ->
  . Single Responsibility
  . Open-Closed
  . Liskov Substitution
  . Interface Segregation
  . Dependency Inversion
1. Modularity - Develop independent modules through well defined interfaces
1. POLA - *P*rinciple *O*f *L*east *A*stonishment - Create intuitive and predictable interfaces to not surprise users

Relevant links:

- [Core Principles of Software Development](<https://softjourn.com/insights/core-principles-of-software-development>)
- [7 Common Programming Principles](<https://www.geeksforgeeks.org/blogs/7-common-programming-principles-that-every-developer-must-follow/>)
- [Software Development Principles](<https://coderower.com/blogs/software-development-principles-software-engineering>)
- [Clean Coding Principles](<https://www.pullchecklist.com/posts/clean-coding-principles>)

---

## CI/CD Workflow

Every PR to `main` triggers `.github/workflows/ci.yml`:

| Job | Required | What It Does |
|-----|----------|-------------|
| `test` | Yes | `pnpm test --run` |
| `lint` | Yes | `pnpm lint && pnpm typecheck` |
| `pre-deploy` | Yes | `.env.example` completeness, secrets scan, `pnpm build` |
| `auto-merge` | Yes (gate) | Merges PR via squash + deletes branch after all 3 pass |

Deploy to GitHub Pages: `.github/workflows/deploy-pages.yml` triggers on push to `main`.

---

## Test Suite

```bash
pnpm test --run           # Vitest unit + integration
pnpm e2e                  # Playwright e2e (requires pnpm build first)
```

Critical coverage targets:
- Zod schema validation for all data types
- YAML round-trip for all plan zones
- Pack manifest validation + import/export
- Content registry resolver for all built-in types

---

## Known Patterns to Watch For

1. Direct `localStorage`/`IndexedDB` call outside `lib/persistence/` → move it
2. `import yaml from "js-yaml"` or `import { get } from "idb-keyval"` in a component → move to persistence module
3. `navigator.serviceWorker.register` outside `main.tsx` → remove it
4. Write to a `library/` or `packs/` path without a "Fork to edit" guard → add zone check
5. New `content_type` added without an ADR → write the ADR
6. Zod schema added without a round-trip test → add the test
7. New env var in code → add it to `.env.example` AND to the CI `env:` block

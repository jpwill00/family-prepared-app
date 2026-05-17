# Family Prepared

An offline-first progressive web app for non-technical families to build, store, and share emergency preparedness plans. Fill in your household details, communications plan, evacuation routes, supply inventory, and important documents through a simple GUI — no terminal required.

**Data stays on your device.** Everything is stored locally in your browser (IndexedDB). No account, no server, no cloud required. Optionally back up to Google Drive.

---

## Using the App

### Live app (recommended)

Open the app in any modern browser — no installation needed:

**[https://jpwill00.github.io/family-prepared-app/](https://jpwill00.github.io/family-prepared-app/)**

### Install as a PWA (offline use)

Once the page loads, your browser will offer an "Install" or "Add to Home Screen" option. Installing gives you:
- A home screen icon
- Full offline access after the first load
- No app store required

> **Note:** Opening `index.html` directly from your filesystem will show a blank page. The app is built with Vite + TypeScript and requires a web server to run. Use the live URL above, or the `pnpm dev` command below if you're developing locally.

---

## Running Locally (developers)

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10

```bash
brew install node pnpm   # macOS
```

### Setup

```bash
git clone https://github.com/jpwill00/family-prepared-app.git
cd family-prepared-app
pnpm install
cp .env.example .env.local
# Edit .env.local — add VITE_GOOGLE_CLIENT_ID if you want Drive sync
```

### Dev server

```bash
pnpm dev
```

Opens at **http://localhost:5173**. Hot-reload is active; the service worker is disabled in dev mode so changes appear immediately.

### Production preview

```bash
pnpm build && pnpm preview
```

Opens at **http://localhost:4173**. Runs the full production build including the service worker — use this to test offline behavior and PWA install.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite + React 18 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Storage | IndexedDB (idb-keyval) |
| PWA | vite-plugin-pwa (Workbox) |
| Backup | Google Drive (optional) |
| Testing | Vitest + React Testing Library |

---

## Developer Guide

See [CLAUDE.md](CLAUDE.md) for the full operating manual: architecture, data flow, critical rules, branch conventions, CI/CD, and test suite.

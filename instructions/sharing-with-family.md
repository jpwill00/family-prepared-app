# Sharing Your Plan with Family

This guide explains how to share your emergency preparedness plan with family members
using Google Drive. Family members access the plan on their phones via the PWA — no
technical setup required on their end.

## How Sharing Works

```
Your device (plan author)
    ↓ Snapshot to Drive
Google Drive (your account)
    ↓ Share folder with family
Family member's phone (PWA)
    ↓ Restore from Drive
Their local copy (offline-ready)
```

1. You maintain the plan (via the app or Claude Code)
2. You push snapshots to your Google Drive
3. You share the Drive folder with family members
4. They connect their PWA to the same Drive folder and restore the latest snapshot

## Initial Setup (One Time)

### Step 1: Connect Your Google Drive

1. Open the app → **Settings**
2. Tap **Connect Google Drive**
3. A Google sign-in popup appears — sign in with your account
4. Grant permission (the app only accesses files it creates — nothing else in your Drive)
5. You'll see "Connected" with your email shown

### Step 2: Create Your First Snapshot

1. In Settings, tap **Snapshot Now**
2. Wait a few seconds — a ZIP file is uploaded to your Drive
3. You'll see confirmation with the timestamp

### Step 3: Share the Folder with Family

1. Open Google Drive (drive.google.com or the Drive app)
2. Find the folder called **family-prepared-app**
3. Right-click (or long-press on mobile) → **Share**
4. Add family members' email addresses
5. Set permission to **Viewer** (they only need to read, not edit)
6. Tap **Send**

Family members will receive an email notification that you shared a folder.

## Family Member Setup

Tell your family members to follow these steps:

### Step 1: Install the App

1. Open this link on your phone: `https://jpwill00.github.io/family-prepared-app/`
2. Add to home screen (see [Usage Guide](usage-guide.md) for detailed steps)
3. Open the app from your home screen

### Step 2: Connect to the Shared Drive

1. Open the app → **Settings**
2. Tap **Connect Google Drive**
3. Sign in with the Google account the folder was shared with
4. The app finds the shared `family-prepared-app` folder automatically

### Step 3: Restore the Plan

1. In Settings, tap **Restore Latest**
2. The most recent snapshot downloads and loads into the app
3. All plan sections are now populated with the family's data

### Step 4: Done

The plan is now on their device and works offline. They can browse all sections
without internet.

## Keeping the Plan Updated

When you update the plan:

1. Make your changes (in the app or via Claude Code)
2. Go to Settings → **Snapshot Now** (or run `pnpm run sync-plan` from the terminal)
3. Tell family members to open Settings → **Restore Latest**

The app does NOT auto-sync in the background. Family members need to manually
restore when you tell them there's an update. This is intentional — it prevents
accidental overwrites and keeps things simple.

## Multiple Plan Authors

If more than one family member needs to edit the plan:

- **Recommended**: One person is the "plan author" who maintains the canonical version.
  Others suggest changes verbally or via text, and the author updates the plan.

- **Alternative**: Multiple people edit, but coordinate who's updating when. The app uses
  last-write-wins — if two people snapshot at the same time, the later one overwrites.
  There's no merge. For most families, a single author avoids confusion.

## What Gets Shared (and What Doesn't)

| Included in snapshot | NOT included |
|---------------------|--------------|
| All plan data (household, comms, evacuation, inventory, documents, utilities) | Your Google Drive password |
| Custom articles you've written | Your passphrase (encryption key) |
| Library content | App settings (per-device) |

### About Encrypted Fields

If you set a passphrase, sensitive fields (SSN, DOB, etc.) are encrypted in the
snapshot. Family members who restore the snapshot will need to know the passphrase
to view those fields. Share the passphrase verbally or via a secure channel — never
put it in the Drive folder.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connect Drive" button does nothing | Check popup blocker; allow popups from this site |
| "Restore" shows nothing | Make sure the Drive folder is shared with their account |
| Old data showing after restore | Close and reopen the app to clear the cache |
| Can't see encrypted fields | They need the passphrase — ask the plan author |
| "Drive access was revoked" error | Reconnect: Settings → Disconnect → Connect again |

## Privacy Notes

- The app uses `drive.file` scope — it can only see files IT created in YOUR Drive
- It cannot read your other Drive files, emails, or any other data
- Snapshots are ZIP files containing YAML text — human-readable if you download them
- No data is sent to any server other than Google Drive (and only when you explicitly tap "Snapshot Now")
- The app works 100% offline; Drive is optional backup only

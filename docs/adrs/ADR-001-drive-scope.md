# ADR-001: Google Drive OAuth Scope — `drive.file` Only

**Status**: Accepted  
**Date**: 2026-05-16  
**Deciders**: Jordan Willoughby

## Context

The app (Sprint 2) syncs user plan data to Google Drive as versioned ZIP snapshots. OAuth requires a scope that permits reading and writing those files. Google offers several Drive scopes of increasing breadth:

| Scope | Description | CASA Audit Required |
|---|---|---|
| `drive.file` | Only files created or opened by this app | No |
| `drive.readonly` | Read all files | Yes |
| `drive` | Full read+write access | Yes |
| `drive.metadata` | Read metadata for all files | Yes |

## Decision

We use **`https://www.googleapis.com/auth/drive.file` only**. This is the minimum scope that allows the app to create, read, update, and delete its own snapshot ZIPs, while having **zero visibility** into any other Drive files. It is also the only Drive scope that does **not** trigger Google's CASA (Cloud Application Security Assessment) audit.

The app **must never request broader scopes** without:
1. A new ADR documenting the specific capability that requires it
2. Review of the CASA audit requirements and timeline

## Rationale

- **Privacy**: `drive.file` is the strongest guarantee we can offer users that the app does not read unrelated Drive content.
- **Compliance**: CASA is a multi-week security review process. Widening the scope without planning would block a release.
- **Fit for purpose**: Drive snapshot sync only needs to read/write files the app itself created. `drive.file` is exactly sufficient.

## Consequences

- Snapshot ZIPs that were not created or explicitly opened by this app instance cannot be listed or read. Workaround: if a user reinstalls the app, they must use the Drive Picker (which prompts the user to explicitly open a file, granting `drive.file` access to it).
- The app cannot list all snapshots across devices that used a different browser/install. The Drive Picker is the handshake that re-grants access.
- This scope decision is enforced in code: `src/lib/drive/auth.ts` exports `DRIVE_SCOPE` as a constant; no other Drive code may use a different scope string.

## References

- [Google Identity Services — Token Client](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Drive API Scopes](https://developers.google.com/drive/api/guides/api-specific-auth)
- `debugging-oauth-scope-root-cause-analysis` skill in ProjectMnemosyne (cautionary tale: silent scope removal caused weeks of failures)

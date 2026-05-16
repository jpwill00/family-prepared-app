import { useState, useEffect, useCallback } from "react";
import { Cloud, CloudOff, RefreshCw, RotateCcw, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { isDriveConnected, revokeDriveAccess } from "@/lib/drive/auth";
import { pushSnapshot, listSnapshots, restoreFromSnapshot } from "@/lib/drive/sync";
import { DriveAuthError } from "@/lib/drive/auth";
import { usePlanStore } from "@/lib/store/plan";
import { loadSyncMeta } from "@/lib/persistence/idb";
import type { SyncMeta } from "@/lib/persistence/idb";
import type { SnapshotMeta } from "@/lib/drive/sync";

type Status = "idle" | "connecting" | "syncing" | "restoring" | "error";

interface DriveState {
  connected: boolean;
  syncMeta: SyncMeta | null;
  snapshots: SnapshotMeta[];
  status: Status;
  error: string | null;
}

export default function DriveConnect() {
  const repo = usePlanStore((s) => s.repo);
  const store = usePlanStore();

  const [state, setState] = useState<DriveState>({
    connected: false,
    syncMeta: null,
    snapshots: [],
    status: "idle",
    error: null,
  });

  const refresh = useCallback(async () => {
    const [connected, syncMeta] = await Promise.all([
      isDriveConnected(),
      loadSyncMeta(),
    ]);
    if (connected) {
      try {
        const snapshots = await listSnapshots();
        setState((s) => ({ ...s, connected, syncMeta, snapshots, error: null }));
      } catch {
        setState((s) => ({ ...s, connected, syncMeta, snapshots: [] }));
      }
    } else {
      setState((s) => ({ ...s, connected, syncMeta, snapshots: [] }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleConnect() {
    setState((s) => ({ ...s, status: "connecting", error: null }));
    try {
      // Trigger auth by pushing first snapshot
      await pushSnapshot(repo);
      await refresh();
      setState((s) => ({ ...s, status: "idle" }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Connection failed.",
      }));
    }
  }

  async function handleSnapshot() {
    setState((s) => ({ ...s, status: "syncing", error: null }));
    try {
      await pushSnapshot(repo);
      await refresh();
      setState((s) => ({ ...s, status: "idle" }));
    } catch (err) {
      setState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Snapshot failed.",
      }));
    }
  }

  async function handleRestore(id: string) {
    setState((s) => ({ ...s, status: "restoring", error: null }));
    try {
      const restored = await restoreFromSnapshot(id);
      // Apply each zone that was in the snapshot
      if (restored.household) store.setHousehold(restored.household);
      if (restored.communicationPlan) store.setCommunicationPlan(restored.communicationPlan);
      if (restored.evacuationPlan) store.setEvacuationPlan(restored.evacuationPlan);
      if (restored.resourceInventory) store.setResourceInventory(restored.resourceInventory);
      if (restored.legalDocuments) store.setLegalDocuments(restored.legalDocuments);
      if (restored.utilityShutoffs) store.setUtilityShutoffs(restored.utilityShutoffs);
      setState((s) => ({ ...s, status: "idle" }));
    } catch (err) {
      const isAuthError = err instanceof DriveAuthError;
      setState((s) => ({
        ...s,
        status: "error",
        error: isAuthError
          ? "Drive access was revoked. Reconnect to continue."
          : err instanceof Error
          ? err.message
          : "Restore failed.",
        connected: isAuthError ? false : s.connected,
      }));
    }
  }

  async function handleDisconnect() {
    await revokeDriveAccess();
    setState({ connected: false, syncMeta: null, snapshots: [], status: "idle", error: null });
  }

  const busy = state.status !== "idle" && state.status !== "error";

  if (!state.connected) {
    return (
      <Section title="Google Drive Backup">
        <p className="mb-4 text-sm text-muted-foreground">
          Connect Google Drive to back up your plan as versioned ZIP snapshots.
          Your plan stays on this device — Drive is an optional backup, not the source of truth.
        </p>
        {state.error && <ErrorBanner message={state.error} />}
        <button
          onClick={handleConnect}
          disabled={busy}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <RefreshCw size={15} className="animate-spin" /> : <Cloud size={15} />}
          {busy ? "Connecting…" : "Connect Google Drive"}
        </button>
      </Section>
    );
  }

  return (
    <Section title="Google Drive Backup">
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle size={14} className="text-green-600" />
        <span>Connected</span>
        {state.syncMeta && (
          <span className="ml-1 text-xs">
            · Last snapshot: {new Date(state.syncMeta.lastPushAt).toLocaleString()}
          </span>
        )}
      </div>

      {state.error && <ErrorBanner message={state.error} />}

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleSnapshot}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {state.status === "syncing"
            ? <RefreshCw size={13} className="animate-spin" />
            : <Cloud size={13} />}
          Snapshot now
        </button>
        <button
          onClick={handleDisconnect}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          <CloudOff size={13} />
          Disconnect
        </button>
      </div>

      {state.snapshots.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Snapshots
          </p>
          <ul className="flex flex-col gap-1">
            {state.snapshots.map((snap) => (
              <li
                key={snap.id}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-mono text-xs">{snap.name.replace(".zip", "")}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatBytes(Number(snap.size))}
                  </span>
                </div>
                <button
                  onClick={() => handleRestore(snap.id)}
                  disabled={busy}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {state.status === "restoring"
                    ? <RefreshCw size={11} className="animate-spin" />
                    : <RotateCcw size={11} />}
                  Restore
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink size={11} />
            Manage sharing and older versions directly in{" "}
            <a
              href="https://drive.google.com/drive/search?q=family-prepared-app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Google Drive
            </a>.
          </p>
        </div>
      )}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

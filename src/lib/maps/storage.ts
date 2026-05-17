// All OPFS tile storage lives here. No other module may call navigator.storage.getDirectory().

const MAPS_DIR = "maps";

export interface StorageBudget {
  usedBytes: number;
  quotaBytes: number;
  usedFraction: number;
}

async function getMapsRoot(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(MAPS_DIR, { create: true });
}

async function getAreaDir(areaId: string): Promise<FileSystemDirectoryHandle> {
  const mapsRoot = await getMapsRoot();
  return mapsRoot.getDirectoryHandle(areaId, { create: true });
}

export async function writeTileFile(
  areaId: string,
  filename: string,
  data: ArrayBuffer
): Promise<void> {
  const dir = await getAreaDir(areaId);
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function readTileFile(
  areaId: string,
  filename: string
): Promise<ArrayBuffer | null> {
  try {
    const dir = await getAreaDir(areaId);
    const fileHandle = await dir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    return file.arrayBuffer();
  } catch {
    return null;
  }
}

export async function deleteTileArea(areaId: string): Promise<void> {
  try {
    const mapsRoot = await getMapsRoot();
    await mapsRoot.removeEntry(areaId, { recursive: true });
  } catch {
    // area doesn't exist — nothing to delete
  }
}

export async function listTileFiles(areaId: string): Promise<string[]> {
  try {
    const dir = await getAreaDir(areaId);
    const names: string[] = [];
    for await (const name of dir.keys()) {
      names.push(name);
    }
    return names.sort();
  } catch {
    return [];
  }
}

export async function getStorageBudget(): Promise<StorageBudget> {
  const estimate = await navigator.storage.estimate();
  const used = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;
  return {
    usedBytes: used,
    quotaBytes: quota,
    usedFraction: quota > 0 ? used / quota : 0,
  };
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage.persist) return false;
  return navigator.storage.persist();
}

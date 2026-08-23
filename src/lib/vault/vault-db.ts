/**
 * OMNI VAULT — IndexedDB persistence layer for processed files.
 *
 * One object store ("files") keyed by id with a createdAt index. Blobs are
 * stored directly (IndexedDB supports Blob values), so media never touches
 * the filesystem until the user downloads.
 */

export type VaultKind = "video" | "audio" | "image" | "pdf" | "file";

export interface VaultItem {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: VaultKind;
  createdAt: number;
  blob: Blob;
}

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
  percent: number;
}

const DB_NAME = "omni-vault";
const DB_VERSION = 1;
const STORE = "files";

/* ------------------------------------------------------------------ */
/* Database lifecycle                                                  */
/* ------------------------------------------------------------------ */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("vault open failed"));
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("vault op failed"));
      }),
  );
}

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export function vaultList(): Promise<VaultItem[]> {
  return tx<VaultItem[]>("readonly", (s) => s.getAll() as IDBRequest<VaultItem[]>).then(
    (items) => items.sort((a, b) => b.createdAt - a.createdAt),
  );
}

export function vaultPut(item: VaultItem): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.put(item));
}

export function vaultDelete(id: string): Promise<undefined> {
  return tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export function vaultClear(): Promise<undefined> {
  return tx("readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function vaultKindForMime(mime: string): VaultKind {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export function newVaultId(): string {
  return `vt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function vaultEstimate(): Promise<StorageEstimateInfo> {
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usage,
      quota,
      percent: quota > 0 ? usage / quota : 0,
    };
  }
  return { usage: 0, quota: 0, percent: 0 };
}

/** Verifies persistence is actually durable (best-effort request). */
export async function vaultRequestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* not supported — vault still works, may be evicted under pressure */
  }
  return false;
}

/** Minimal IndexedDB helpers for offline cache / mutation queue */

const DB_NAME = "asaka-crm-offline";
const DB_VERSION = 1;

export const STORE_API = "api-cache";
export const STORE_MUTATIONS = "mutation-queue";

type StoreName = typeof STORE_API | typeof STORE_MUTATIONS;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_API)) {
        db.createObjectStore(STORE_API, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        db.createObjectStore(STORE_MUTATIONS, { keyPath: "id" });
      }
    };
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let request: IDBRequest<T> | undefined;
    try {
      const result = run(store);
      if (result) request = result;
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error ?? new Error("IDB tx failed"));
    if (request) {
      request.onerror = () => reject(request!.error ?? new Error("IDB request failed"));
    }
  });
}

export async function idbGet<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  try {
    return await withStore<T>(storeName, "readonly", (store) => store.get(key));
  } catch {
    return undefined;
  }
}

export async function idbPut(storeName: StoreName, value: unknown): Promise<void> {
  try {
    await withStore(storeName, "readwrite", (store) => {
      store.put(value);
    });
  } catch {
    // ignore quota / private mode
  }
}

export async function idbDelete(storeName: StoreName, key: string): Promise<void> {
  try {
    await withStore(storeName, "readwrite", (store) => {
      store.delete(key);
    });
  } catch {
    // ignore
  }
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  try {
    const rows = await withStore<T[]>(storeName, "readonly", (store) => store.getAll());
    return rows ?? [];
  } catch {
    return [];
  }
}

export async function idbClear(storeName: StoreName): Promise<void> {
  try {
    await withStore(storeName, "readwrite", (store) => {
      store.clear();
    });
  } catch {
    // ignore
  }
}

export async function idbCount(storeName: StoreName): Promise<number> {
  try {
    const count = await withStore<number>(storeName, "readonly", (store) =>
      store.count()
    );
    return count ?? 0;
  } catch {
    return 0;
  }
}

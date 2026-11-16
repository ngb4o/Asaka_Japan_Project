/** IndexedDB store for the last successful API responses. */

const DB_NAME = "kho-offline";
const DB_VERSION = 1;

export const STORE_API = "api-cache";

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
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_API, mode);
    const store = tx.objectStore(STORE_API);
    let request: IDBRequest<T> | undefined;
    try {
      const result = run(store);
      if (result) request = result;
    } catch (error) {
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(request ? request.result : undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("IDB tx failed"));
    };
    if (request) {
      request.onerror = () => reject(request?.error ?? new Error("IDB request failed"));
    }
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await withStore<T>("readonly", (store) => store.get(key));
  } catch {
    return undefined;
  }
}

export async function idbPut(value: unknown): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      store.put(value);
    });
  } catch {
    // Quota or private mode: viewing still works for anything already stored.
  }
}

export async function idbGetAll<T>(): Promise<T[]> {
  try {
    const rows = await withStore<T[]>("readonly", (store) => store.getAll());
    return rows ?? [];
  } catch {
    return [];
  }
}

export async function idbDelete(key: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      store.delete(key);
    });
  } catch {
    // ignore
  }
}

export async function idbClear(): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      store.clear();
    });
  } catch {
    // ignore
  }
}

export async function idbCount(): Promise<number> {
  try {
    const count = await withStore<number>("readonly", (store) => store.count());
    return count ?? 0;
  } catch {
    return 0;
  }
}

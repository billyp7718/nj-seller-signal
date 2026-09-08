import type { ImportLead } from "./modiv";

const DB_NAME = "nj-seller-signal-pilot";
const STORE_NAME = "leads";
const DB_VERSION = 2;
const WRITE_BATCH_SIZE = 1000;

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "parcelId" });
      if (!store.indexNames.contains("score")) store.createIndex("score", "score");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalLeads(leads: ImportLead[]) {
  const db = await openDatabase();
  for (let start = 0; start < leads.length; start += WRITE_BATCH_SIZE) {
    const batch = leads.slice(start, start + WRITE_BATCH_SIZE);
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      for (const lead of batch) store.put(lead);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  db.close();
}

export async function getLocalLeadCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  const db = await openDatabase();
  const count = await new Promise<number>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return count;
}

export async function getLocalLeads(limit = 100, offset = 0): Promise<ImportLead[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDatabase();
  const rows = await new Promise<ImportLead[]>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .index("score")
      .openCursor(null, "prev");
    const results: ImportLead[] = [];
    let skipped = 0;

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || results.length >= limit) {
        resolve(results);
        return;
      }
      if (skipped < offset) skipped += 1;
      else results.push(cursor.value as ImportLead);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

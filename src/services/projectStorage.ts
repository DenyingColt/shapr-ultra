/**
 * Offline-First IndexedDB Project Studio Storage Engine
 * Persists full 3D CAD workspaces (B-Rep bodies, 2D sketches, parametric variables,
 * feature history DAG, and WebGL thumbnails) directly on the user's Android tablet or desktop.
 */

export interface StoredProjectRecord {
  id: string;
  name: string;
  category: string;
  updatedAt: number;
  bodyCount: number;
  fileSizeKb: number;
  thumbnailDataUrl: string;
  serializedPayload: string; // Native .SHAPRX JSON payload
}

const DB_NAME = 'shapr_pro_cad_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProjectRecordToIDB(
  record: StoredProjectRecord
): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('IndexedDB save fallback to localStorage:', err);
    try {
      localStorage.setItem(`shapr_proj_${record.id}`, JSON.stringify(record));
    } catch {
      // Ignore quota errors
    }
  }
}

export async function listAllProjectsFromIDB(): Promise<StoredProjectRecord[]> {
  try {
    const db = await openDatabase();
    const records = await new Promise<StoredProjectRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredProjectRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return records.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getProjectFromIDB(
  id: string
): Promise<StoredProjectRecord | null> {
  try {
    const db = await openDatabase();
    const rec = await new Promise<StoredProjectRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoredProjectRecord) || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rec;
  } catch {
    return null;
  }
}

export async function deleteProjectFromIDB(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}

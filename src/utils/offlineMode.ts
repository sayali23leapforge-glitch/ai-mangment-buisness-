/**
 * Offline Mode Service - Pro Plan Feature
 * Enables app to work offline with automatic sync when connection restored
 * Uses IndexedDB for persistent storage
 */

export interface OfflineData {
  products: Array<any>;
  sales: Array<any>;
  lastSyncTime: number;
}

const DB_NAME = "nayance-offline-db";
const DB_VERSION = 1;
const STORE_NAMES = {
  products: "products",
  sales: "sales",
  metadata: "metadata",
};

/**
 * Initialize IndexedDB for offline mode
 */
export async function initializeOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if not exist
      if (!db.objectStoreNames.contains(STORE_NAMES.products)) {
        db.createObjectStore(STORE_NAMES.products, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.sales)) {
        db.createObjectStore(STORE_NAMES.sales, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.metadata)) {
        db.createObjectStore(STORE_NAMES.metadata, { keyPath: "key" });
      }
    };
  });
}

/**
 * Save products to offline storage
 */
export async function saveProductsOffline(
  products: Array<any>
): Promise<void> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.products], "readwrite");
  const store = transaction.objectStore(STORE_NAMES.products);

  // Clear existing products
  store.clear();

  // Save new products
  products.forEach((product) => {
    store.add(product);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("✅ Offline: Products saved to IndexedDB");
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Retrieve products from offline storage
 */
export async function getProductsOffline(): Promise<Array<any>> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.products], "readonly");
  const store = transaction.objectStore(STORE_NAMES.products);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save sales to offline queue (synced when online)
 */
export async function saveSaleOffline(sale: any): Promise<void> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.sales], "readwrite");
  const store = transaction.objectStore(STORE_NAMES.sales);

  store.add({
    ...sale,
    synced: false,
    timestamp: new Date().toISOString(),
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("✅ Offline: Sale queued for sync");
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get unsynchronized sales from offline storage
 */
export async function getUnsyncedSales(): Promise<Array<any>> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.sales], "readonly");
  const store = transaction.objectStore(STORE_NAMES.sales);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const unsynced = request.result.filter((item) => !item.synced);
      resolve(unsynced);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark sales as synced
 */
export async function markSalesAsSynced(saleIds: number[]): Promise<void> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.sales], "readwrite");
  const store = transaction.objectStore(STORE_NAMES.sales);

  saleIds.forEach((id) => {
    const request = store.get(id);
    request.onsuccess = () => {
      const sale = request.result;
      if (sale) {
        sale.synced = true;
        store.put(sale);
      }
    };
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      console.log("✅ Offline: Sales marked as synced");
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Check if app is currently online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Sync offline data when connection is restored
 */
export async function syncOfflineData(
  onSyncProgress?: (status: string) => void
): Promise<void> {
  if (!isOnline()) {
    console.log("📡 Offline: Still offline, cannot sync");
    return;
  }

  try {
    onSyncProgress?.("🔄 Syncing offline data...");

    const unsyncedSales = await getUnsyncedSales();

    if (unsyncedSales.length === 0) {
      onSyncProgress?.("✅ All data is up to date");
      return;
    }

    // Send to server
    const response = await fetch("/api/sync-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales: unsyncedSales }),
    });

    if (response.ok) {
      const syncedIds = unsyncedSales.map((sale) => sale.id);
      await markSalesAsSynced(syncedIds);
      onSyncProgress?.(
        `✅ Synced ${unsyncedSales.length} sale${unsyncedSales.length > 1 ? "s" : ""}`
      );
    } else {
      onSyncProgress?.("❌ Sync failed, will retry");
    }
  } catch (error) {
    console.error("❌ Offline sync error:", error);
    onSyncProgress?.("❌ Sync error: " + (error as Error).message);
  }
}

/**
 * Get last sync time
 */
export async function getLastSyncTime(): Promise<number | null> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.metadata], "readonly");
  const store = transaction.objectStore(STORE_NAMES.metadata);

  return new Promise((resolve, reject) => {
    const request = store.get("lastSyncTime");
    request.onsuccess = () => {
      resolve(request.result?.value || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update last sync time
 */
export async function updateSyncTime(): Promise<void> {
  const db = await initializeOfflineDB();
  const transaction = db.transaction([STORE_NAMES.metadata], "readwrite");
  const store = transaction.objectStore(STORE_NAMES.metadata);

  store.put({
    key: "lastSyncTime",
    value: Date.now(),
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Listen for online/offline events
 */
export function setupOfflineLiveMode(
  callbacks: {
    onOnline?: () => void;
    onOffline?: () => void;
  }
): void {
  window.addEventListener("online", async () => {
    console.log("🟢 Connection restored!");
    callbacks.onOnline?.();
    await updateSyncTime();
    await syncOfflineData();
  });

  window.addEventListener("offline", () => {
    console.log("🔴 Connection lost - app is now offline");
    callbacks.onOffline?.();
  });
}

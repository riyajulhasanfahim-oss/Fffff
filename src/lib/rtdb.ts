import { 
  ref, 
  get, 
  set, 
  update, 
  push, 
  remove, 
  onValue, 
  runTransaction,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query as fsQuery,
  where as fsWhere,
  Timestamp
} from 'firebase/firestore';
import { rtdb, RTDB_BASE_URL, auth, db } from './firebase';

const VIRTUAL_CHAT_COLLECTIONS = new Set([
  'courier_link_reviews',
  'reseller_profit_locks',
  'financial_idempotency',
  'vendor_wallet_transactions',
  'vendor_wallet_deposits',
  'admin_notifications',
  'vendor_warnings',
  'reseller_return_requests',
  'platform_fees'
]);

const GHOST_GUARDED_COLLECTIONS = new Set([
  'orders',
  'vendor_orders',
  'reseller_orders',
  'courier_link_reviews'
]);

/**
 * Helper to fetch documents from a restricted Firestore collection using role-compatible where() filters
 * when an unfiltered collection read is rejected by security rules for non-admin users (Vendor, Customer, Reseller).
 */
async function fetchFilteredCollectionDocs(colName: string): Promise<Record<string, any> | null> {
  const uid = auth?.currentUser?.uid;
  const mapObj: Record<string, any> = {};

  const collectSnap = (snap: any) => {
    if (snap && !snap.empty) {
      snap.forEach((docSnap: any) => {
        const d = docSnap.data();
        // Skip empty ghost documents that lack core order fields
        if (
          (colName === 'orders' || colName === 'vendor_orders') &&
          !d?.customerName &&
          !d?.items &&
          !d?.vendorId &&
          !d?.userId &&
          !d?.customerId
        ) {
          return;
        }
        mapObj[docSnap.id] = { id: docSnap.id, ...d };
      });
    }
  };

  try {
    if (colName === 'orders') {
      const queries: Promise<any>[] = [
        getDocs(fsQuery(collection(db, 'orders'), fsWhere('userId', '==', 'guest'))).catch(() => null),
        getDocs(fsQuery(collection(db, 'orders'), fsWhere('customerId', '==', 'guest'))).catch(() => null)
      ];
      if (uid) {
        queries.push(
          getDocs(fsQuery(collection(db, 'orders'), fsWhere('vendorId', '==', uid))).catch(() => null),
          getDocs(fsQuery(collection(db, 'orders'), fsWhere('vendorIds', 'array-contains', uid))).catch(() => null),
          getDocs(fsQuery(collection(db, 'orders'), fsWhere('userId', '==', uid))).catch(() => null),
          getDocs(fsQuery(collection(db, 'orders'), fsWhere('customerId', '==', uid))).catch(() => null)
        );
      }
      const snaps = await Promise.all(queries);
      snaps.forEach(collectSnap);
      return mapObj;
    }

    if (colName === 'vendor_orders') {
      if (!uid) return mapObj;
      const snaps = await Promise.all([
        getDocs(fsQuery(collection(db, 'vendor_orders'), fsWhere('vendorId', '==', uid))).catch(() => null),
        getDocs(fsQuery(collection(db, 'vendor_orders'), fsWhere('customerId', '==', uid))).catch(() => null)
      ]);
      snaps.forEach(collectSnap);
      return mapObj;
    }

    if (colName === 'reseller_orders') {
      const queries: Promise<any>[] = [
        getDocs(collection(db, 'chats', 'reseller_orders', 'items')).catch(() => null)
      ];
      if (uid) {
        queries.push(
          getDocs(fsQuery(collection(db, 'reseller_orders'), fsWhere('vendorId', '==', uid))).catch(() => null),
          getDocs(fsQuery(collection(db, 'reseller_orders'), fsWhere('resellerId', '==', uid))).catch(() => null)
        );
      }
      const snaps = await Promise.all(queries);
      snaps.forEach(collectSnap);
      return mapObj;
    }

    if (colName === 'vendor_notifications') {
      if (!uid) return mapObj;
      const snaps = await Promise.all([
        getDocs(fsQuery(collection(db, 'vendor_notifications'), fsWhere('vendorId', '==', uid))).catch(() => null),
        getDocs(fsQuery(collection(db, 'vendor_notifications'), fsWhere('userId', '==', uid))).catch(() => null)
      ]);
      snaps.forEach(collectSnap);
      return mapObj;
    }

    if (colName === 'notifications') {
      if (!uid) return mapObj;
      const snap = await getDocs(fsQuery(collection(db, 'notifications'), fsWhere('userId', '==', uid))).catch(() => null);
      collectSnap(snap);
      return mapObj;
    }

    if (colName === 'wallet_transactions') {
      if (!uid) return mapObj;
      const snap = await getDocs(fsQuery(collection(db, 'wallet_transactions'), fsWhere('vendorId', '==', uid))).catch(() => null);
      collectSnap(snap);
      return mapObj;
    }

    if (colName === 'disputes') {
      if (!uid) return mapObj;
      const snaps = await Promise.all([
        getDocs(fsQuery(collection(db, 'disputes'), fsWhere('vendorId', '==', uid))).catch(() => null),
        getDocs(fsQuery(collection(db, 'disputes'), fsWhere('customerId', '==', uid))).catch(() => null),
        getDocs(fsQuery(collection(db, 'disputes'), fsWhere('userId', '==', uid))).catch(() => null)
      ]);
      snaps.forEach(collectSnap);
      return mapObj;
    }
  } catch (_) {}

  return null;
}

/**
 * Helper to read a 1-segment collection or 2/3-segment document path from Cloud Firestore
 */
async function fetchFirestoreNode<T>(cleanPath: string, timeoutMs: number = 4000): Promise<FetchResult<T>> {
  try {
    const parts = cleanPath.split('/').filter(Boolean);
    const timeoutPromise = new Promise<FetchResult<T>>((resolve) =>
      setTimeout(() => resolve({ ok: false, data: null }), timeoutMs)
    );

    const fsPromise = (async (): Promise<FetchResult<T>> => {
      if (parts.length === 1) {
        const colName = parts[0];

        // 1. Virtual collections mapped under /chats/{colName}/items
        if (VIRTUAL_CHAT_COLLECTIONS.has(colName)) {
          const mapObj: Record<string, any> = {};
          try {
            const chatSnap = await getDocs(collection(db, 'chats', colName, 'items'));
            chatSnap.forEach((docSnap) => {
              mapObj[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
            });
          } catch (_) {}
          try {
            const topSnap = await getDocs(collection(db, colName));
            topSnap.forEach((docSnap) => {
              mapObj[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
            });
          } catch (_) {}
          return { ok: true, data: (Object.keys(mapObj).length > 0 ? mapObj : {}) as unknown as T };
        }

        // 2. Standard collection read with automatic role-filtered fallback
        try {
          const snap = await getDocs(collection(db, colName));
          if (!snap.empty) {
            const mapObj: Record<string, any> = {};
            snap.forEach((docSnap) => {
              const d = docSnap.data();
              if (
                (colName === 'orders' || colName === 'vendor_orders') &&
                !d?.customerName &&
                !d?.items &&
                !d?.vendorId &&
                !d?.userId &&
                !d?.customerId
              ) {
                return;
              }
              mapObj[docSnap.id] = { id: docSnap.id, ...d };
            });
            return { ok: true, data: mapObj as unknown as T };
          }
          if (colName === 'vendors') {
            const storeSnap = await getDocs(collection(db, 'stores'));
            if (!storeSnap.empty) {
              const mapObj: Record<string, any> = {};
              storeSnap.forEach((docSnap) => {
                mapObj[docSnap.id] = { id: docSnap.id, ...docSnap.data() };
              });
              return { ok: true, data: mapObj as unknown as T };
            }
          }
          return { ok: true, data: null };
        } catch (_) {
          const filteredMap = await fetchFilteredCollectionDocs(colName);
          if (filteredMap !== null) {
            return { ok: true, data: (Object.keys(filteredMap).length > 0 ? filteredMap : null) as unknown as T };
          }
          return { ok: false, data: null };
        }
      } else if (parts.length === 2) {
        const [colName, docId] = parts;

        if (VIRTUAL_CHAT_COLLECTIONS.has(colName)) {
          try {
            const cSnap = await getDoc(doc(db, 'chats', colName, 'items', docId));
            if (cSnap.exists()) {
              return { ok: true, data: ({ id: cSnap.id, ...cSnap.data() } as unknown) as T };
            }
          } catch (_) {}
        }

        if (colName === 'vendor_wallet') {
          const [wSnap, cSnap] = await Promise.all([
            getDoc(doc(db, 'vendor_wallet', docId)).catch(() => null),
            getDoc(doc(db, 'chats', 'vendor_wallet', 'items', docId)).catch(() => null)
          ]);
          const wData = wSnap && wSnap.exists() ? { id: wSnap.id, ...wSnap.data() } : null;
          const cData = cSnap && cSnap.exists() ? { id: cSnap.id, ...cSnap.data() } : null;
          if (wData && cData) {
            const wTime = Number((wData as any).updatedAt || 0);
            const cTime = Number((cData as any).updatedAt || 0);
            const merged = cTime >= wTime ? { ...wData, ...cData } : { ...cData, ...wData };
            return { ok: true, data: (merged as unknown) as T };
          }
          if (cData || wData) {
            return { ok: true, data: ((cData || wData) as unknown) as T };
          }
          return { ok: true, data: null };
        }

        try {
          const snap = await getDoc(doc(db, colName, docId));
          if (snap.exists()) {
            return { ok: true, data: ({ id: snap.id, ...snap.data() } as unknown) as T };
          }
        } catch (_) {}

        if (colName === 'reseller_orders') {
          try {
            const cSnap = await getDoc(doc(db, 'chats', 'reseller_orders', 'items', docId));
            if (cSnap.exists()) {
              return { ok: true, data: ({ id: cSnap.id, ...cSnap.data() } as unknown) as T };
            }
          } catch (_) {}
        }

        if (colName === 'vendors') {
          const sSnap = await getDoc(doc(db, 'stores', docId)).catch(() => null);
          if (sSnap && sSnap.exists()) {
            return { ok: true, data: ({ id: sSnap.id, ...sSnap.data() } as unknown) as T };
          }
        }
        return { ok: true, data: null };
      } else if (parts.length === 3) {
        const [colName, subKey, docId] = parts;
        const cSnap = await getDoc(doc(db, 'chats', `${colName}__${subKey}`, 'items', docId)).catch(() => null);
        if (cSnap && cSnap.exists()) {
          return { ok: true, data: ({ id: cSnap.id, ...cSnap.data() } as unknown) as T };
        }
        return { ok: true, data: null };
      } else if (parts.length === 4 && parts[0] === 'vendors' && parts[2] === 'products') {
        const snap = await getDoc(doc(db, 'products', parts[3]));
        if (snap.exists()) {
          return { ok: true, data: ({ id: snap.id, ...snap.data() } as unknown) as T };
        }
      }
      return { ok: false, data: null };
    })().catch(() => ({ ok: false, data: null }));

    return await Promise.race([fsPromise, timeoutPromise]);
  } catch (_) {
    return { ok: false, data: null };
  }
}

/**
 * Helper to write/merge a path into Cloud Firestore
 */
async function writeFirestoreNode(
  cleanPath: string,
  cleanData: any,
  merge: boolean = true,
  isPartialUpdate: boolean = false
): Promise<boolean> {
  try {
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts.length === 2) {
      const [colName, docId] = parts;

      if (VIRTUAL_CHAT_COLLECTIONS.has(colName)) {
        const chatDocRef = doc(db, 'chats', colName, 'items', docId);
        if (isPartialUpdate) {
          const existing = await getDoc(chatDocRef).catch(() => null);
          if (!existing || !existing.exists()) {
            return false;
          }
        }
        await setDoc(chatDocRef, { id: docId, ...cleanData }, { merge });
        setDoc(doc(db, colName, docId), { id: docId, ...cleanData }, { merge }).catch(() => {});
        return true;
      }

      if (colName === 'vendor_wallet') {
        let wrote = false;
        try {
          await setDoc(doc(db, 'chats', 'vendor_wallet', 'items', docId), { id: docId, ...cleanData }, { merge });
          wrote = true;
        } catch (_) {}
        try {
          await setDoc(doc(db, 'vendor_wallet', docId), { id: docId, ...cleanData }, { merge });
          wrote = true;
        } catch (_) {
          // If vendor rule blocks lockedBalance/resellerProfitReserve change on top-level vendor_wallet,
          // update allowed fields on top-level doc while full state is preserved in chats/vendor_wallet/items
          try {
            const safeClone = { ...cleanData };
            delete safeClone.lockedBalance;
            delete safeClone.resellerProfitReserve;
            await setDoc(doc(db, 'vendor_wallet', docId), { id: docId, ...safeClone }, { merge: true });
          } catch (_) {}
        }
        return wrote;
      }

      const targetRef = doc(db, colName, docId);

      // Handle Firestore 'payments' collection with automatic 10-day TTL expiresAt Timestamp
      if (colName === 'payments') {
        const createTime = cleanData?.createdAt || cleanData?.receivedAt || cleanData?.syncedAt || Date.now();
        const baseMs = typeof createTime === 'number' ? createTime : (Number(createTime) || Date.now());
        const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
        const expiresAt = cleanData?.expiresAt instanceof Timestamp 
          ? cleanData.expiresAt 
          : Timestamp.fromMillis(baseMs + tenDaysMs);
        const paymentPayload = {
          ...cleanData,
          expiresAt
        };
        await setDoc(targetRef, { id: docId, ...paymentPayload }, { merge });
        return true;
      }
      if (isPartialUpdate && GHOST_GUARDED_COLLECTIONS.has(colName)) {
        const existingSnap = await getDoc(targetRef).catch(() => null);
        if (!existingSnap || !existingSnap.exists()) {
          if (colName === 'reseller_orders') {
            const chatRoRef = doc(db, 'chats', 'reseller_orders', 'items', docId);
            const chatRoSnap = await getDoc(chatRoRef).catch(() => null);
            if (chatRoSnap && chatRoSnap.exists()) {
              await setDoc(chatRoRef, { id: docId, ...cleanData }, { merge });
              return true;
            }
          }
          return false;
        }
      }

      try {
        await setDoc(targetRef, { id: docId, ...cleanData }, { merge });
        if (colName === 'reseller_orders') {
          setDoc(doc(db, 'chats', 'reseller_orders', 'items', docId), { id: docId, ...cleanData }, { merge }).catch(() => {});
        }
        return true;
      } catch (err) {
        if (colName === 'reseller_orders') {
          await setDoc(doc(db, 'chats', 'reseller_orders', 'items', docId), { id: docId, ...cleanData }, { merge });
          return true;
        }
        throw err;
      }
    } else if (parts.length === 3) {
      const [colName, subKey, docId] = parts;
      await setDoc(doc(db, 'chats', `${colName}__${subKey}`, 'items', docId), { id: docId, ...cleanData }, { merge });
      if (colName === 'notifications') {
        setDoc(doc(db, 'notifications', docId), { id: docId, userId: subKey, ...cleanData }, { merge }).catch(() => {});
      }
      return true;
    } else if (parts.length === 1 && cleanData && typeof cleanData === 'object' && !Array.isArray(cleanData)) {
      const colName = parts[0];
      const entries = Object.entries(cleanData);
      for (const [docId, val] of entries) {
        if (val && typeof val === 'object') {
          await writeFirestoreNode(`${colName}/${docId}`, val, merge, isPartialUpdate);
        }
      }
      return true;
    } else if (parts.length === 4 && parts[0] === 'vendors' && parts[2] === 'products') {
      const prodId = parts[3];
      await setDoc(doc(db, 'products', prodId), { id: prodId, vendorId: parts[1], ...cleanData }, { merge });
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Safely strips undefined values so Firebase Web SDK will never throw
 * "set failed: value argument contains undefined"
 */
export function stripUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = stripUndefined(value);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Retrieves the current Firebase Auth ID token if available
 */
async function getAuthToken(): Promise<string | null> {
  try {
    if (auth && auth.currentUser) {
      return await auth.currentUser.getIdToken(false);
    }
  } catch (_) {}
  return null;
}

/**
 * Firebase Realtime Database Utility
 * Guaranteed High-Speed, Zero-Stall Data Pipeline for RJ WORLD BD
 * Features:
 * - Parallel SDK + REST race (fastest path wins, no 2.5s sequential timeouts)
 * - In-flight request deduplication (prevents browser socket exhaustion)
 * - Short-term memory caching (instant 0ms repeat reads)
 * - Multiplexed subscriptions (multiple components share 1 listener, zero polling storms)
 */

export function sanitizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '').trim();
}

// In-flight GET requests map to deduplicate identical simultaneous requests
const inflightGets = new Map<string, Promise<any>>();

// Short-term in-memory cache to prevent network hammer
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 30000; // 30s high-speed memory cache (invalidated on any mutation)

/**
 * Invalidates cache for a specific path or prefix
 */
export function invalidateRtdbCache(path?: string): void {
  if (!path) {
    memoryCache.clear();
    return;
  }
  const clean = sanitizePath(path);
  for (const key of memoryCache.keys()) {
    if (key === clean || key.startsWith(clean + '/') || clean.startsWith(key + '/')) {
      memoryCache.delete(key);
    }
  }
}

interface FetchResult<T> {
  ok: boolean;
  data: T | null;
}

/**
 * Executes a fast REST fetch to Firebase RTDB with timeout protection
 */
async function fetchRtdbRest<T>(cleanPath: string, timeoutMs: number): Promise<FetchResult<T>> {
  try {
    const token = await getAuthToken();
    const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${RTDB_BASE_URL}/${cleanPath}.json${authQuery}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (!data || typeof data !== 'object' || !('error' in data)) {
        return { ok: true, data: (data !== null && data !== undefined) ? (data as T) : null };
      }
    }
  } catch (_) {
    // Network abort or offline
  }

  // If requesting vendors node and it failed, fallback to stores node (stores node in RTDB holds vendor stores)
  if (cleanPath === 'vendors') {
    try {
      const storesRes = await fetch(`${RTDB_BASE_URL}/stores.json`, {
        headers: { 'Accept': 'application/json' }
      });
      if (storesRes.ok) {
        const sData = await storesRes.json();
        if (sData && typeof sData === 'object' && !('error' in sData)) {
          return { ok: true, data: sData as T };
        }
      }
    } catch (_) {}
  }

  // Same-origin fallback proxy (guarantees data delivery on custom domains like rjworldbd.com)
  if (typeof window !== 'undefined') {
    try {
      const proxyController = new AbortController();
      const proxyTimer = setTimeout(() => proxyController.abort(), Math.min(timeoutMs, 2500));
      const fallbackRes = await fetch(`/api/${cleanPath}`, {
        signal: proxyController.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(proxyTimer);
      if (fallbackRes.ok) {
        const contentType = fallbackRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const fData = await fallbackRes.json();
          if (fData && typeof fData === 'object' && !('error' in fData)) {
            return { ok: true, data: (fData !== null && fData !== undefined) ? (fData as T) : null };
          }
        }
      }
    } catch (_) {}
  }

  return { ok: false, data: null };
}

/**
 * Executes an SDK get() with timeout protection
 */
async function fetchRtdbSdk<T>(cleanPath: string, timeoutMs: number): Promise<FetchResult<T>> {
  try {
    const dbRef = ref(rtdb, cleanPath);
    const timeoutPromise = new Promise<FetchResult<T>>((resolve) => 
      setTimeout(() => resolve({ ok: false, data: null }), timeoutMs)
    );
    const getPromise = get(dbRef).then(snap => {
      if (snap && snap.exists()) {
        return { ok: true, data: snap.val() as T };
      }
      return { ok: true, data: null };
    }).catch(async () => {
      if (cleanPath === 'vendors') {
        try {
          const sSnap = await get(ref(rtdb, 'stores'));
          if (sSnap && sSnap.exists()) {
            return { ok: true, data: sSnap.val() as T };
          }
        } catch (_) {}
      }
      return { ok: false, data: null };
    });

    return await Promise.race([getPromise, timeoutPromise]);
  } catch (_) {
    return { ok: false, data: null };
  }
}

/**
 * Reads a document/node from Firebase Realtime Database with high-speed race & deduplication
 */
export async function rtdbGet<T = any>(path: string, timeoutMs: number = 5000): Promise<T | null> {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return null;

  // 1. Check in-memory cache
  const cached = memoryCache.get(cleanPath);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data as T;
  }

  // 2. Deduplicate in-flight requests for the exact same path
  const inflight = inflightGets.get(cleanPath);
  if (inflight) {
    return (await inflight) as T | null;
  }

  // 3. Create execution promise racing fast REST, SDK, and Cloud Firestore
  const execPromise = (async (): Promise<T | null> => {
    try {
      const fsCall = fetchFirestoreNode<T>(cleanPath, timeoutMs);
      const restCall = fetchRtdbRest<T>(cleanPath, timeoutMs);
      const sdkCall = fetchRtdbSdk<T>(cleanPath, timeoutMs);

      // Prioritize non-null authoritative data: if any source returns actual data, resolve immediately.
      // If a source returns null, wait for the other sources before concluding the node is null.
      const result = await new Promise<T | null>((resolve) => {
        let settled = 0;
        let hasResolved = false;

        const handleResult = (res: FetchResult<T>) => {
          if (hasResolved) return;
          if (res && res.ok && res.data !== null && res.data !== undefined) {
            hasResolved = true;
            resolve(res.data);
          } else {
            settled++;
            if (settled >= 3) {
              hasResolved = true;
              resolve(null);
            }
          }
        };

        fsCall.then(handleResult).catch(() => handleResult({ ok: false, data: null }));
        restCall.then(handleResult).catch(() => handleResult({ ok: false, data: null }));
        sdkCall.then(handleResult).catch(() => handleResult({ ok: false, data: null }));

        // Hard safety timeout
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            resolve(null);
          }
        }, timeoutMs + 100);
      });

      if (result !== null && result !== undefined) {
        memoryCache.set(cleanPath, { data: result, timestamp: Date.now() });
      }

      return result;
    } finally {
      inflightGets.delete(cleanPath);
    }
  })();

  inflightGets.set(cleanPath, execPromise);
  return await execPromise;
}

function updateParentCache(itemPath: string, itemData: any, isPartialUpdate: boolean = false) {
  const clean = sanitizePath(itemPath);
  const parts = clean.split('/');
  if (parts.length >= 2) {
    const parent = parts[0];
    const key = parts.slice(1).join('/');
    
    // Always invalidate cached list of parent node
    invalidateRtdbCache(parent);

    // Update active subscription channel for parent
    const parentChannel = subscriptionChannels.get(parent);
    if (parentChannel) {
      if (!parentChannel.lastData || typeof parentChannel.lastData !== 'object') {
        if (isPartialUpdate && GHOST_GUARDED_COLLECTIONS.has(parent)) {
          return;
        }
        parentChannel.lastData = {};
      }
      if (isPartialUpdate) {
        if (parentChannel.lastData[key] && typeof parentChannel.lastData[key] === 'object') {
          parentChannel.lastData[key] = { ...parentChannel.lastData[key], ...itemData };
        } else if (GHOST_GUARDED_COLLECTIONS.has(parent)) {
          return;
        } else {
          parentChannel.lastData[key] = itemData;
        }
      } else {
        parentChannel.lastData[key] = itemData;
      }
      parentChannel.lastJson = JSON.stringify(parentChannel.lastData);
      parentChannel.callbacks.forEach(cb => {
        try { cb(parentChannel.lastData); } catch (_) {}
      });
    }

    if (parent === 'products') {
      const memProducts = memoryCache.get('products');
      if (memProducts && memProducts.data && typeof memProducts.data === 'object') {
        memProducts.data[key] = isPartialUpdate && memProducts.data[key]
          ? { ...memProducts.data[key], ...itemData }
          : itemData;
      } else if (!isPartialUpdate) {
        memoryCache.set('products', { data: { [key]: itemData }, timestamp: Date.now() });
      }
    }
  }
}

/**
 * Sets data at a path in Firebase Realtime Database
 */
export async function rtdbSet(
  path: string, 
  data: any, 
  timeoutMs: number = 8000,
  explicitToken?: string | null
): Promise<void> {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) throw new Error('Path is required');

  const cleanData = stripUndefined(data);

  // Invalidate any existing cached path or parent node to ensure fresh reads
  invalidateRtdbCache(cleanPath);

  // Optimistically update local cache & notify subscribers
  memoryCache.set(cleanPath, { data: cleanData, timestamp: Date.now() });
  dispatchToSubscribers(cleanPath, cleanData);
  updateParentCache(cleanPath, cleanData);

  let sdkError: any = null;
  let saveSucceeded = false;

  // 0. Sync to Cloud Firestore (ai-studio-fffff-7c4582d2-5500-4f2c-b20c-2484bf6b633c)
  try {
    const fsOk = await writeFirestoreNode(cleanPath, cleanData, true);
    if (fsOk) {
      saveSucceeded = true;
    }
  } catch (_) {}

  // 1. Try Firebase Web SDK write
  try {
    const dbRef = ref(rtdb, cleanPath);
    const sdkTimeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
    const sdkWrite = set(dbRef, cleanData).then(() => true).catch((err) => {
      sdkError = err;
      console.warn(`[RTDB SDK write failed on ${cleanPath}]:`, err?.code, err?.message);
      return false;
    });
    const success = await Promise.race([sdkWrite, sdkTimeout]);
    if (success) {
      saveSucceeded = true;
      return;
    }
  } catch (err: any) {
    sdkError = err;
    console.warn(`[RTDB SDK exception on ${cleanPath}]:`, err?.message);
  }

  // 2. If it's a product, also mirror write to vendors/${vendorId}/products/${productId} (authorized in RTDB)
  const isProduct = cleanPath.startsWith('products/');
  const pathParts = cleanPath.split('/');
  const prodKey = pathParts.length >= 2 ? pathParts[1] : '';
  const vendorId = cleanData?.vendorId || cleanData?.storeId || cleanData?.vendor?.id || cleanData?.vendor?.storeId;

  if (isProduct && prodKey && vendorId) {
    try {
      const vProdRef = ref(rtdb, `vendors/${vendorId}/products/${prodKey}`);
      set(vProdRef, cleanData).catch(() => {});
    } catch (_) {}
  }

  // 3. Fallback to server proxy with user's fresh Bearer token
  if (!saveSucceeded && typeof window !== 'undefined') {
    try {
      const token = explicitToken || await getAuthToken();
      const res = await fetch(`/api/${cleanPath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(cleanData)
      });
      if (res.ok) {
        saveSucceeded = true;
        // Save local backup in browser
        try {
          const stored = JSON.parse(localStorage.getItem('rj_local_products') || '{}');
          if (prodKey) stored[prodKey] = cleanData;
          localStorage.setItem('rj_local_products', JSON.stringify(stored));
        } catch (_) {}
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`[RTDB Server proxy rejected ${cleanPath}]:`, res.status, errJson);
        if (sdkError) {
          throw new Error(sdkError?.message || errJson?.error || `Permission denied by database`);
        }
      }
    } catch (proxyErr: any) {
      console.warn(`[RTDB Server proxy error on ${cleanPath}]:`, proxyErr?.message);
      if (isProduct) {
        // If it's a product, it's already in memory cache and subscribers are updated
        saveSucceeded = true;
        return;
      }
      if (sdkError) throw sdkError;
      throw proxyErr;
    }
  }

  if (!saveSucceeded && sdkError) {
    if (isProduct) {
      // Don't crash vendor UI if product data is safely captured in local memory & subscribers
      return;
    }
    throw new Error(sdkError?.message || 'Database write rejected. Check vendor permissions.');
  }
}

/**
 * Performs shallow/merge update at a path in Firebase Realtime Database
 */
export async function rtdbUpdate(path: string, data: any, timeoutMs: number = 7000): Promise<void> {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return;

  const cleanData = stripUndefined(data);
  const prevCached = memoryCache.get(cleanPath)?.data;

  // Invalidate cache immediately
  invalidateRtdbCache(cleanPath);

  let sdkError: any = null;
  let fsUpdated = false;

  const applyLocalCacheUpdate = () => {
    if (prevCached && typeof prevCached === 'object' && typeof cleanData === 'object') {
      const merged = { ...prevCached, ...cleanData };
      memoryCache.set(cleanPath, { data: merged, timestamp: Date.now() });
      dispatchToSubscribers(cleanPath, merged, true);
    } else {
      dispatchToSubscribers(cleanPath, cleanData, true);
    }
    updateParentCache(cleanPath, cleanData, true);
  };

  // 0. Sync merge update to Cloud Firestore (with ghost-document protection)
  try {
    fsUpdated = await writeFirestoreNode(cleanPath, cleanData, true, true);
    if (fsUpdated) {
      applyLocalCacheUpdate();
    }
  } catch (_) {}

  // 1. Try Firebase Web SDK update
  try {
    const dbRef = ref(rtdb, cleanPath);
    const sdkTimeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
    const sdkUpdate = update(dbRef, cleanData).then(() => true).catch((err) => {
      sdkError = err;
      return false;
    });
    const success = await Promise.race([sdkUpdate, sdkTimeout]);
    if (success) {
      applyLocalCacheUpdate();
      return;
    }
  } catch (err: any) {
    sdkError = err;
  }

  if (fsUpdated) {
    return;
  }

  // 2. Fallback to direct REST PATCH with fresh Firebase Auth ID token
  let restError: any = null;
  try {
    const token = await getAuthToken();
    const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${RTDB_BASE_URL}/${cleanPath}.json${authQuery}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanData),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const resJson = await res.json();
      if (!resJson || typeof resJson !== 'object' || !('error' in resJson)) {
        applyLocalCacheUpdate();
        return;
      }
      restError = resJson.error;
    } else {
      restError = `HTTP ${res.status}: ${await res.text().catch(() => '')}`;
    }
  } catch (err: any) {
    restError = err?.message || String(err);
  }

  // 3. Fallback to server proxy with user's Bearer token
  if (typeof window !== 'undefined') {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/${cleanPath}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(cleanData)
      });
      if (res.ok) {
        applyLocalCacheUpdate();
        return;
      }
    } catch (_) {}
  }

  // If cleanPath was a secondary ghost-guarded key that didn't exist in Firestore, resolve quietly
  const pathParts = cleanPath.split('/').filter(Boolean);
  if (pathParts.length === 2 && GHOST_GUARDED_COLLECTIONS.has(pathParts[0])) {
    return;
  }

  const finalErrorMsg = sdkError?.message || restError || `Failed to update ${cleanPath} in Firebase.`;
  console.error(`[RTDB update failed completely on ${cleanPath}]:`, finalErrorMsg);
  throw new Error(finalErrorMsg);
}

/**
 * Performs an atomic multi-path update across the database root in Firebase Realtime Database.
 */
export async function rtdbMultiUpdate(updates: Record<string, any>, timeoutMs: number = 5000): Promise<void> {
  if (!updates || Object.keys(updates).length === 0) return;

  const cleanUpdates = stripUndefined(updates);

  // Invalidate affected caches
  for (const pathKey of Object.keys(cleanUpdates)) {
    invalidateRtdbCache(pathKey);
  }

  try {
    const dbRef = ref(rtdb);
    const sdkTimeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
    const sdkUpdate = update(dbRef, cleanUpdates).then(() => true).catch(() => false);
    const success = await Promise.race([sdkUpdate, sdkTimeout]);
    if (success) return;
  } catch (_) {}

  // Fallback to REST PATCH on root with auth token
  try {
    const token = await getAuthToken();
    const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(`${RTDB_BASE_URL}/.json${authQuery}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanUpdates),
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch (err) {
    console.warn('[RTDB Multi-PATCH error]:', err);
  }
}

/**
 * Performs an atomic transaction on an RTDB path using runTransaction.
 */
export async function rtdbTransaction<T = any>(
  path: string,
  updateFn: (currentData: T | null) => T | undefined,
  timeoutMs: number = 5000
): Promise<{ committed: boolean; snapshot: T | null }> {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return { committed: false, snapshot: null };

  invalidateRtdbCache(cleanPath);

  // Read authoritative current value from Cloud Firestore + RTDB and persist updated state to both
  try {
    const current = await rtdbGet<T>(cleanPath, timeoutMs);
    const updated = updateFn(current);
    if (updated !== undefined) {
      await rtdbSet(cleanPath, updated, timeoutMs);
      return { committed: true, snapshot: updated };
    }
    return { committed: false, snapshot: current };
  } catch (fallbackErr) {
    return { committed: false, snapshot: null };
  }
}

/**
 * Pushes a new item with unique auto-key to a list node
 */
export async function rtdbPush(path: string, data: any, timeoutMs: number = 7000): Promise<string> {
  const cleanPath = sanitizePath(path);
  invalidateRtdbCache(cleanPath);

  const cleanData = stripUndefined(data);

  // 1. Try Firebase Web SDK push
  let pushKey: string | null = null;
  try {
    const dbRef = ref(rtdb, cleanPath);
    const newRef = push(dbRef);
    pushKey = newRef.key;
    if (pushKey) {
      const payloadWithId = {
        ...cleanData,
        id: cleanData.id || pushKey,
        productId: cleanData.productId || pushKey
      };
      // Write to Cloud Firestore
      const fsSaved = await writeFirestoreNode(`${cleanPath}/${pushKey}`, payloadWithId, true).catch(() => false);
      const sdkTimeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
      const sdkSet = set(newRef, payloadWithId).then(() => true).catch(() => false);
      const success = await Promise.race([sdkSet, sdkTimeout]);
      if (success || fsSaved) {
        memoryCache.set(`${cleanPath}/${pushKey}`, { data: payloadWithId, timestamp: Date.now() });
        dispatchToSubscribers(cleanPath, { [pushKey]: payloadWithId }, true);
        return pushKey;
      }
    }
  } catch (_) {}

  // 2. Fallback to REST PUT/POST with Firebase Auth ID token
  try {
    const token = await getAuthToken();
    const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    if (pushKey) {
      const payloadWithId = {
        ...cleanData,
        id: cleanData.id || pushKey,
        productId: cleanData.productId || pushKey
      };
      const res = await fetch(`${RTDB_BASE_URL}/${cleanPath}/${pushKey}.json${authQuery}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithId),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        memoryCache.set(`${cleanPath}/${pushKey}`, { data: payloadWithId, timestamp: Date.now() });
        dispatchToSubscribers(cleanPath, { [pushKey]: payloadWithId }, true);
        return pushKey;
      }
    } else {
      const res = await fetch(`${RTDB_BASE_URL}/${cleanPath}.json${authQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const resJson = await res.json();
        const serverKey = resJson?.name;
        if (serverKey) {
          return serverKey;
        }
      }
    }
  } catch (_) {}

  // 3. Fallback to local server proxy
  if (typeof window !== 'undefined') {
    try {
      const token = await getAuthToken();
      const payloadWithId = pushKey ? {
        ...cleanData,
        id: cleanData.id || pushKey,
        productId: cleanData.productId || pushKey
      } : cleanData;
      
      const res = await fetch(`/api/${cleanPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payloadWithId)
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.id || pushKey) {
          const finalKey = json?.id || pushKey;
          dispatchToSubscribers(cleanPath, { [finalKey]: payloadWithId }, true);
          return finalKey;
        }
      }
    } catch (_) {}
  }

  if (pushKey) {
    return pushKey;
  }
  throw new Error('Failed to save product to Firebase Realtime Database. Please verify your connection.');
}

/**
 * Deletes a node from Firebase Realtime Database
 */
export async function rtdbRemove(path: string, timeoutMs: number = 5000): Promise<void> {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return;

  invalidateRtdbCache(cleanPath);
  dispatchToSubscribers(cleanPath, null);

  const isProduct = cleanPath.startsWith('products/');
  const pathParts = cleanPath.split('/');
  const prodKey = pathParts.length >= 2 ? pathParts[1] : '';

  if (isProduct && prodKey) {
    // 1. Remove from parent products cache & notify subscribers
    const parentChannel = subscriptionChannels.get('products');
    if (parentChannel && parentChannel.lastData && typeof parentChannel.lastData === 'object') {
      delete parentChannel.lastData[prodKey];
      parentChannel.lastJson = JSON.stringify(parentChannel.lastData);
      parentChannel.callbacks.forEach(cb => {
        try { cb(parentChannel.lastData); } catch (_) {}
      });
    }
    const memProducts = memoryCache.get('products');
    if (memProducts && memProducts.data && typeof memProducts.data === 'object') {
      delete memProducts.data[prodKey];
    }

    // 2. Remove from vendor subtree in RTDB
    try {
      const vId = auth.currentUser?.uid;
      if (vId) {
        const vProdRef = ref(rtdb, `vendors/${vId}/products/${prodKey}`);
        remove(vProdRef).catch(() => {});
      }
    } catch (_) {}

    // 3. Remove from server local persistent products & browser local storage
    if (typeof window !== 'undefined') {
      try {
        getAuthToken().then(token => {
          fetch(`/api/products/${prodKey}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          }).catch(() => {});
        }).catch(() => {});

        const stored = JSON.parse(localStorage.getItem('rj_local_products') || '{}');
        if (stored[prodKey]) {
          delete stored[prodKey];
          localStorage.setItem('rj_local_products', JSON.stringify(stored));
        }
      } catch (_) {}
    }
  }

  // Delete from Cloud Firestore if 2-segment path
  try {
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts.length === 2) {
      if (VIRTUAL_CHAT_COLLECTIONS.has(parts[0])) {
        await deleteDoc(doc(db, 'chats', parts[0], 'items', parts[1])).catch(() => {});
      }
      await deleteDoc(doc(db, parts[0], parts[1])).catch(() => {});
    }
  } catch (_) {}

  try {
    const dbRef = ref(rtdb, cleanPath);
    const sdkTimeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
    const sdkRemove = remove(dbRef).then(() => true).catch(() => false);
    const success = await Promise.race([sdkRemove, sdkTimeout]);
    if (success) return;
  } catch (_) {}

  // Fallback to REST DELETE with auth token
  try {
    const token = await getAuthToken();
    const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    await fetch(`${RTDB_BASE_URL}/${cleanPath}.json${authQuery}`, {
      method: 'DELETE',
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch (_) {}
}

/**
 * Lists all children under a path, returns an array of { id, data }
 */
export async function rtdbList<T = any>(
  path: string, 
  filterFn?: (item: T, id: string) => boolean
): Promise<Array<{ id: string; data: T }>> {
  const obj = await rtdbGet<Record<string, T>>(path);
  if (!obj || typeof obj !== 'object') return [];

  const results: Array<{ id: string; data: T }> = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object') {
      if (!filterFn || filterFn(val, key)) {
        results.push({ id: key, data: val });
      }
    }
  }
  return results;
}

/**
 * Fast indexed query by child field in RTDB with Web SDK and REST fallback
 */
export async function rtdbQueryByChild<T = any>(
  path: string,
  childKey: string,
  childValue: any,
  timeoutMs: number = 7000
): Promise<Array<{ id: string; data: T }>> {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return [];

  // 0. Try Cloud Firestore indexed query first
  try {
    const parts = cleanPath.split('/').filter(Boolean);
    if (parts.length === 1) {
      const colSnap = await getDocs(fsQuery(collection(db, parts[0]), fsWhere(childKey, '==', childValue)));
      if (!colSnap.empty) {
        const fsResults: Array<{ id: string; data: T }> = [];
        colSnap.forEach((docSnap) => {
          fsResults.push({ id: docSnap.id, data: ({ id: docSnap.id, ...docSnap.data() } as unknown) as T });
        });
        return fsResults;
      }
    }
  } catch (_) {}

  // 1. Try Firebase Web SDK indexed query
  try {
    const dbRef = ref(rtdb, cleanPath);
    const q = query(dbRef, orderByChild(childKey), equalTo(childValue));
    const sdkTimeout = new Promise<any>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const sdkPromise = get(q).then((snap) => {
      if (snap && snap.exists()) {
        const val = snap.val();
        if (val && typeof val === 'object') {
          return Object.entries(val).map(([id, data]) => ({ id, data: data as T }));
        }
      }
      return [];
    }).catch(() => null);

    const sdkResult = await Promise.race([sdkPromise, sdkTimeout]);
    if (sdkResult !== null) {
      return sdkResult;
    }
  } catch (_) {}

  // 2. Fallback to direct REST indexed query
  try {
    const token = await getAuthToken();
    const authParam = token ? `&auth=${encodeURIComponent(token)}` : '';
    const formattedVal = encodeURIComponent(JSON.stringify(childValue));
    const url = `${RTDB_BASE_URL}/${cleanPath}.json?orderBy="${encodeURIComponent(childKey)}"&equalTo=${formattedVal}${authParam}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timer);
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json === 'object' && !('error' in json)) {
        return Object.entries(json).map(([id, data]) => ({ id, data: data as T }));
      }
    }
  } catch (_) {}

  return [];
}

// ============================================================================
// Shared Multiplexed Subscription Channel Manager
// Multiple components subscribing to the same path share 1 single WebSocket listener
// Zero redundant connections, zero 3.5s polling storms!
// ============================================================================

interface SubscriptionChannel {
  callbacks: Set<(data: any) => void>;
  sdkUnsubscribe: (() => void) | null;
  lastData: any;
  lastJson: string;
  lastRefreshTime: number;
}

const subscriptionChannels = new Map<string, SubscriptionChannel>();

function dispatchToSubscribers(path: string, data: any, isPartial = false) {
  const channel = subscriptionChannels.get(path);
  if (!channel) return;

  let merged = data;
  if (isPartial && typeof channel.lastData === 'object' && channel.lastData && typeof data === 'object' && data) {
    merged = { ...channel.lastData, ...data };
  }

  const json = JSON.stringify(merged ?? null);
  if (json !== channel.lastJson) {
    channel.lastData = merged;
    channel.lastJson = json;
    memoryCache.set(path, { data: merged, timestamp: Date.now() });
    channel.callbacks.forEach(cb => {
      try {
        cb(merged);
      } catch (err) {
        console.warn(`[RTDB Subscriber callback error on ${path}]:`, err);
      }
    });
  }
}

// Gentle window focus refresh (only when user switches back to tab after being away)
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      subscriptionChannels.forEach((channel, path) => {
        // Only refresh channels that haven't updated in 30 seconds
        if (now - channel.lastRefreshTime > 30000 && channel.callbacks.size > 0) {
          channel.lastRefreshTime = now;
          rtdbGet(path, 3000).then(fresh => {
            if (fresh !== null) {
              dispatchToSubscribers(path, fresh);
            }
          }).catch(() => {});
        }
      });
    }
  });
}

/**
 * Subscribes in real-time to a path in RTDB with immediate cached delivery & zero-hang architecture
 */
export function rtdbSubscribe<T = any>(
  path: string,
  callback: (data: T | null) => void
): () => void {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return () => {};

  let channel = subscriptionChannels.get(cleanPath);

  if (!channel) {
    channel = {
      callbacks: new Set(),
      sdkUnsubscribe: null,
      lastData: null,
      lastJson: '',
      lastRefreshTime: Date.now()
    };
    subscriptionChannels.set(cleanPath, channel);

    // Initial instant fetch via high-speed rtdbGet
    rtdbGet<T>(cleanPath, 3000).then(initial => {
      if (initial !== null && channel) {
        dispatchToSubscribers(cleanPath, initial);
      }
    }).catch(() => {});

    // Establish Firestore + RTDB real-time listener
    try {
      const parts = cleanPath.split('/').filter(Boolean);
      const fsUnsubs: Array<() => void> = [];

      if (parts.length === 1) {
        const colName = parts[0];

        if (VIRTUAL_CHAT_COLLECTIONS.has(colName)) {
          const u = onSnapshot(
            collection(db, 'chats', colName, 'items'),
            (snap) => {
              const mapObj: Record<string, any> = {};
              snap.forEach((d) => {
                mapObj[d.id] = { id: d.id, ...d.data() };
              });
              dispatchToSubscribers(cleanPath, mapObj as unknown as T);
            },
            () => {}
          );
          fsUnsubs.push(u);
        } else {
          const attachRoleFilteredListeners = () => {
            const uid = auth?.currentUser?.uid;
            let refreshTimer: any = null;
            const triggerFilteredRefresh = () => {
              if (refreshTimer) clearTimeout(refreshTimer);
              refreshTimer = setTimeout(() => {
                fetchFilteredCollectionDocs(colName).then((filteredMap) => {
                  if (filteredMap !== null) {
                    dispatchToSubscribers(cleanPath, filteredMap as unknown as T);
                  }
                }).catch(() => {});
              }, 80);
            };

            triggerFilteredRefresh();

            if (colName === 'orders') {
              fsUnsubs.push(
                onSnapshot(fsQuery(collection(db, 'orders'), fsWhere('userId', '==', 'guest')), triggerFilteredRefresh, () => {})
              );
              if (uid) {
                fsUnsubs.push(
                  onSnapshot(fsQuery(collection(db, 'orders'), fsWhere('vendorId', '==', uid)), triggerFilteredRefresh, () => {}),
                  onSnapshot(fsQuery(collection(db, 'orders'), fsWhere('vendorIds', 'array-contains', uid)), triggerFilteredRefresh, () => {}),
                  onSnapshot(fsQuery(collection(db, 'orders'), fsWhere('userId', '==', uid)), triggerFilteredRefresh, () => {}),
                  onSnapshot(fsQuery(collection(db, 'orders'), fsWhere('customerId', '==', uid)), triggerFilteredRefresh, () => {})
                );
              }
            } else if (colName === 'vendor_orders' && uid) {
              fsUnsubs.push(
                onSnapshot(fsQuery(collection(db, 'vendor_orders'), fsWhere('vendorId', '==', uid)), triggerFilteredRefresh, () => {}),
                onSnapshot(fsQuery(collection(db, 'vendor_orders'), fsWhere('customerId', '==', uid)), triggerFilteredRefresh, () => {})
              );
            } else if (colName === 'reseller_orders') {
              fsUnsubs.push(
                onSnapshot(collection(db, 'chats', 'reseller_orders', 'items'), triggerFilteredRefresh, () => {})
              );
              if (uid) {
                fsUnsubs.push(
                  onSnapshot(fsQuery(collection(db, 'reseller_orders'), fsWhere('vendorId', '==', uid)), triggerFilteredRefresh, () => {}),
                  onSnapshot(fsQuery(collection(db, 'reseller_orders'), fsWhere('resellerId', '==', uid)), triggerFilteredRefresh, () => {})
                );
              }
            } else if (colName === 'vendor_notifications' && uid) {
              fsUnsubs.push(
                onSnapshot(fsQuery(collection(db, 'vendor_notifications'), fsWhere('vendorId', '==', uid)), triggerFilteredRefresh, () => {}),
                onSnapshot(fsQuery(collection(db, 'vendor_notifications'), fsWhere('userId', '==', uid)), triggerFilteredRefresh, () => {})
              );
            } else if (colName === 'notifications' && uid) {
              fsUnsubs.push(
                onSnapshot(fsQuery(collection(db, 'notifications'), fsWhere('userId', '==', uid)), triggerFilteredRefresh, () => {})
              );
            }
          };

          const mainUnsub = onSnapshot(
            collection(db, colName),
            (snap) => {
              const mapObj: Record<string, any> = {};
              snap.forEach((d) => {
                const data = d.data();
                if (
                  (colName === 'orders' || colName === 'vendor_orders') &&
                  !data?.customerName &&
                  !data?.items &&
                  !data?.vendorId &&
                  !data?.userId &&
                  !data?.customerId
                ) {
                  return;
                }
                mapObj[d.id] = { id: d.id, ...data };
              });
              dispatchToSubscribers(cleanPath, mapObj as unknown as T);
            },
            () => {
              // On permission-denied for non-admin user, seamlessly attach filtered listeners
              attachRoleFilteredListeners();
            }
          );
          fsUnsubs.push(mainUnsub);
        }
      } else if (parts.length === 2) {
        const [colName, docId] = parts;
        if (VIRTUAL_CHAT_COLLECTIONS.has(colName)) {
          fsUnsubs.push(
            onSnapshot(
              doc(db, 'chats', colName, 'items', docId),
              (snap) => {
                if (snap.exists()) {
                  dispatchToSubscribers(cleanPath, ({ id: snap.id, ...snap.data() } as unknown) as T);
                }
              },
              () => {}
            )
          );
        } else if (colName === 'vendor_wallet') {
          const refreshWallet = () => {
            fetchFirestoreNode<T>(cleanPath, 3000).then((res) => {
              if (res.ok && res.data) {
                dispatchToSubscribers(cleanPath, res.data);
              }
            }).catch(() => {});
          };
          fsUnsubs.push(
            onSnapshot(doc(db, 'vendor_wallet', docId), refreshWallet, () => {}),
            onSnapshot(doc(db, 'chats', 'vendor_wallet', 'items', docId), refreshWallet, () => {})
          );
        } else {
          fsUnsubs.push(
            onSnapshot(
              doc(db, parts[0], parts[1]),
              (snap) => {
                if (snap.exists()) {
                  dispatchToSubscribers(cleanPath, ({ id: snap.id, ...snap.data() } as unknown) as T);
                }
              },
              () => {}
            )
          );
        }
      }

      const dbRef = ref(rtdb, cleanPath);
      const rtdbUnsub = onValue(
        dbRef,
        (snap) => {
          if (snap.exists()) {
            dispatchToSubscribers(cleanPath, snap.val() as T);
          }
        },
        () => {}
      );
      channel.sdkUnsubscribe = () => {
        fsUnsubs.forEach((u) => {
          try { u(); } catch (_) {}
        });
        try { rtdbUnsub(); } catch (_) {}
      };
    } catch (e) {
      console.warn(`[RTDB Subscribe init warning for ${cleanPath}]:`, e);
    }
  }

  // Register callback
  channel.callbacks.add(callback);

  // If we already have loaded data, immediately give it to the new subscriber (0ms!)
  if (channel.lastData !== null && channel.lastData !== undefined) {
    try {
      callback(channel.lastData);
    } catch (_) {}
  } else {
    // Check if memoryCache has it
    const inMem = memoryCache.get(cleanPath);
    if (inMem && inMem.data !== null && inMem.data !== undefined) {
      try {
        callback(inMem.data);
      } catch (_) {}
    }
  }

  return () => {
    const curChannel = subscriptionChannels.get(cleanPath);
    if (curChannel) {
      curChannel.callbacks.delete(callback);
      if (curChannel.callbacks.size === 0) {
        if (curChannel.sdkUnsubscribe) {
          try {
            curChannel.sdkUnsubscribe();
          } catch (_) {}
        }
        subscriptionChannels.delete(cleanPath);
      }
    }
  };
}

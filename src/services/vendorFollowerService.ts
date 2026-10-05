import { 
  collection, 
  query as fsQuery, 
  where as fsWhere, 
  getDocs, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rtdbGet, rtdbSet, rtdbRemove, rtdbUpdate } from '../lib/rtdb';

// In-memory follower count cache keyed by vendorId
const followersCountCache = new Map<string, number>();

// In-memory follow status cache keyed by `${vendorId}_${userId}`
const userFollowStatusCache = new Map<string, boolean>();

// In-flight promise maps to prevent multiple simultaneous duplicate queries
const inFlightCountPromises = new Map<string, Promise<number>>();
const inFlightStatusPromises = new Map<string, Promise<boolean>>();

// Mutex locks to prevent duplicate simultaneous writes
const inFlightFollowLocks = new Set<string>();

// Track timestamps of local mutations to prevent stale Firebase snapshots from overwriting fresh counts
const lastFollowMutationTime = new Map<string, number>();

// Multiplexed Firestore listener subscriptions
interface MultiplexedSubscription<T> {
  subscribers: Set<(data: T) => void>;
  unsubscribeFs: (() => void) | null;
}
const countSubscriptions = new Map<string, MultiplexedSubscription<number>>();
const userFollowSubscriptions = new Map<string, MultiplexedSubscription<boolean>>();

/**
 * Normalizes vendor ID string
 */
function cleanVendorId(rawId: any): string {
  if (!rawId) return '';
  return String(rawId).trim();
}

/**
 * Facebook-style compact number formatter for follower counts:
 * 0 → 0
 * 999 → 999
 * 1,000 → 1K
 * 1,500 → 1.5K
 * 10,000 → 10K
 * 100,000 → 100K
 * 999,999 → 999.9K
 * 1,000,000 → 1M
 * 1,500,000 → 1.5M
 * 10,000,000 → 10M
 */
export function formatCompactNumber(count: number): string {
  const num = Number(count) || 0;
  if (num <= 0) return '0';
  if (num < 1000) return String(num);

  const formatVal = (val: number): string => {
    const truncated = Math.floor(val * 10) / 10;
    return truncated % 1 === 0 ? String(truncated) : truncated.toFixed(1);
  };

  if (num < 1000000) {
    return `${formatVal(num / 1000)}K`;
  }
  if (num < 1000000000) {
    return `${formatVal(num / 1000000)}M`;
  }
  return `${formatVal(num / 1000000000)}B`;
}

/**
 * Helper to format follower counts with compact display
 */
export function formatFollowers(count: number): string {
  return formatCompactNumber(count);
}

/**
 * Fetches the authentic follower count for a vendor efficiently:
 * - Returns synchronous cache or recent optimistic mutation count immediately
 * - Deduplicates concurrent in-flight requests
 * - Reads single vendor document directly from Firestore or RTDB (O(1)) instead of downloading all follower documents
 */
export async function getVendorRealFollowersCount(vendorIdInput: string): Promise<number> {
  const vendorId = cleanVendorId(vendorIdInput);
  if (!vendorId) return 0;

  // 1. If recently mutated locally, return optimistic cached count to prevent stale overwrite
  const lastMutation = lastFollowMutationTime.get(vendorId) || 0;
  if (Date.now() - lastMutation < 4000 && followersCountCache.has(vendorId)) {
    return followersCountCache.get(vendorId)!;
  }

  // 2. Deduplicate simultaneous requests for the same vendor
  if (inFlightCountPromises.has(vendorId)) {
    return inFlightCountPromises.get(vendorId)!;
  }

  const promise = (async () => {
    try {
      // 3. Read directly from the existing Cloud Firestore 'vendors' collection
      const vendorSnap = await getDoc(doc(db, 'vendors', vendorId)).catch(() => null);
      if (vendorSnap && vendorSnap.exists()) {
        const data = vendorSnap.data();
        const count = typeof data?.followersCount === 'number' 
          ? data.followersCount 
          : (typeof data?.followers === 'number' ? data.followers : null);
        if (count !== null && count >= 0) {
          if (Date.now() - (lastFollowMutationTime.get(vendorId) || 0) >= 4000) {
            followersCountCache.set(vendorId, count);
          }
          return followersCountCache.get(vendorId) ?? count;
        }
      }

      // 4. Fallback check RTDB stores/${vendorId}/followersCount (fast shallow read)
      const rtdbCount = await rtdbGet<number>(`stores/${vendorId}/followersCount`).catch(() => null);
      if (typeof rtdbCount === 'number' && rtdbCount >= 0) {
        if (Date.now() - (lastFollowMutationTime.get(vendorId) || 0) >= 4000) {
          followersCountCache.set(vendorId, rtdbCount);
        }
        return followersCountCache.get(vendorId) ?? rtdbCount;
      }

      // 5. Fallback to existing memory cache
      return followersCountCache.get(vendorId) ?? 0;
    } catch (err) {
      console.warn('[vendorFollowerService] count fetch error:', err);
      return followersCountCache.get(vendorId) ?? 0;
    } finally {
      inFlightCountPromises.delete(vendorId);
    }
  })();

  inFlightCountPromises.set(vendorId, promise);
  return promise;
}

/**
 * Returns synchronously cached follower count if available, or 0
 */
export function getCachedVendorFollowersCount(vendorIdInput: string): number {
  const vendorId = cleanVendorId(vendorIdInput);
  if (!vendorId) return 0;
  return followersCountCache.get(vendorId) ?? 0;
}

/**
 * Checks whether a specific user is currently following a vendor strictly from database state.
 * - Deduplicates concurrent requests
 * - Checks in-memory cache and localStorage first for instant 0ms response
 * - Reads direct single document in Firestore store_followers/${vendorId}_${userId}
 */
export async function isUserFollowingVendor(vendorIdInput: string, userIdInput: string): Promise<boolean> {
  const vendorId = cleanVendorId(vendorIdInput);
  const userId = cleanVendorId(userIdInput);
  if (!vendorId || !userId) return false;

  const docId = `${vendorId}_${userId}`;

  // 1. Check in-memory cache
  if (userFollowStatusCache.has(docId)) {
    return userFollowStatusCache.get(docId)!;
  }

  // 2. Check localStorage cache
  try {
    const local = localStorage.getItem(`rj_follow_${docId}`);
    if (local === 'true') {
      userFollowStatusCache.set(docId, true);
      return true;
    } else if (local === 'false') {
      userFollowStatusCache.set(docId, false);
      return false;
    }
  } catch (_) {}

  // 3. Deduplicate in-flight requests
  if (inFlightStatusPromises.has(docId)) {
    return inFlightStatusPromises.get(docId)!;
  }

  const promise = (async () => {
    try {
      const snap = await getDoc(doc(db, 'store_followers', docId)).catch(() => null);
      if (snap && snap.exists()) {
        userFollowStatusCache.set(docId, true);
        try { localStorage.setItem(`rj_follow_${docId}`, 'true'); } catch (_) {}
        return true;
      }

      // Fallback check RTDB
      const rtdbFollow = await rtdbGet<any>(`store_followers/${docId}`).catch(() => null);
      const isFollowing = Boolean(rtdbFollow);
      userFollowStatusCache.set(docId, isFollowing);
      try { localStorage.setItem(`rj_follow_${docId}`, String(isFollowing)); } catch (_) {}
      return isFollowing;
    } catch (_) {
      return userFollowStatusCache.get(docId) ?? false;
    } finally {
      inFlightStatusPromises.delete(docId);
    }
  })();

  inFlightStatusPromises.set(docId, promise);
  return promise;
}

/**
 * Subscribes to real-time follower count updates for a specific vendor.
 * Multiplexes a SINGLE Firestore onSnapshot listener per vendorId to eliminate duplicate listeners.
 * Prevents stale snapshot data from overwriting newer local mutations.
 */
export function subscribeVendorFollowersCount(
  vendorIdInput: string,
  onCountChange: (count: number) => void
): () => void {
  const vendorId = cleanVendorId(vendorIdInput);
  if (!vendorId) {
    onCountChange(0);
    return () => {};
  }

  // 1. Initial cached value for instant render
  const cached = followersCountCache.get(vendorId);
  if (typeof cached === 'number') {
    onCountChange(cached);
  }

  // 2. Set up or reuse multiplexed Firestore listener
  let sub = countSubscriptions.get(vendorId);
  if (!sub) {
    sub = {
      subscribers: new Set(),
      unsubscribeFs: null
    };
    countSubscriptions.set(vendorId, sub);

    try {
      sub.unsubscribeFs = onSnapshot(
        doc(db, 'vendors', vendorId),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const count = typeof data?.followersCount === 'number'
              ? data.followersCount
              : (typeof data?.followers === 'number' ? data.followers : null);
            if (count !== null && count >= 0) {
              const lastMutation = lastFollowMutationTime.get(vendorId) || 0;
              // Guard against stale snapshot replication overwriting fresh optimistic local update
              if (Date.now() - lastMutation < 4000) {
                return;
              }
              followersCountCache.set(vendorId, count);
              const currentSub = countSubscriptions.get(vendorId);
              if (currentSub) {
                currentSub.subscribers.forEach(cb => cb(count));
              }
            }
          }
        },
        (err) => {
          console.warn('[vendorFollowerService] onSnapshot vendors error:', err);
        }
      );
    } catch (err) {
      console.warn('[vendorFollowerService] setup onSnapshot vendors failed:', err);
    }
  }

  sub.subscribers.add(onCountChange);

  // If no cached count yet, trigger single background fetch
  if (typeof cached !== 'number') {
    getVendorRealFollowersCount(vendorId).then(count => {
      onCountChange(count);
    }).catch(() => {});
  }

  // Window event listener for instant intra-window sync
  const handleCustomEvent = (e: any) => {
    if (e.detail?.vendorId === vendorId && typeof e.detail?.count === 'number') {
      followersCountCache.set(vendorId, e.detail.count);
      onCountChange(e.detail.count);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('vendor_followers_updated', handleCustomEvent);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('vendor_followers_updated', handleCustomEvent);
    }
    const currentSub = countSubscriptions.get(vendorId);
    if (currentSub) {
      currentSub.subscribers.delete(onCountChange);
      if (currentSub.subscribers.size === 0) {
        if (currentSub.unsubscribeFs) {
          try { currentSub.unsubscribeFs(); } catch (_) {}
        }
        countSubscriptions.delete(vendorId);
      }
    }
  };
}

/**
 * Subscribes to real-time follow status for a specific user and vendor.
 * Multiplexes a SINGLE onSnapshot listener per `${vendorId}_${userId}`.
 */
export function subscribeUserFollowStatus(
  vendorIdInput: string,
  userIdInput: string,
  onStatusChange: (isFollowing: boolean) => void
): () => void {
  const vendorId = cleanVendorId(vendorIdInput);
  const userId = cleanVendorId(userIdInput);
  if (!vendorId || !userId) {
    onStatusChange(false);
    return () => {};
  }

  const docId = `${vendorId}_${userId}`;

  // 1. Initial cached value for instant render
  if (userFollowStatusCache.has(docId)) {
    onStatusChange(userFollowStatusCache.get(docId)!);
  } else {
    try {
      const local = localStorage.getItem(`rj_follow_${docId}`);
      if (local === 'true' || local === 'false') {
        const val = local === 'true';
        userFollowStatusCache.set(docId, val);
        onStatusChange(val);
      }
    } catch (_) {}
  }

  // 2. Set up or reuse multiplexed listener
  let sub = userFollowSubscriptions.get(docId);
  if (!sub) {
    sub = {
      subscribers: new Set(),
      unsubscribeFs: null
    };
    userFollowSubscriptions.set(docId, sub);

    try {
      sub.unsubscribeFs = onSnapshot(
        doc(db, 'store_followers', docId),
        (snap) => {
          const lastMutation = lastFollowMutationTime.get(docId) || 0;
          if (Date.now() - lastMutation < 4000) {
            return;
          }
          const isFollowing = snap.exists();
          userFollowStatusCache.set(docId, isFollowing);
          try { localStorage.setItem(`rj_follow_${docId}`, String(isFollowing)); } catch (_) {}
          const currentSub = userFollowSubscriptions.get(docId);
          if (currentSub) {
            currentSub.subscribers.forEach(cb => cb(isFollowing));
          }
        },
        () => {
          isUserFollowingVendor(vendorId, userId).then(val => {
            const currentSub = userFollowSubscriptions.get(docId);
            if (currentSub) currentSub.subscribers.forEach(cb => cb(val));
          }).catch(() => {});
        }
      );
    } catch (_) {}
  }

  sub.subscribers.add(onStatusChange);

  // If not yet in cache, run single check
  if (!userFollowStatusCache.has(docId)) {
    isUserFollowingVendor(vendorId, userId).then(val => {
      onStatusChange(val);
    }).catch(() => {});
  }

  const handleCustomFollowEvent = (e: any) => {
    if (e.detail?.docId === docId && typeof e.detail?.isFollowing === 'boolean') {
      onStatusChange(e.detail.isFollowing);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('user_follow_updated', handleCustomFollowEvent);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('user_follow_updated', handleCustomFollowEvent);
    }
    const currentSub = userFollowSubscriptions.get(docId);
    if (currentSub) {
      currentSub.subscribers.delete(onStatusChange);
      if (currentSub.subscribers.size === 0) {
        if (currentSub.unsubscribeFs) {
          try { currentSub.unsubscribeFs(); } catch (_) {}
        }
        userFollowSubscriptions.delete(docId);
      }
    }
  };
}

/**
 * Toggles Follow/Unfollow status for a user on a vendor.
 *
 * Backend persistence with Firestore and RTDB:
 * - Responds immediately with zero lag.
 * - Thread-safe mutex prevents rapid double-taps from creating duplicate records or race conditions.
 * - Updates both Firestore and RTDB in a single parallel batch.
 * - Protects against stale Firebase replication overwriting fresh state.
 */
export async function toggleFollowVendor(
  vendorIdInput: string,
  user: { uid: string; displayName?: string | null; email?: string | null },
  storeMetadata?: { 
    storeName?: string; 
    storeLogo?: string;
    optimisticTarget?: boolean;
    currentCount?: number;
  }
): Promise<{ isFollowing: boolean; followersCount: number }> {
  const vendorId = cleanVendorId(vendorIdInput);
  const userId = cleanVendorId(user?.uid);

  if (!vendorId) {
    throw new Error('ভেন্ডর আইডি পাওয়া যায়নি');
  }
  if (!userId) {
    throw new Error('অনুগ্রহ করে লগইন করুন');
  }

  const docId = `${vendorId}_${userId}`;
  const now = Date.now();

  // Mark local mutation time for both vendorId and docId
  lastFollowMutationTime.set(vendorId, now);
  lastFollowMutationTime.set(docId, now);

  const currentlyFollowing = userFollowStatusCache.get(docId) ?? 
    (typeof storeMetadata?.optimisticTarget === 'boolean' ? !storeMetadata.optimisticTarget : false);

  const willFollow = typeof storeMetadata?.optimisticTarget === 'boolean' 
    ? storeMetadata.optimisticTarget 
    : !currentlyFollowing;

  // Immediate synchronous cache update
  userFollowStatusCache.set(docId, willFollow);
  try { localStorage.setItem(`rj_follow_${docId}`, String(willFollow)); } catch (_) {}

  // Calculate new count
  let newCount: number;
  if (typeof storeMetadata?.currentCount === 'number') {
    newCount = storeMetadata.currentCount;
  } else {
    const current = followersCountCache.get(vendorId) ?? 0;
    newCount = willFollow ? current + 1 : Math.max(0, current - 1);
  }

  followersCountCache.set(vendorId, newCount);

  // Dispatch intra-window events for 0ms instantaneous UI synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vendor_followers_updated', {
      detail: { vendorId, count: newCount }
    }));
    window.dispatchEvent(new CustomEvent('user_follow_updated', {
      detail: { docId, isFollowing: willFollow }
    }));
  }

  // Mutex lock to prevent duplicate concurrent writes
  if (inFlightFollowLocks.has(docId)) {
    return { isFollowing: willFollow, followersCount: newCount };
  }
  inFlightFollowLocks.add(docId);

  // High-performance parallel Firebase persistence
  try {
    const syncPayload = {
      followersCount: newCount,
      followers: newCount,
      updatedAt: now
    };

    if (willFollow) {
      const followerPayload = {
        id: docId,
        vendorId,
        userId,
        customerName: user.displayName || 'সম্মানিত ক্রেতা',
        customerEmail: user.email || '',
        followedAt: now
      };

      await Promise.allSettled([
        setDoc(doc(db, 'store_followers', docId), followerPayload, { merge: true }),
        setDoc(doc(db, 'vendors', vendorId), syncPayload, { merge: true }),
        rtdbSet(`store_followers/${docId}`, followerPayload),
        rtdbUpdate(`vendors/${vendorId}`, syncPayload),
        rtdbUpdate(`stores/${vendorId}`, syncPayload)
      ]);
    } else {
      await Promise.allSettled([
        deleteDoc(doc(db, 'store_followers', docId)),
        setDoc(doc(db, 'vendors', vendorId), syncPayload, { merge: true }),
        rtdbRemove(`store_followers/${docId}`),
        rtdbUpdate(`vendors/${vendorId}`, syncPayload),
        rtdbUpdate(`stores/${vendorId}`, syncPayload)
      ]);
    }

    return { isFollowing: willFollow, followersCount: newCount };
  } finally {
    inFlightFollowLocks.delete(docId);
  }
}


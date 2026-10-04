import { 
  collection, 
  query as fsQuery, 
  where as fsWhere, 
  getDocs, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rtdbGet, rtdbSet, rtdbRemove, rtdbUpdate } from '../lib/rtdb';

// In-memory follower count cache keyed by vendorId
const followersCountCache = new Map<string, number>();

// In-memory mutex locks to prevent race conditions on rapid double-taps
const inFlightFollowLocks = new Set<string>();

/**
 * Normalizes vendor ID string
 */
function cleanVendorId(rawId: any): string {
  if (!rawId) return '';
  return String(rawId).trim();
}

/**
 * Fetches the authentic, deduplicated total number of followers for a vendor
 * strictly from the actual database state (Firestore & RTDB store_followers).
 */
export async function getVendorRealFollowersCount(vendorIdInput: string): Promise<number> {
  const vendorId = cleanVendorId(vendorIdInput);
  if (!vendorId) return 0;

  const uniqueUserIds = new Set<string>();

  // 1. Fetch from Cloud Firestore 'store_followers' collection
  try {
    const q = fsQuery(
      collection(db, 'store_followers'),
      fsWhere('vendorId', '==', vendorId)
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      let uid = data?.userId;
      if (!uid && docId.startsWith(`${vendorId}_`)) {
        uid = docId.substring(`${vendorId}_`.length);
      }
      if (uid && typeof uid === 'string' && uid.trim().length > 0) {
        uniqueUserIds.add(uid.trim());
      }
    });
  } catch (err) {
    console.warn('[vendorFollowerService] Firestore count query error:', err);
  }

  // 2. Fallback check for any store_followers entries in RTDB
  try {
    const rtdbFollowers = await rtdbGet<Record<string, any>>('store_followers').catch(() => null);
    if (rtdbFollowers && typeof rtdbFollowers === 'object') {
      for (const [key, rawVal] of Object.entries(rtdbFollowers)) {
        if (!rawVal || typeof rawVal !== 'object') continue;
        const val = rawVal as any;
        const matchesVendor = 
          val.vendorId === vendorId || 
          val.storeId === vendorId || 
          key.startsWith(`${vendorId}_`);

        if (matchesVendor) {
          let uid = val.userId;
          if (!uid && key.startsWith(`${vendorId}_`)) {
            uid = key.substring(`${vendorId}_`.length);
          }
          if (uid && typeof uid === 'string' && uid.trim().length > 0) {
            uniqueUserIds.add(uid.trim());
          }
        }
      }
    }
  } catch (_) {}

  const finalRealCount = uniqueUserIds.size;

  // Cache in memory for instant synchronous lookup
  followersCountCache.set(vendorId, finalRealCount);

  // Sync real count back to vendor records so shallow reads stay accurate
  try {
    const syncPayload = {
      followersCount: finalRealCount,
      followers: finalRealCount
    };
    Promise.allSettled([
      setDoc(doc(db, 'vendors', vendorId), syncPayload, { merge: true }),
      rtdbUpdate(`vendors/${vendorId}`, syncPayload),
      rtdbUpdate(`stores/${vendorId}`, syncPayload),
      rtdbUpdate(`vendor_profiles/${vendorId}`, syncPayload)
    ]).catch(() => {});
  } catch (_) {}

  return finalRealCount;
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
 */
export async function isUserFollowingVendor(vendorIdInput: string, userIdInput: string): Promise<boolean> {
  const vendorId = cleanVendorId(vendorIdInput);
  const userId = cleanVendorId(userIdInput);
  if (!vendorId || !userId) return false;

  const docId = `${vendorId}_${userId}`;

  // 1. Check Cloud Firestore
  try {
    const snap = await getDoc(doc(db, 'store_followers', docId));
    if (snap.exists()) {
      return true;
    }
  } catch (_) {}

  // 2. Fallback check RTDB
  try {
    const rtdbFollow = await rtdbGet<any>(`store_followers/${docId}`).catch(() => null);
    if (rtdbFollow) return true;
    const userFollow = await rtdbGet<any>(`users/${userId}/followed_stores/${vendorId}`).catch(() => null);
    if (userFollow) return true;
  } catch (_) {}

  return false;
}

/**
 * Subscribes to real-time follower count updates for a specific vendor.
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

  // 1. Initial fetch
  getVendorRealFollowersCount(vendorId)
    .then((count) => onCountChange(count))
    .catch(() => onCountChange(0));

  // 2. Real-time snapshot
  let unsubscribeFs: (() => void) | null = null;
  try {
    const q = fsQuery(
      collection(db, 'store_followers'),
      fsWhere('vendorId', '==', vendorId)
    );
    unsubscribeFs = onSnapshot(
      q,
      (snap) => {
        const uniqueIds = new Set<string>();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const docId = docSnap.id;
          let uid = data?.userId;
          if (!uid && docId.startsWith(`${vendorId}_`)) {
            uid = docId.substring(`${vendorId}_`.length);
          }
          if (uid && typeof uid === 'string' && uid.trim().length > 0) {
            uniqueIds.add(uid.trim());
          }
        });
        const currentCount = uniqueIds.size;
        followersCountCache.set(vendorId, currentCount);
        onCountChange(currentCount);
      },
      (err) => {
        console.warn('[vendorFollowerService] onSnapshot error:', err);
      }
    );
  } catch (_) {}

  // 3. Custom event listener
  const handleCustomEvent = (e: any) => {
    if (e.detail?.vendorId === vendorId && typeof e.detail?.count === 'number') {
      followersCountCache.set(vendorId, e.detail.count);
      onCountChange(e.detail.count);
    }
  };
  window.addEventListener('vendor_followers_updated', handleCustomEvent);

  return () => {
    if (unsubscribeFs) {
      try { unsubscribeFs(); } catch (_) {}
    }
    window.removeEventListener('vendor_followers_updated', handleCustomEvent);
  };
}

/**
 * Subscribes to real-time follow status for a specific user and vendor.
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

  // Initial check
  isUserFollowingVendor(vendorId, userId)
    .then(isFollowing => onStatusChange(isFollowing))
    .catch(() => onStatusChange(false));

  const docId = `${vendorId}_${userId}`;
  let unsubscribeFs: (() => void) | null = null;
  try {
    unsubscribeFs = onSnapshot(
      doc(db, 'store_followers', docId),
      (snap) => {
        onStatusChange(snap.exists());
      },
      () => {
        // Fallback check on error
        isUserFollowingVendor(vendorId, userId).then(onStatusChange).catch(() => {});
      }
    );
  } catch (_) {}

  return () => {
    if (unsubscribeFs) {
      try { unsubscribeFs(); } catch (_) {}
    }
  };
}

/**
 * Toggles Follow/Unfollow status for a user on a vendor.
 *
 * Guaranteed Behavior:
 * - Thread-safe / Mutex lock prevents rapid double-clicks from creating duplicate records or race conditions.
 * - If not following: creates record in store_followers -> count increases by exactly 1.
 * - If already following: deletes record from store_followers -> count decreases by exactly 1.
 * - If user follows again: creates 1 record only -> count increases by exactly 1.
 * - On failure: throws error, does NOT falsify count.
 */
export async function toggleFollowVendor(
  vendorIdInput: string,
  user: { uid: string; displayName?: string | null; email?: string | null },
  storeMetadata?: { storeName?: string; storeLogo?: string }
): Promise<{ isFollowing: boolean; followersCount: number }> {
  const vendorId = cleanVendorId(vendorIdInput);
  const userId = cleanVendorId(user?.uid);

  if (!vendorId) {
    throw new Error('ভেন্ডর আইডি পাওয়া যায়নি');
  }
  if (!userId) {
    throw new Error('অনুগ্রহ করে লগইন করুন');
  }

  const lockKey = `${vendorId}_${userId}`;
  if (inFlightFollowLocks.has(lockKey)) {
    // Operation already in progress; ignore duplicate rapid tap
    throw new Error('REQUEST_IN_PROGRESS');
  }

  inFlightFollowLocks.add(lockKey);

  try {
    // 1. Check actual database state
    const currentlyFollowing = await isUserFollowingVendor(vendorId, userId);
    const docId = `${vendorId}_${userId}`;

    if (!currentlyFollowing) {
      // PERFORM FOLLOW
      const followerPayload = {
        id: docId,
        vendorId,
        userId,
        customerName: user.displayName || 'সম্মানিত ক্রেতা',
        customerEmail: user.email || '',
        followedAt: Date.now()
      };

      // Write to Firestore and RTDB concurrently
      await Promise.all([
        setDoc(doc(db, 'store_followers', docId), followerPayload, { merge: true }),
        rtdbSet(`store_followers/${docId}`, followerPayload).catch(() => {}),
        rtdbSet(`users/${userId}/followed_stores/${vendorId}`, {
          storeId: vendorId,
          storeName: storeMetadata?.storeName || 'Store',
          storeLogo: storeMetadata?.storeLogo || '',
          followedAt: Date.now()
        }).catch(() => {})
      ]);

      // Re-fetch exact authentic count from database
      const newCount = await getVendorRealFollowersCount(vendorId);

      // Notify any active listeners in this window
      try {
        window.dispatchEvent(new CustomEvent('vendor_followers_updated', {
          detail: { vendorId, count: newCount }
        }));
      } catch (_) {}

      return { isFollowing: true, followersCount: newCount };
    } else {
      // PERFORM UNFOLLOW
      await Promise.all([
        deleteDoc(doc(db, 'store_followers', docId)),
        rtdbRemove(`store_followers/${docId}`).catch(() => {}),
        rtdbRemove(`users/${userId}/followed_stores/${vendorId}`).catch(() => {})
      ]);

      // Re-fetch exact authentic count from database
      const newCount = await getVendorRealFollowersCount(vendorId);

      // Notify any active listeners in this window
      try {
        window.dispatchEvent(new CustomEvent('vendor_followers_updated', {
          detail: { vendorId, count: newCount }
        }));
      } catch (_) {}

      return { isFollowing: false, followersCount: newCount };
    }
  } finally {
    inFlightFollowLocks.delete(lockKey);
  }
}

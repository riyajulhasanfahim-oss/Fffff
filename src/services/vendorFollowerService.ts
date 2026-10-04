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
    // Truncate to 1 decimal place without rounding up to next magnitude (e.g. 999.9K)
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
 * Fetches the authentic follower count for a vendor directly from
 * Cloud Firestore Vendor document (vendors/{vendorId}).
 * Falls back to vendor_profiles or store_followers deduplicated count.
 */
export async function getVendorRealFollowersCount(vendorIdInput: string): Promise<number> {
  const vendorId = cleanVendorId(vendorIdInput);
  if (!vendorId) return 0;

  // 1. Read directly from the existing Cloud Firestore 'vendors' collection
  try {
    const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));
    if (vendorSnap.exists()) {
      const data = vendorSnap.data();
      const count = typeof data?.followersCount === 'number' 
        ? data.followersCount 
        : (typeof data?.followers === 'number' ? data.followers : null);
      if (count !== null && count >= 0) {
        followersCountCache.set(vendorId, count);
        return count;
      }
    }
  } catch (err) {
    console.warn('[vendorFollowerService] Firestore vendor doc count read error:', err);
  }

  // 2. Fallback check 'vendor_profiles' in Cloud Firestore
  try {
    const profileSnap = await getDoc(doc(db, 'vendor_profiles', vendorId));
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      const count = typeof data?.followersCount === 'number' 
        ? data.followersCount 
        : (typeof data?.followers === 'number' ? data.followers : null);
      if (count !== null && count >= 0) {
        followersCountCache.set(vendorId, count);
        return count;
      }
    }
  } catch (_) {}

  // 3. Fallback check 'store_followers' collection
  const uniqueUserIds = new Set<string>();
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
  } catch (_) {}

  const finalRealCount = uniqueUserIds.size;
  followersCountCache.set(vendorId, finalRealCount);

  // Synchronize to vendor doc in background so shallow reads stay accurate
  try {
    const syncPayload = {
      followersCount: finalRealCount,
      followers: finalRealCount,
      updatedAt: Date.now()
    };
    Promise.allSettled([
      setDoc(doc(db, 'vendors', vendorId), syncPayload, { merge: true }),
      rtdbUpdate(`vendors/${vendorId}`, syncPayload)
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

  // 1. Check Cloud Firestore store_followers
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
 * Subscribes directly to the Cloud Firestore Vendor document (vendors/{vendorId})
 * so manual edits in Firestore or background updates immediately reflect in the UI!
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

  // 2. Fetch fresh initial count from Firestore
  getVendorRealFollowersCount(vendorId)
    .then((count) => onCountChange(count))
    .catch(() => {});

  // 3. Real-time Firestore snapshot listener on the Vendor document
  let unsubscribeFsVendor: (() => void) | null = null;
  try {
    unsubscribeFsVendor = onSnapshot(
      doc(db, 'vendors', vendorId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const count = typeof data?.followersCount === 'number'
            ? data.followersCount
            : (typeof data?.followers === 'number' ? data.followers : null);
          if (count !== null && count >= 0) {
            followersCountCache.set(vendorId, count);
            onCountChange(count);
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

  // 4. Custom event for intra-window instant sync
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
    if (unsubscribeFsVendor) {
      try { unsubscribeFsVendor(); } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('vendor_followers_updated', handleCustomEvent);
    }
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
 * Backend persistence with Firestore and RTDB:
 * - Thread-safe mutex prevents rapid double-taps from creating duplicate records or race conditions.
 * - Follow: creates store_followers/${vendorId}_${userId} and increments/updates followersCount on vendors/${vendorId}.
 * - Unfollow: deletes store_followers/${vendorId}_${userId} and decrements/updates followersCount on vendors/${vendorId}.
 * - Stores follower count in Cloud Firestore Vendor document (vendors/{vendorId}) as a real numeric value.
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

  const lockKey = `${vendorId}_${userId}`;
  if (inFlightFollowLocks.has(lockKey)) {
    throw new Error('REQUEST_IN_PROGRESS');
  }

  inFlightFollowLocks.add(lockKey);

  try {
    const docId = `${vendorId}_${userId}`;

    // Determine target follow status
    let willFollow: boolean;
    if (typeof storeMetadata?.optimisticTarget === 'boolean') {
      willFollow = storeMetadata.optimisticTarget;
    } else {
      const currentlyFollowing = await isUserFollowingVendor(vendorId, userId);
      willFollow = !currentlyFollowing;
    }

    if (willFollow) {
      // 1. Create follower record in store_followers
      const followerPayload = {
        id: docId,
        vendorId,
        userId,
        customerName: user.displayName || 'সম্মানিত ক্রেতা',
        customerEmail: user.email || '',
        followedAt: Date.now()
      };

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

      // 2. Calculate new follower count
      let newCount: number;
      if (typeof storeMetadata?.currentCount === 'number') {
        newCount = storeMetadata.currentCount;
      } else {
        const cached = followersCountCache.get(vendorId) ?? 0;
        newCount = cached + 1;
      }

      // 3. Persist new follower count to Firestore Vendor document (vendors/{vendorId})
      const syncPayload = {
        followersCount: newCount,
        followers: newCount,
        updatedAt: Date.now()
      };

      await Promise.allSettled([
        updateDoc(doc(db, 'vendors', vendorId), syncPayload).catch(() => {
          return setDoc(doc(db, 'vendors', vendorId), syncPayload, { merge: true });
        }),
        updateDoc(doc(db, 'vendor_profiles', vendorId), syncPayload).catch(() => {
          return setDoc(doc(db, 'vendor_profiles', vendorId), syncPayload, { merge: true });
        }),
        updateDoc(doc(db, 'stores', vendorId), syncPayload).catch(() => {
          return setDoc(doc(db, 'stores', vendorId), syncPayload, { merge: true });
        }),
        rtdbUpdate(`vendors/${vendorId}`, syncPayload),
        rtdbUpdate(`stores/${vendorId}`, syncPayload),
        rtdbUpdate(`vendor_profiles/${vendorId}`, syncPayload)
      ]);

      followersCountCache.set(vendorId, newCount);

      // Notify intra-window listeners
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vendor_followers_updated', {
            detail: { vendorId, count: newCount }
          }));
        }
      } catch (_) {}

      return { isFollowing: true, followersCount: newCount };
    } else {
      // PERFORM UNFOLLOW
      // 1. Delete follower record
      await Promise.all([
        deleteDoc(doc(db, 'store_followers', docId)),
        rtdbRemove(`store_followers/${docId}`).catch(() => {}),
        rtdbRemove(`users/${userId}/followed_stores/${vendorId}`).catch(() => {})
      ]);

      // 2. Calculate new follower count
      let newCount: number;
      if (typeof storeMetadata?.currentCount === 'number') {
        newCount = storeMetadata.currentCount;
      } else {
        const cached = followersCountCache.get(vendorId) ?? 1;
        newCount = Math.max(0, cached - 1);
      }

      // 3. Persist updated follower count to Firestore Vendor document (vendors/{vendorId})
      const syncPayload = {
        followersCount: newCount,
        followers: newCount,
        updatedAt: Date.now()
      };

      await Promise.allSettled([
        updateDoc(doc(db, 'vendors', vendorId), syncPayload).catch(() => {
          return setDoc(doc(db, 'vendors', vendorId), syncPayload, { merge: true });
        }),
        updateDoc(doc(db, 'vendor_profiles', vendorId), syncPayload).catch(() => {
          return setDoc(doc(db, 'vendor_profiles', vendorId), syncPayload, { merge: true });
        }),
        updateDoc(doc(db, 'stores', vendorId), syncPayload).catch(() => {
          return setDoc(doc(db, 'stores', vendorId), syncPayload, { merge: true });
        }),
        rtdbUpdate(`vendors/${vendorId}`, syncPayload),
        rtdbUpdate(`stores/${vendorId}`, syncPayload),
        rtdbUpdate(`vendor_profiles/${vendorId}`, syncPayload)
      ]);

      followersCountCache.set(vendorId, newCount);

      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vendor_followers_updated', {
            detail: { vendorId, count: newCount }
          }));
        }
      } catch (_) {}

      return { isFollowing: false, followersCount: newCount };
    }
  } finally {
    inFlightFollowLocks.delete(lockKey);
  }
}

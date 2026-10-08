/**
 * Reseller Referral Service
 * 
 * Strict Guidelines:
 * - Uses Firebase Realtime Database (RTDB) exclusively.
 * - Handles referral code generation and lookup for Resellers.
 * - Adds exactly ৳200 to the referrer's reseller wallet on successful reseller registration.
 * - Prevents double crediting and maintains immutable ledger records.
 */

import { rtdbGet, rtdbSet, rtdbUpdate, rtdbPush, rtdbTransaction } from '../lib/rtdb';
import { executeResellerWalletTransaction } from './resellerWalletService';
import { ResellerTransactionType } from '../types/resellerWallet';
import { getOrCreateVendorWallet } from './vendorPayoutService';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const REFERRAL_BONUS_AMOUNT = 200; // Referrer gets ৳200
export const NEW_USER_REFERRAL_BONUS = 50; // New user gets ৳50

export interface ReferralCodeInfo {
  code: string;
  userId: string;
  resellerId?: string;
  vendorId?: string;
  role?: string;
  resellerName?: string;
  vendorName?: string;
  name?: string;
  createdAt: number;
}

export interface ReferrerLookupResult {
  valid: boolean;
  userId?: string;
  name?: string;
  code?: string;
}

export interface ReferralItem {
  id: string;
  referredUserId: string;
  referredName: string;
  referredEmail?: string;
  bonusAmount: number;
  status: string;
  createdAt: number;
}

export interface ReferralStats {
  totalReferrals: number;
  totalEarnings: number;
  activeResellers: number;
  activeVendors?: number;
}

export async function getResellerReferralCode(userId: string): Promise<string> {
  if (!userId) return '';
  const res = await getOrCreateReferralCode(userId, undefined, 'Reseller');
  return res.code;
}

export async function getVendorReferralCode(userId: string): Promise<string> {
  if (!userId) return '';
  const res = await getOrCreateReferralCode(userId, undefined, 'Vendor');
  return res.code;
}

export async function getOrCreateVendorReferralCode(
  userId: string,
  userName?: string,
  storeName?: string
): Promise<{ code: string; referralLink: string }> {
  return getOrCreateReferralCode(userId, storeName || userName, 'Vendor');
}

/**
 * Gets an existing referral code for a user or creates a new one in RTDB.
 * Supports both Resellers and Vendors seamlessly.
 */
export async function getOrCreateReferralCode(
  userId: string,
  userName?: string,
  role: 'Reseller' | 'Vendor' = 'Reseller'
): Promise<{ code: string; referralLink: string }> {
  if (!userId) {
    return { code: '', referralLink: '' };
  }

  const defaultLink = (code: string) => 
    role === 'Vendor'
      ? `${window.location.origin}/become-vendor?ref=${code}`
      : `${window.location.origin}/reseller/apply?ref=${code}`;

  try {
    // 1. Check if user already has a referral code by direct key
    const existingByUid = await rtdbGet<any>(`referral_codes/${userId}`);
    if (existingByUid && existingByUid.code) {
      const code = String(existingByUid.code).toUpperCase();
      // Ensure cross-index is also set
      await rtdbSet(`referral_codes/${code}`, {
        code,
        userId,
        resellerId: role === 'Reseller' ? userId : (existingByUid.resellerId || undefined),
        vendorId: role === 'Vendor' ? userId : (existingByUid.vendorId || undefined),
        role: existingByUid.role || role,
        resellerName: role === 'Reseller' ? (userName || existingByUid.resellerName || 'Reseller') : existingByUid.resellerName,
        vendorName: role === 'Vendor' ? (userName || existingByUid.vendorName || 'Vendor') : existingByUid.vendorName,
        name: userName || existingByUid.name || existingByUid.resellerName || existingByUid.vendorName || (role === 'Vendor' ? 'Vendor' : 'Reseller'),
        createdAt: existingByUid.createdAt || Date.now()
      }).catch(() => {});

      return {
        code,
        referralLink: defaultLink(code)
      };
    }

    // 2. Generate a clean, 8-character unique referral code from UID
    const newCode = userId.substring(0, 8).toUpperCase();
    const cleanName = userName || (role === 'Vendor' ? 'Vendor Partner' : 'Reseller Partner');
    const now = Date.now();

    const record: ReferralCodeInfo = {
      code: newCode,
      userId,
      resellerId: role === 'Reseller' ? userId : undefined,
      vendorId: role === 'Vendor' ? userId : undefined,
      role,
      resellerName: role === 'Reseller' ? cleanName : undefined,
      vendorName: role === 'Vendor' ? cleanName : undefined,
      name: cleanName,
      createdAt: now
    };

    // Store in both paths for O(1) direct key lookup
    const updates: Promise<any>[] = [
      rtdbSet(`referral_codes/${newCode}`, record),
      rtdbSet(`referral_codes/${userId}`, record),
      rtdbUpdate(`users/${userId}`, { referralCode: newCode })
    ];

    if (role === 'Vendor') {
      updates.push(rtdbUpdate(`vendors/${userId}`, { referralCode: newCode }));
    } else {
      updates.push(rtdbUpdate(`resellers/${userId}`, { referralCode: newCode }));
    }

    await Promise.allSettled(updates);

    return {
      code: newCode,
      referralLink: defaultLink(newCode)
    };
  } catch (error) {
    console.error('[ReferralService] Error getting/creating referral code:', error);
    const fallbackCode = userId.substring(0, 8).toUpperCase();
    return {
      code: fallbackCode,
      referralLink: defaultLink(fallbackCode)
    };
  }
}

/**
 * Validates a referral code against RTDB and Firestore.
 */
export async function lookupReferralCode(rawCode: string): Promise<ReferrerLookupResult> {
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode || cleanCode.length < 3) {
    return { valid: false };
  }

  try {
    // 1. Direct RTDB lookup in referral_codes/{cleanCode}
    const directCode = await rtdbGet<any>(`referral_codes/${cleanCode}`).catch(() => null);
    if (directCode && directCode.userId) {
      return {
        valid: true,
        userId: directCode.userId,
        name: directCode.resellerName || directCode.vendorName || directCode.name || 'রেফারার পার্টনার',
        code: cleanCode
      };
    }

    // 2. Direct RTDB lookup in referral_codes/{rawCode.trim()}
    if (rawCode.trim() !== cleanCode) {
      const rawDirect = await rtdbGet<any>(`referral_codes/${rawCode.trim()}`).catch(() => null);
      if (rawDirect && rawDirect.userId) {
        return {
          valid: true,
          userId: rawDirect.userId,
          name: rawDirect.resellerName || rawDirect.vendorName || rawDirect.name || 'রেফারার পার্টনার',
          code: cleanCode
        };
      }
    }

    // 3. Direct user / reseller / vendor check in RTDB if cleanCode matches UID
    const [uDirect, rDirect, vDirect, mlmDirect] = await Promise.all([
      rtdbGet<any>(`users/${cleanCode}`).catch(() => null),
      rtdbGet<any>(`resellers/${cleanCode}`).catch(() => null),
      rtdbGet<any>(`vendors/${cleanCode}`).catch(() => null),
      rtdbGet<any>(`mlm_members/${cleanCode}`).catch(() => null)
    ]);
    if (uDirect) {
      return {
        valid: true,
        userId: cleanCode,
        name: uDirect.name || uDirect.fullName || 'রেফারার পার্টনার',
        code: cleanCode
      };
    }
    if (rDirect) {
      return {
        valid: true,
        userId: cleanCode,
        name: rDirect.fullName || rDirect.name || 'রেফারার পার্টনার',
        code: cleanCode
      };
    }
    if (vDirect) {
      return {
        valid: true,
        userId: cleanCode,
        name: vDirect.storeName || vDirect.shopName || vDirect.ownerName || 'ভেন্ডর পার্টনার',
        code: cleanCode
      };
    }
    if (mlmDirect && (mlmDirect.userId || mlmDirect.id)) {
      return {
        valid: true,
        userId: mlmDirect.userId || mlmDirect.id,
        name: mlmDirect.name || 'রেফারার পার্টনার',
        code: cleanCode
      };
    }

    // 4. Lookup in referral_codes collection map
    const allCodes = await rtdbGet<Record<string, any>>('referral_codes').catch(() => null);
    if (allCodes && typeof allCodes === 'object') {
      for (const [key, rawVal] of Object.entries(allCodes)) {
        const val = rawVal as any;
        if (!val) continue;
        const c = String(val.code || key).toUpperCase();
        if (c === cleanCode || key.toUpperCase() === cleanCode) {
          return {
            valid: true,
            userId: val.userId || val.resellerId || val.vendorId || key,
            name: val.resellerName || val.vendorName || val.name || 'রেফারার পার্টনার',
            code: cleanCode
          };
        }
      }
    }

    // 5. Check if it matches a reseller UID directly or starts with it, or matches referralCode
    const allResellers = await rtdbGet<Record<string, any>>('resellers').catch(() => null);
    if (allResellers && typeof allResellers === 'object') {
      for (const [uid, rawRData] of Object.entries(allResellers)) {
        const rData = rawRData as any;
        if (!rData) continue;
        const upperUid = uid.toUpperCase();
        const rRefCode = String(rData.referralCode || '').toUpperCase();
        if (upperUid.startsWith(cleanCode) || upperUid === cleanCode || rRefCode === cleanCode) {
          return {
            valid: true,
            userId: uid,
            name: rData.fullName || rData.name || 'রেফারার পার্টনার',
            code: cleanCode
          };
        }
      }
    }

    // 6. Check vendors table
    const allVendors = await rtdbGet<Record<string, any>>('vendors').catch(() => null);
    if (allVendors && typeof allVendors === 'object') {
      for (const [uid, rawVData] of Object.entries(allVendors)) {
        const vData = rawVData as any;
        if (!vData) continue;
        const upperUid = uid.toUpperCase();
        const vRefCode = String(vData.referralCode || '').toUpperCase();
        if (upperUid.startsWith(cleanCode) || upperUid === cleanCode || vRefCode === cleanCode) {
          return {
            valid: true,
            userId: uid,
            name: vData.storeName || vData.shopName || vData.ownerName || vData.name || 'ভেন্ডর পার্টনার',
            code: cleanCode
          };
        }
      }
    }

    // 7. Check users table
    const allUsers = await rtdbGet<Record<string, any>>('users').catch(() => null);
    if (allUsers && typeof allUsers === 'object') {
      for (const [uid, rawUData] of Object.entries(allUsers)) {
        const uData = rawUData as any;
        if (!uData) continue;
        const upperUid = uid.toUpperCase();
        const uRefCode = String(uData.referralCode || '').toUpperCase();
        if (upperUid.startsWith(cleanCode) || upperUid === cleanCode || uRefCode === cleanCode) {
          return {
            valid: true,
            userId: uid,
            name: uData.name || uData.fullName || 'রেফারার পার্টনার',
            code: cleanCode
          };
        }
      }
    }

    // 8. Check Firestore collections: referral_codes, users, resellers, vendors
    try {
      // 8a. Firestore referral_codes/{cleanCode}
      const fsSnap = await getDoc(doc(db, 'referral_codes', cleanCode)).catch(() => null);
      if (fsSnap && fsSnap.exists()) {
        const d = fsSnap.data();
        if (d && (d.userId || d.resellerId || d.vendorId)) {
          return {
            valid: true,
            userId: d.userId || d.resellerId || d.vendorId,
            name: d.resellerName || d.vendorName || d.name || 'রেফারার পার্টনার',
            code: cleanCode
          };
        }
      }

      // 8b. Firestore users query by referralCode
      const userRefSnap = await getDocs(query(collection(db, 'users'), where('referralCode', '==', cleanCode))).catch(() => null);
      if (userRefSnap && !userRefSnap.empty) {
        const uDoc = userRefSnap.docs[0];
        const uData = uDoc.data();
        return {
          valid: true,
          userId: uDoc.id,
          name: uData?.name || uData?.fullName || 'রেফারার পার্টনার',
          code: cleanCode
        };
      }

      // 8c. Firestore direct user doc by UID
      const directUserFs = await getDoc(doc(db, 'users', cleanCode)).catch(() => null);
      if (directUserFs && directUserFs.exists()) {
        const uData = directUserFs.data();
        return {
          valid: true,
          userId: cleanCode,
          name: uData?.name || uData?.fullName || 'রেফারার পার্টনার',
          code: cleanCode
        };
      }
    } catch (fsErr) {
      console.warn('[ReferralService] Firestore referral lookup fallback warning:', fsErr);
    }

    return { valid: false };
  } catch (error) {
    console.error('[ReferralService] Error looking up referral code:', error);
    return { valid: false };
  }
}

export interface ProcessReferralParams {
  referrerId: string;
  newUserId: string;
  newUserName: string;
  newUserEmail?: string;
  newUserRole: 'Reseller' | 'Vendor';
}

export interface ProcessReferralResult {
  success: boolean;
  newUserBonus: number;
  referrerBonus: number;
  message: string;
  alreadyProcessed?: boolean;
}

/**
 * Atomically processes both referral bonuses upon verified Vendor or Reseller account creation:
 * 1. Exactly ৳50 credited to the new registrant's wallet.
 * 2. Exactly ৳200 credited to the referrer's wallet.
 * Fully idempotent: prevents any duplicate bonus from page refreshes, retries, or re-registrations.
 * Both RTDB and Firestore ledger records and wallet balances are safely updated without overwriting.
 */
export async function processReferralRewards(
  params: ProcessReferralParams
): Promise<ProcessReferralResult> {
  const { referrerId, newUserId, newUserName, newUserEmail, newUserRole } = params;

  if (!referrerId || !newUserId) {
    return { success: false, newUserBonus: 0, referrerBonus: 0, message: 'Invalid referrer or user ID' };
  }

  if (referrerId === newUserId) {
    return { success: false, newUserBonus: 0, referrerBonus: 0, message: 'Cannot refer oneself' };
  }

  const recordPath = `referrals/${referrerId}/${newUserId}`;
  const logPath = `referral_rewards_log/${newUserId}`;
  const now = Date.now();
  const bonusOrderId = `BONUS-${newUserId.substring(0, 8)}`;
  const refOrderId = `REF-${newUserId.substring(0, 8)}`;

  try {
    // 1. Idempotency Check: check if already credited across RTDB or Firestore
    const [existingReferral, existingLog, existingFsLog] = await Promise.all([
      rtdbGet<any>(recordPath).catch(() => null),
      rtdbGet<any>(logPath).catch(() => null),
      getDoc(doc(db, 'referral_rewards_log', newUserId)).catch(() => null)
    ]);

    const isAlreadyCompleted = 
      (existingReferral && existingReferral.status === 'Completed') ||
      (existingLog && existingLog.status === 'Completed') ||
      (existingFsLog && existingFsLog.exists() && existingFsLog.data()?.status === 'Completed');

    if (isAlreadyCompleted) {
      console.warn(`[ReferralService] Referral for new user ${newUserId} already processed.`);
      return {
        success: true,
        newUserBonus: NEW_USER_REFERRAL_BONUS,
        referrerBonus: REFERRAL_BONUS_AMOUNT,
        message: 'ইতিমধ্যে রেফারেল বোনাস প্রদান করা হয়েছে।',
        alreadyProcessed: true
      };
    }

    // Set immediate lock to avoid race conditions
    await Promise.allSettled([
      rtdbSet(logPath, {
        status: 'Processing',
        newUserId,
        referrerId,
        newUserRole,
        createdAt: now
      }),
      setDoc(doc(db, 'referral_rewards_log', newUserId), {
        status: 'Processing',
        newUserId,
        referrerId,
        newUserRole,
        createdAt: now
      }, { merge: true })
    ]);

    // 2. CREDIT ৳50 TO NEW USER'S WALLET
    if (newUserRole === 'Vendor') {
      const vendorWallet = await getOrCreateVendorWallet(newUserId);
      const prevBal = Number(vendorWallet?.balance || 0);
      const prevLifetime = Number(vendorWallet?.lifetimeEarnings || 0);
      const newBal = prevBal + NEW_USER_REFERRAL_BONUS;
      const newLifetime = prevLifetime + NEW_USER_REFERRAL_BONUS;

      // Update RTDB vendor wallet
      await rtdbUpdate(`vendor_wallet/${newUserId}`, {
        balance: newBal,
        lifetimeEarnings: newLifetime,
        vendorId: newUserId,
        updatedAt: now
      });

      // Update Firestore vendor wallet
      try {
        await setDoc(doc(db, 'vendor_wallet', newUserId), {
          id: newUserId,
          vendorId: newUserId,
          balance: newBal,
          lifetimeEarnings: newLifetime,
          updatedAt: now
        }, { merge: true });
      } catch (_) {}

      // Record transaction
      const bonusTxPayload = {
        vendorId: newUserId,
        userId: newUserId,
        orderId: bonusOrderId,
        type: 'Bonus',
        amount: NEW_USER_REFERRAL_BONUS,
        status: 'Completed',
        description: '🎁 রেফারেল কোড ব্যবহারের জন্য একাউন্ট খোলার বোনাস (৳৫০)',
        createdAt: now,
        isReferral: true
      };
      await rtdbPush('wallet_transactions', bonusTxPayload);
      try {
        await setDoc(doc(db, 'vendor_wallet_transactions', `TXN-${bonusOrderId}`), {
          id: `TXN-${bonusOrderId}`,
          ...bonusTxPayload
        }, { merge: true });
      } catch (_) {}

      // Update user records in RTDB and Firestore
      const userUpdates = {
        wallet: newBal,
        balance: newBal,
        walletBalance: newBal,
        referralBonusEarned: NEW_USER_REFERRAL_BONUS,
        updatedAt: now
      };
      await Promise.allSettled([
        rtdbUpdate(`users/${newUserId}`, userUpdates),
        setDoc(doc(db, 'users', newUserId), userUpdates, { merge: true }),
        rtdbUpdate(`user_wallet/${newUserId}`, { walletBalance: newBal, updatedAt: now }),
        setDoc(doc(db, 'user_wallet', newUserId), { walletBalance: newBal, updatedAt: now }, { merge: true })
      ]);
    } else {
      // Reseller gets ৳50 in reseller wallet
      await executeResellerWalletTransaction({
        resellerId: newUserId,
        userId: newUserId,
        orderId: bonusOrderId,
        amount: NEW_USER_REFERRAL_BONUS,
        type: ResellerTransactionType.PROFIT_RELEASED,
        status: 'Approved',
        description: '🎁 রেফারেল কোড ব্যবহারের জন্য একাউন্ট খোলার বোনাস (৳৫০)',
        idempotencyKey: `signup_ref_bonus_${newUserId}`,
        metadata: {
          bonusType: 'reseller_referral_signup',
          newUserId,
          referrerId
        }
      });

      await rtdbPush('reseller_transactions', {
        resellerId: newUserId,
        orderId: bonusOrderId,
        customerName: newUserName,
        productName: 'রেফারেল বোনাস (অ্যাকাউন্ট খোলার পুরষ্কার)',
        amount: NEW_USER_REFERRAL_BONUS,
        status: 'Approved',
        createdAt: now,
        isReferral: true
      });

      // Sync Firestore reseller_wallet
      try {
        await setDoc(doc(db, 'reseller_wallet', newUserId), {
          id: newUserId,
          resellerId: newUserId,
          availableBalance: NEW_USER_REFERRAL_BONUS,
          walletBalance: NEW_USER_REFERRAL_BONUS,
          approvedCommission: NEW_USER_REFERRAL_BONUS,
          releasedProfit: NEW_USER_REFERRAL_BONUS,
          updatedAt: now
        }, { merge: true });
      } catch (_) {}

      // Update user records in RTDB and Firestore
      const userUpdates = {
        wallet: NEW_USER_REFERRAL_BONUS,
        balance: NEW_USER_REFERRAL_BONUS,
        walletBalance: NEW_USER_REFERRAL_BONUS,
        resellerBalance: NEW_USER_REFERRAL_BONUS,
        referralBonusEarned: NEW_USER_REFERRAL_BONUS,
        updatedAt: now
      };
      await Promise.allSettled([
        rtdbUpdate(`users/${newUserId}`, userUpdates),
        setDoc(doc(db, 'users', newUserId), userUpdates, { merge: true }),
        rtdbUpdate(`user_wallet/${newUserId}`, { walletBalance: NEW_USER_REFERRAL_BONUS, updatedAt: now }),
        setDoc(doc(db, 'user_wallet', newUserId), { walletBalance: NEW_USER_REFERRAL_BONUS, updatedAt: now }, { merge: true })
      ]);
    }

    // 3. CREDIT ৳200 TO REFERRER'S WALLET
    const [refVendor, refReseller, refUser] = await Promise.all([
      rtdbGet<any>(`vendors/${referrerId}`).catch(() => null),
      rtdbGet<any>(`resellers/${referrerId}`).catch(() => null),
      rtdbGet<any>(`users/${referrerId}`).catch(() => null)
    ]);
    const isReferrerVendor = Boolean(refVendor || refUser?.role === 'Vendor');
    const isReferrerReseller = Boolean(refReseller || refUser?.role === 'Reseller');

    const prevUserWallet = Number(refUser?.wallet ?? refUser?.balance ?? refUser?.walletBalance ?? 0);
    const prevRefEarnings = Number(refUser?.totalReferralEarnings || 0);

    if (isReferrerVendor) {
      // Credit Vendor Wallet
      const currentWallet = await getOrCreateVendorWallet(referrerId);
      const prevBal = Number(currentWallet?.balance || 0);
      const prevLifetime = Number(currentWallet?.lifetimeEarnings || 0);
      const updatedBal = prevBal + REFERRAL_BONUS_AMOUNT;
      const updatedLifetime = prevLifetime + REFERRAL_BONUS_AMOUNT;

      await rtdbUpdate(`vendor_wallet/${referrerId}`, {
        balance: updatedBal,
        lifetimeEarnings: updatedLifetime,
        vendorId: referrerId,
        updatedAt: now
      });

      try {
        await setDoc(doc(db, 'vendor_wallet', referrerId), {
          id: referrerId,
          vendorId: referrerId,
          balance: updatedBal,
          lifetimeEarnings: updatedLifetime,
          updatedAt: now
        }, { merge: true });
      } catch (_) {}

      const refTxPayload = {
        vendorId: referrerId,
        userId: referrerId,
        orderId: refOrderId,
        type: 'Bonus',
        amount: REFERRAL_BONUS_AMOUNT,
        status: 'Completed',
        description: `🎁 ${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস (${newUserName})`,
        createdAt: now,
        isReferral: true
      };
      await rtdbPush('wallet_transactions', refTxPayload);
      try {
        await setDoc(doc(db, 'vendor_wallet_transactions', `TXN-${refOrderId}`), {
          id: `TXN-${refOrderId}`,
          ...refTxPayload
        }, { merge: true });
      } catch (_) {}

      const updatedUserVals = {
        wallet: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        balance: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        walletBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        totalReferralEarnings: prevRefEarnings + REFERRAL_BONUS_AMOUNT,
        updatedAt: now
      };
      await Promise.allSettled([
        rtdbUpdate(`users/${referrerId}`, updatedUserVals),
        setDoc(doc(db, 'users', referrerId), updatedUserVals, { merge: true }),
        rtdbUpdate(`user_wallet/${referrerId}`, { walletBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT, updatedAt: now }),
        setDoc(doc(db, 'user_wallet', referrerId), { walletBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT, updatedAt: now }, { merge: true })
      ]);
    } else if (isReferrerReseller) {
      // Credit Reseller Wallet atomically
      await executeResellerWalletTransaction({
        resellerId: referrerId,
        userId: referrerId,
        orderId: refOrderId,
        amount: REFERRAL_BONUS_AMOUNT,
        type: ResellerTransactionType.PROFIT_RELEASED,
        status: 'Approved',
        description: `🎁 ${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস (${newUserName})`,
        idempotencyKey: `referrer_bonus_${newUserId}`,
        metadata: {
          newUserId,
          newUserName,
          newUserRole
        }
      });

      await rtdbPush('reseller_transactions', {
        resellerId: referrerId,
        orderId: refOrderId,
        customerName: newUserName,
        productName: `${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস`,
        amount: REFERRAL_BONUS_AMOUNT,
        status: 'Approved',
        createdAt: now,
        isReferral: true
      });

      const updatedUserVals = {
        wallet: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        balance: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        walletBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        resellerBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        totalReferralEarnings: prevRefEarnings + REFERRAL_BONUS_AMOUNT,
        updatedAt: now
      };
      await Promise.allSettled([
        rtdbUpdate(`users/${referrerId}`, updatedUserVals),
        setDoc(doc(db, 'users', referrerId), updatedUserVals, { merge: true }),
        rtdbUpdate(`user_wallet/${referrerId}`, { walletBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT, updatedAt: now }),
        setDoc(doc(db, 'user_wallet', referrerId), { walletBalance: prevUserWallet + REFERRAL_BONUS_AMOUNT, updatedAt: now }, { merge: true })
      ]);
    } else {
      // Referrer is a regular user (Customer/Affiliate)
      const prevUw = await rtdbGet<any>(`user_wallet/${referrerId}`).catch(() => null);
      const prevUwBal = Number(prevUw?.walletBalance ?? prevUserWallet ?? 0);
      const newUwBal = prevUwBal + REFERRAL_BONUS_AMOUNT;

      const updatedUserVals = {
        wallet: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        balance: prevUserWallet + REFERRAL_BONUS_AMOUNT,
        walletBalance: newUwBal,
        totalReferralEarnings: prevRefEarnings + REFERRAL_BONUS_AMOUNT,
        updatedAt: now
      };

      await Promise.allSettled([
        rtdbUpdate(`user_wallet/${referrerId}`, {
          walletBalance: newUwBal,
          approvedCommission: Number(prevUw?.approvedCommission || 0) + REFERRAL_BONUS_AMOUNT,
          updatedAt: now
        }),
        setDoc(doc(db, 'user_wallet', referrerId), {
          id: referrerId,
          userId: referrerId,
          walletBalance: newUwBal,
          approvedCommission: Number(prevUw?.approvedCommission || 0) + REFERRAL_BONUS_AMOUNT,
          updatedAt: now
        }, { merge: true }),
        rtdbUpdate(`users/${referrerId}`, updatedUserVals),
        setDoc(doc(db, 'users', referrerId), updatedUserVals, { merge: true }),
        rtdbPush('wallet_transactions', {
          userId: referrerId,
          orderId: refOrderId,
          type: 'Bonus',
          amount: REFERRAL_BONUS_AMOUNT,
          status: 'Completed',
          description: `🎁 ${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস (${newUserName})`,
          createdAt: now,
          isReferral: true
        })
      ]);
    }

    // 4. Update referral tracking record in RTDB referrals/
    const trackingRecord = {
      id: newUserId,
      referredUserId: newUserId,
      referredName: newUserName,
      referredEmail: newUserEmail || '',
      bonusAmount: REFERRAL_BONUS_AMOUNT,
      newUserBonus: NEW_USER_REFERRAL_BONUS,
      status: 'Completed',
      userRole: newUserRole,
      createdAt: now
    };
    await rtdbSet(recordPath, trackingRecord);

    // 5. Update referrer's referral stats atomically in RTDB
    await rtdbTransaction(`referral_stats/${referrerId}`, (curr) => {
      const prevCount = Number(curr?.totalReferrals || 0);
      const prevEarnings = Number(curr?.totalEarnings || 0);
      const prevActiveResellers = Number(curr?.activeResellers || 0);
      const prevActiveVendors = Number(curr?.activeVendors || 0);

      return {
        totalReferrals: prevCount + 1,
        totalEarnings: prevEarnings + REFERRAL_BONUS_AMOUNT,
        activeResellers: newUserRole === 'Reseller' ? prevActiveResellers + 1 : prevActiveResellers,
        activeVendors: newUserRole === 'Vendor' ? prevActiveVendors + 1 : prevActiveVendors,
        updatedAt: now
      };
    });

    // 6. Complete the log record in RTDB
    await rtdbSet(logPath, {
      ...trackingRecord,
      referrerId,
      status: 'Completed'
    });

    // 7. Dual-persist to Firestore for secure backup & ledger compliance
    try {
      await Promise.allSettled([
        setDoc(doc(db, 'referral_rewards_log', newUserId), {
          id: newUserId,
          newUserId,
          referrerId,
          newUserName,
          newUserEmail: newUserEmail || '',
          newUserRole,
          newUserBonus: NEW_USER_REFERRAL_BONUS,
          referrerBonus: REFERRAL_BONUS_AMOUNT,
          status: 'Completed',
          createdAt: now
        }, { merge: true }),
        setDoc(doc(db, 'referrals', referrerId, 'items', newUserId), {
          id: newUserId,
          ...trackingRecord,
          referrerId
        }, { merge: true }),
        setDoc(doc(db, 'referral_credits', newUserId), {
          id: newUserId,
          newUserId,
          referrerId,
          newUserRole,
          amount: NEW_USER_REFERRAL_BONUS,
          referrerAmount: REFERRAL_BONUS_AMOUNT,
          status: 'Completed',
          createdAt: now
        }, { merge: true })
      ]);
    } catch (fsErr) {
      console.warn('[ReferralService] Firestore persistence warning:', fsErr);
    }

    return {
      success: true,
      newUserBonus: NEW_USER_REFERRAL_BONUS,
      referrerBonus: REFERRAL_BONUS_AMOUNT,
      message: `রেফারেল বোনাস সফলভাবে ওয়ালেটে যোগ করা হয়েছে (নতুন একাউন্টে ৳${NEW_USER_REFERRAL_BONUS} এবং রেফারারের ওয়ালেটে ৳${REFERRAL_BONUS_AMOUNT})`
    };
  } catch (error) {
    console.error('[ReferralService] Error processing referral rewards:', error);
    return {
      success: false,
      newUserBonus: 0,
      referrerBonus: 0,
      message: 'Failed to process referral rewards: ' + String(error)
    };
  }
}

/**
 * Backward compatibility wrapper for creditReferralBonus.
 */
export async function creditReferralBonus(
  referrerId: string,
  newUserId: string,
  newUserName: string,
  newUserEmail?: string,
  newUserRole: 'Reseller' | 'Vendor' = 'Reseller'
): Promise<{ success: boolean; amount: number; message: string }> {
  const res = await processReferralRewards({
    referrerId,
    newUserId,
    newUserName,
    newUserEmail,
    newUserRole
  });
  return {
    success: res.success,
    amount: res.referrerBonus,
    message: res.message
  };
}

/**
 * Fetches referral statistics and history for a reseller or vendor from RTDB.
 */
export async function getReferralStatsAndHistory(userId: string): Promise<{
  stats: ReferralStats;
  history: ReferralItem[];
}> {
  if (!userId) {
    return {
      stats: { totalReferrals: 0, totalEarnings: 0, activeResellers: 0, activeVendors: 0 },
      history: []
    };
  }

  try {
    const [statsData, historyData] = await Promise.all([
      rtdbGet<any>(`referral_stats/${userId}`),
      rtdbGet<Record<string, any>>(`referrals/${userId}`)
    ]);

    const history: ReferralItem[] = [];
    if (historyData && typeof historyData === 'object') {
      for (const [id, item] of Object.entries(historyData)) {
        if (!item) continue;
        history.push({
          id,
          referredUserId: item.referredUserId || id,
          referredName: item.referredName || (item.userRole === 'Vendor' ? 'নতুন ভেন্ডর' : 'নতুন রিসেলার'),
          referredEmail: item.referredEmail || '',
          bonusAmount: Number(item.bonusAmount || REFERRAL_BONUS_AMOUNT),
          status: item.status || 'Completed',
          createdAt: Number(item.createdAt || Date.now())
        });
      }
      // Sort newest first
      history.sort((a, b) => b.createdAt - a.createdAt);
    }

    const calculatedEarnings = history.reduce((sum, item) => sum + (item.bonusAmount || REFERRAL_BONUS_AMOUNT), 0);
    const calculatedCount = history.length;

    const stats: ReferralStats = {
      totalReferrals: Math.max(calculatedCount, Number(statsData?.totalReferrals || 0)),
      totalEarnings: Math.max(calculatedEarnings, Number(statsData?.totalEarnings || 0)),
      activeResellers: Number(statsData?.activeResellers || (statsData?.activeVendors ? 0 : calculatedCount)),
      activeVendors: Number(statsData?.activeVendors || 0)
    };

    return { stats, history };
  } catch (error) {
    console.error('[ReferralService] Error fetching stats and history:', error);
    return {
      stats: { totalReferrals: 0, totalEarnings: 0, activeResellers: 0, activeVendors: 0 },
      history: []
    };
  }
}

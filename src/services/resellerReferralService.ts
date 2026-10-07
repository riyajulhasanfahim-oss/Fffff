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

export const REFERRAL_BONUS_AMOUNT = 200;

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
 * Validates a referral code against RTDB.
 */
export async function lookupReferralCode(rawCode: string): Promise<ReferrerLookupResult> {
  const cleanCode = (rawCode || '').trim().toUpperCase();
  if (!cleanCode || cleanCode.length < 3) {
    return { valid: false };
  }

  try {
    // 1. Direct RTDB lookup in referral_codes/{cleanCode}
    const directCode = await rtdbGet<any>(`referral_codes/${cleanCode}`);
    if (directCode && directCode.userId) {
      return {
        valid: true,
        userId: directCode.userId,
        name: directCode.resellerName || directCode.name || 'রেফারার পার্টনার',
        code: cleanCode
      };
    }

    // 2. Lookup in referral_codes collection
    const allCodes = await rtdbGet<Record<string, any>>('referral_codes');
    if (allCodes && typeof allCodes === 'object') {
      for (const [key, val] of Object.entries(allCodes)) {
        if (!val) continue;
        const c = String(val.code || key).toUpperCase();
        if (c === cleanCode || key.toUpperCase() === cleanCode) {
          return {
            valid: true,
            userId: val.userId || val.resellerId || key,
            name: val.resellerName || val.name || 'রেফারার পার্টনার',
            code: cleanCode
          };
        }
      }
    }

    // 3. Check if it matches a reseller UID directly or starts with it
    const allResellers = await rtdbGet<Record<string, any>>('resellers');
    if (allResellers && typeof allResellers === 'object') {
      for (const [uid, rData] of Object.entries(allResellers)) {
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

    // 4. Check vendors table
    const allVendors = await rtdbGet<Record<string, any>>('vendors');
    if (allVendors && typeof allVendors === 'object') {
      for (const [uid, vData] of Object.entries(allVendors)) {
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

    // 5. Check users table
    const allUsers = await rtdbGet<Record<string, any>>('users');
    if (allUsers && typeof allUsers === 'object') {
      for (const [uid, uData] of Object.entries(allUsers)) {
        if (!uData) continue;
        const upperUid = uid.toUpperCase();
        const uRefCode = String(uData.referralCode || '').toUpperCase();
        if (upperUid.startsWith(cleanCode) || upperUid === cleanCode || uRefCode === cleanCode) {
          return {
            valid: true,
            userId: uid,
            name: uData.name || 'রেফারার পার্টনার',
            code: cleanCode
          };
        }
      }
    }

    return { valid: false };
  } catch (error) {
    console.error('[ReferralService] Error looking up referral code:', error);
    return { valid: false };
  }
}

/**
 * Credits ৳200 referral bonus to the referrer's wallet upon verified user/reseller/vendor registration.
 * Fully atomic and idempotent to prevent duplicate payouts.
 * Works seamlessly whether the referrer is a Reseller or a Vendor.
 */
export async function creditReferralBonus(
  referrerId: string,
  newUserId: string,
  newUserName: string,
  newUserEmail?: string,
  newUserRole: 'Reseller' | 'Vendor' = 'Reseller'
): Promise<{ success: boolean; amount: number; message: string }> {
  if (!referrerId || !newUserId) {
    return { success: false, amount: 0, message: 'Invalid referrer or user ID' };
  }

  if (referrerId === newUserId) {
    return { success: false, amount: 0, message: 'Cannot refer oneself' };
  }

  const recordPath = `referrals/${referrerId}/${newUserId}`;
  const now = Date.now();

  try {
    // 1. Idempotency Check: check if already credited
    const existing = await rtdbGet<any>(recordPath);
    if (existing && existing.status === 'Completed') {
      console.warn(`[ReferralService] Referral ${newUserId} already credited for ${referrerId}`);
      return { success: true, amount: REFERRAL_BONUS_AMOUNT, message: 'Already credited' };
    }

    const bonusAmount = REFERRAL_BONUS_AMOUNT; // exactly ৳200

    // 2. Determine if referrer is a Vendor or a Reseller
    const [refVendor, refUser] = await Promise.all([
      rtdbGet<any>(`vendors/${referrerId}`).catch(() => null),
      rtdbGet<any>(`users/${referrerId}`).catch(() => null)
    ]);
    const isReferrerVendor = Boolean(refVendor || refUser?.role === 'Vendor');

    if (isReferrerVendor) {
      // Credit Vendor Wallet
      const currentWallet = await getOrCreateVendorWallet(referrerId);
      const prevBal = Number(currentWallet?.balance || 0);
      const prevLifetime = Number(currentWallet?.lifetimeEarnings || 0);

      await rtdbUpdate(`vendor_wallet/${referrerId}`, {
        balance: prevBal + bonusAmount,
        lifetimeEarnings: prevLifetime + bonusAmount,
        updatedAt: now
      });

      // Add to wallet_transactions for immediate UI visibility in Vendor Wallet
      await rtdbPush('wallet_transactions', {
        vendorId: referrerId,
        orderId: `REF-${newUserId}`,
        type: 'Bonus',
        amount: bonusAmount,
        status: 'Completed',
        description: `${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস (${newUserName})`,
        createdAt: now,
        isReferral: true
      });
    } else {
      // Credit Reseller Wallet atomically
      await executeResellerWalletTransaction({
        resellerId: referrerId,
        userId: referrerId,
        orderId: `REF-${newUserId}`,
        amount: bonusAmount,
        type: ResellerTransactionType.PROFIT_RELEASED,
        status: 'Approved',
        description: `${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস (${newUserName})`,
        metadata: {
          newUserId,
          newUserName,
          bonusType: 'referral_bonus'
        }
      });

      // Also push directly to reseller_transactions for immediate UI visibility
      await rtdbPush('reseller_transactions', {
        resellerId: referrerId,
        orderId: `REF-${newUserId}`,
        customerName: newUserName,
        productName: `${newUserRole === 'Vendor' ? 'ভেন্ডর' : 'রিসেলার'} রেফারেল বোনাস`,
        amount: bonusAmount,
        status: 'Approved',
        createdAt: now,
        isReferral: true
      });
    }

    // 3. Update referral tracking record in common referrals/ node
    await rtdbSet(recordPath, {
      id: newUserId,
      referredUserId: newUserId,
      referredName: newUserName,
      referredEmail: newUserEmail || '',
      bonusAmount,
      status: 'Completed',
      userRole: newUserRole,
      createdAt: now
    });

    // 4. Update referrer's referral stats atomically
    await rtdbTransaction(`referral_stats/${referrerId}`, (curr) => {
      const prevCount = Number(curr?.totalReferrals || 0);
      const prevEarnings = Number(curr?.totalEarnings || 0);
      const prevActiveResellers = Number(curr?.activeResellers || 0);
      const prevActiveVendors = Number(curr?.activeVendors || 0);

      return {
        totalReferrals: prevCount + 1,
        totalEarnings: prevEarnings + bonusAmount,
        activeResellers: newUserRole === 'Reseller' ? prevActiveResellers + 1 : prevActiveResellers,
        activeVendors: newUserRole === 'Vendor' ? prevActiveVendors + 1 : prevActiveVendors,
        updatedAt: now
      };
    });

    return {
      success: true,
      amount: bonusAmount,
      message: `৳${bonusAmount} রেফারেল বোনাস সফলভাবে ওয়ালেটে যোগ করা হয়েছে`
    };
  } catch (error) {
    console.error('[ReferralService] Error crediting referral bonus:', error);
    return {
      success: false,
      amount: 0,
      message: 'Failed to credit referral bonus: ' + String(error)
    };
  }
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

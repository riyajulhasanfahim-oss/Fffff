import { rtdbList, rtdbGet, rtdbSet, rtdbUpdate, rtdbPush, rtdbSubscribe, rtdbRemove } from '../lib/rtdb';

export type AdCampaignType = 'Banner Ad' | 'Featured Slider' | 'Search Spotlight';

export interface AdCampaignRecord {
  id: string;
  vendorId: string;
  vendorName?: string;
  title: string;
  type: AdCampaignType;
  productId: string;
  productName: string;
  productImage?: string;
  bannerUrl: string;
  durationDays: number;
  budget: number;
  paymentMethod: 'wallet' | 'bkash' | 'nagad' | 'rocket' | 'upay';
  transactionId?: string;
  senderPhone?: string;
  status: 'pending_approval' | 'active' | 'paused' | 'expired' | 'rejected';
  rejectionReason?: string;
  impressions: number;
  clicks: number;
  createdAt: number;
  startTime?: number;
  expiresAt?: number;
  approvedAt?: number;
}

/**
 * Checks if an ad campaign is currently active
 */
export function isAdActive(ad: AdCampaignRecord | any): boolean {
  if (!ad) return false;
  if (ad.status !== 'active') return false;
  if (ad.expiresAt && Date.now() >= ad.expiresAt) return false;
  return true;
}

/**
 * Fetches all active approved ads, optionally filtered by ad type
 */
export async function fetchActiveAds(type?: AdCampaignType): Promise<AdCampaignRecord[]> {
  try {
    const list = await rtdbList<AdCampaignRecord>('vendor_ads', (ad) => {
      if (ad.status !== 'active') return false;
      if (ad.expiresAt && Date.now() >= ad.expiresAt) return false;
      if (type && ad.type !== type) return false;
      return true;
    });

    return list.map(item => ({ id: item.id, ...item.data }));
  } catch (err) {
    console.error('Error fetching active ads:', err);
    return [];
  }
}

/**
 * Real-time subscription to active ads
 */
export function subscribeToActiveAds(type: AdCampaignType | undefined, callback: (ads: AdCampaignRecord[]) => void): () => void {
  let isMounted = true;
  let cachedAds: AdCampaignRecord[] = [];

  const refresh = async () => {
    if (!isMounted) return;
    const ads = await fetchActiveAds(type);
    if (isMounted) {
      cachedAds = ads;
      callback(ads);
    }
  };

  refresh();

  const unsub = rtdbSubscribe('vendor_ads', () => {
    refresh();
  });

  // 10 second ticker to evict expired ads automatically
  const interval = setInterval(() => {
    if (!isMounted) return;
    const now = Date.now();
    const stillActive = cachedAds.filter(a => !a.expiresAt || a.expiresAt > now);
    if (stillActive.length !== cachedAds.length) {
      cachedAds = stillActive;
      callback(stillActive);
    }
  }, 10000);

  return () => {
    isMounted = false;
    clearInterval(interval);
    unsub();
  };
}

/**
 * Submits a new ad campaign with payment details
 */
export async function submitAdCampaign(data: {
  vendorId: string;
  vendorName?: string;
  title: string;
  type: AdCampaignType;
  productId: string;
  productName: string;
  productImage?: string;
  bannerUrl?: string;
  durationDays: number;
  budget: number;
  paymentMethod: 'wallet' | 'bkash' | 'nagad' | 'rocket' | 'upay';
  transactionId?: string;
  senderPhone?: string;
}): Promise<{ success: boolean; message: string; campaignId?: string }> {
  const now = Date.now();
  const id = `ad_${data.vendorId}_${now}`;

  let initialStatus: 'active' | 'pending_approval' = 'pending_approval';
  let startTime = undefined;
  let expiresAt = undefined;

  // If paying via wallet, verify and deduct balance
  if (data.paymentMethod === 'wallet') {
    try {
      const vendorWallet = await rtdbGet<any>(`vendor_wallet/${data.vendorId}`) || {};
      const balance = Number(vendorWallet.balance || vendorWallet.availableBalance || 0);
      if (balance < data.budget) {
        return {
          success: false,
          message: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজনীয়: ৳${data.budget}, বর্তমান ব্যালেন্স: ৳${balance}`
        };
      }

      const newBal = Math.max(0, balance - data.budget);
      await rtdbUpdate(`vendor_wallet/${data.vendorId}`, {
        balance: newBal,
        availableBalance: newBal,
        updatedAt: now
      });

      await rtdbPush(`vendor_wallet_transactions/${data.vendorId}`, {
        type: 'AD_CAMPAIGN_PAYMENT',
        amount: data.budget,
        campaignTitle: data.title,
        campaignType: data.type,
        createdAt: now,
        status: 'COMPLETED'
      });

      // Wallet payment is submitted as pending_approval or active
      initialStatus = 'pending_approval';
    } catch (err: any) {
      console.error('Wallet deduction error for ad campaign:', err);
      return { success: false, message: 'ওয়ালেট থেকে পেমেন্ট কাটতে ব্যর্থ হয়েছে।' };
    }
  }

  const payload: AdCampaignRecord = {
    id,
    vendorId: data.vendorId,
    vendorName: data.vendorName || '',
    title: data.title,
    type: data.type,
    productId: data.productId,
    productName: data.productName,
    productImage: data.productImage || '',
    bannerUrl: data.bannerUrl || data.productImage || '',
    durationDays: data.durationDays,
    budget: data.budget,
    paymentMethod: data.paymentMethod,
    transactionId: data.transactionId || (data.paymentMethod === 'wallet' ? `WAL-${now}` : ''),
    senderPhone: data.senderPhone || '',
    status: initialStatus,
    impressions: 0,
    clicks: 0,
    createdAt: now,
    startTime,
    expiresAt
  };

  await rtdbSet(`vendor_ads/${id}`, payload);

  return {
    success: true,
    message: 'অ্যাড ক্যাম্পেইন রিকোয়েস্ট সফলভাবে জমা হয়েছে। অ্যাডমিন পেমেন্ট রিভিউ করে শীঘ্রই লাইভ করবে।',
    campaignId: id
  };
}

/**
 * Increments ad impressions safely
 */
export async function recordAdImpression(adId: string): Promise<void> {
  try {
    const current = await rtdbGet<number>(`vendor_ads/${adId}/impressions`) || 0;
    await rtdbUpdate(`vendor_ads/${adId}`, {
      impressions: current + 1
    });
  } catch (_) {}
}

/**
 * Increments ad clicks safely
 */
export async function recordAdClick(adId: string): Promise<void> {
  try {
    const current = await rtdbGet<number>(`vendor_ads/${adId}/clicks`) || 0;
    await rtdbUpdate(`vendor_ads/${adId}`, {
      clicks: current + 1
    });
  } catch (_) {}
}

/**
 * Admin: Approves an Ad Campaign
 */
export async function adminApproveAd(adId: string): Promise<void> {
  const ad = await rtdbGet<AdCampaignRecord>(`vendor_ads/${adId}`);
  if (!ad) throw new Error('Ad campaign not found');

  const now = Date.now();
  const durationDays = Number(ad.durationDays) || 7;
  const expiresAt = now + (durationDays * 24 * 60 * 60 * 1000);

  await rtdbUpdate(`vendor_ads/${adId}`, {
    status: 'active',
    startTime: now,
    expiresAt,
    approvedAt: now
  });
}

/**
 * Admin: Rejects an Ad Campaign
 */
export async function adminRejectAd(adId: string, reason?: string): Promise<void> {
  await rtdbUpdate(`vendor_ads/${adId}`, {
    status: 'rejected',
    rejectionReason: reason || 'Ad banner or payment did not meet guidelines'
  });
}

/**
 * Vendor: Toggles pause/active on campaign
 */
export async function toggleAdPause(adId: string, currentStatus: string): Promise<string> {
  const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
  await rtdbUpdate(`vendor_ads/${adId}`, {
    status: nextStatus
  });
  return nextStatus;
}

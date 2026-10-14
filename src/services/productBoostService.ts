import { rtdbList, rtdbGet, rtdbSet, rtdbUpdate, rtdbPush, rtdbSubscribe, rtdbRemove } from '../lib/rtdb';
import { executeResellerWalletTransaction } from './resellerWalletService';

export interface ProductBoostPlan {
  days: number;
  price: number;
  label: string;
  badge?: string;
  description: string;
}

export const BOOST_PLANS: ProductBoostPlan[] = [
  { days: 3, price: 150, label: '3 Days', badge: 'Starter', description: 'Quick boost for testing conversion' },
  { days: 7, price: 300, label: '7 Days', badge: 'Popular', description: 'Recommended for standard weekly promotions' },
  { days: 15, price: 550, label: '15 Days', badge: 'Value', description: 'Half-month intensive spotlight' },
  { days: 30, price: 1000, label: '30 Days', badge: 'Best ROI', description: 'Full month prime placement across marketplace' }
];

export interface ProductBoostRecord {
  id: string;
  vendorId: string;
  vendorName?: string;
  productId: string;
  productName: string;
  productImage?: string;
  planDays: number;
  price: number;
  paymentMethod: 'wallet' | 'bkash' | 'nagad' | 'rocket' | 'upay';
  transactionId?: string;
  senderPhone?: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  rejectionReason?: string;
  requestedAt: number;
  startTime?: number;
  expiresAt?: number;
  approvedAt?: number;
}

/**
 * Checks if a boost record is currently active
 */
export function isBoostActive(boost: ProductBoostRecord | any): boolean {
  if (!boost) return false;
  if (boost.status !== 'active') return false;
  if (boost.expiresAt && Date.now() >= boost.expiresAt) return false;
  return true;
}

/**
 * Submits a new boost request with payment details
 */
export async function submitProductBoostRequest(data: {
  vendorId: string;
  vendorName?: string;
  productId: string;
  productName: string;
  productImage?: string;
  planDays: number;
  paymentMethod: 'wallet' | 'bkash' | 'nagad' | 'rocket' | 'upay';
  transactionId?: string;
  senderPhone?: string;
}): Promise<{ success: boolean; message: string; boostId?: string }> {
  const plan = BOOST_PLANS.find(p => p.days === data.planDays) || BOOST_PLANS[1];
  const now = Date.now();
  const id = `boost_${data.productId}_${now}`;

  // If paying via wallet, verify and deduct balance
  let initialStatus: 'active' | 'pending' = 'pending';
  let startTime = undefined;
  let expiresAt = undefined;

  if (data.paymentMethod === 'wallet') {
    try {
      const vendorWallet = await rtdbGet<any>(`vendor_wallet/${data.vendorId}`) || {};
      const balance = Number(vendorWallet.balance || vendorWallet.availableBalance || 0);
      if (balance < plan.price) {
        return {
          success: false,
          message: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজনীয়: ৳${plan.price}, বর্তমান ব্যালেন্স: ৳${balance}`
        };
      }

      // Deduct from vendor wallet
      const newBal = Math.max(0, balance - plan.price);
      await rtdbUpdate(`vendor_wallet/${data.vendorId}`, {
        balance: newBal,
        availableBalance: newBal,
        updatedAt: now
      });

      // Record wallet log
      await rtdbPush(`vendor_wallet_transactions/${data.vendorId}`, {
        type: 'PRODUCT_BOOST_PAYMENT',
        amount: plan.price,
        productId: data.productId,
        productName: data.productName,
        planDays: plan.days,
        createdAt: now,
        status: 'COMPLETED'
      });

      // Wallet payment automatically activates
      initialStatus = 'active';
      startTime = now;
      expiresAt = now + (plan.days * 24 * 60 * 60 * 1000);
    } catch (err: any) {
      console.error('Wallet deduction error:', err);
      return { success: false, message: 'ওয়ালেট থেকে ব্যালেন্স কাটতে ব্যর্থ হয়েছে।' };
    }
  }

  const payload: ProductBoostRecord = {
    id,
    vendorId: data.vendorId,
    vendorName: data.vendorName || '',
    productId: data.productId,
    productName: data.productName,
    productImage: data.productImage || '',
    planDays: plan.days,
    price: plan.price,
    paymentMethod: data.paymentMethod,
    transactionId: data.transactionId || (data.paymentMethod === 'wallet' ? `WAL-${now}` : ''),
    senderPhone: data.senderPhone || '',
    status: initialStatus,
    requestedAt: now,
    startTime,
    expiresAt
  };

  await rtdbSet(`product_boosts/${id}`, payload);

  // If active, also immediately update product
  if (initialStatus === 'active') {
    await rtdbUpdate(`products/${data.productId}`, {
      boosted: true,
      boostExpiresAt: expiresAt,
      boostDays: plan.days,
      boostUpdatedAt: now
    }).catch(() => {});
  }

  return {
    success: true,
    message: initialStatus === 'active'
      ? `"${data.productName}" সফলভাবে ${plan.days} দিনের জন্য বুস্ট হয়েছে!`
      : 'বুস্ট রিকোয়েস্ট জমা হয়েছে। অ্যাডমিন পেমেন্ট ভেরিফাই করে দ্রুত অ্যাক্টিভ করবে।',
    boostId: id
  };
}

/**
 * Admin: Approves a boost request
 */
export async function adminApproveBoost(boostId: string): Promise<void> {
  const boost = await rtdbGet<ProductBoostRecord>(`product_boosts/${boostId}`);
  if (!boost) throw new Error('Boost record not found');

  const now = Date.now();
  const planDays = boost.planDays || 7;
  const expiresAt = now + (planDays * 24 * 60 * 60 * 1000);

  await rtdbUpdate(`product_boosts/${boostId}`, {
    status: 'active',
    startTime: now,
    expiresAt: expiresAt,
    approvedAt: now
  });

  await rtdbUpdate(`products/${boost.productId}`, {
    boosted: true,
    boostExpiresAt: expiresAt,
    boostDays: planDays,
    boostUpdatedAt: now
  }).catch(() => {});
}

/**
 * Admin: Rejects a boost request
 */
export async function adminRejectBoost(boostId: string, reason?: string): Promise<void> {
  const boost = await rtdbGet<ProductBoostRecord>(`product_boosts/${boostId}`);
  if (!boost) throw new Error('Boost record not found');

  await rtdbUpdate(`product_boosts/${boostId}`, {
    status: 'rejected',
    rejectionReason: reason || 'Payment could not be verified'
  });

  await rtdbUpdate(`products/${boost.productId}`, {
    boosted: false,
    boostExpiresAt: null
  }).catch(() => {});
}

/**
 * Expires any boost whose expiry timestamp has passed
 */
export async function checkAndExpireBoosts(): Promise<void> {
  try {
    const list = await rtdbList<ProductBoostRecord>('product_boosts', (b) => b.status === 'active');
    const now = Date.now();
    for (const item of list) {
      if (item.data.expiresAt && now >= item.data.expiresAt) {
        await rtdbUpdate(`product_boosts/${item.id}`, { status: 'expired' });
        await rtdbUpdate(`products/${item.data.productId}`, {
          boosted: false,
          boostExpiresAt: null
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('Error expiring boosts:', e);
  }
}

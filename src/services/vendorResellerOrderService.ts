import { rtdbGet, rtdbSet, rtdbUpdate, rtdbPush, rtdbList, rtdbTransaction } from '../lib/rtdb';
import { 
  verifyAndRecalculateResellerProfit, 
  validateOrderStateTransition, 
  checkFinancialIdempotency, 
  recordFinancialIdempotency, 
  ensureVendorBalanceConsistency 
} from './resellerSecurityService';

export interface VendorWalletBalances {
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  pendingBalance: number;
  raw?: any;
}

export interface ResellerOrderEligibilityResult {
  isResellerOrder: boolean;
  requiredResellerProfit: number;
  availableBalance: number;
  lockedBalance: number;
  totalBalance: number;
  isBalanceSufficient: boolean;
  shortfall: number;
  canConfirm: boolean;
  reason?: string;
}

export interface VendorDepositParams {
  vendorId: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  senderNumber?: string | null;
  orderId?: string;
  invoiceId?: string;
}

/**
 * Safely parses any numeric amount, stripping currency symbols, commas, spaces,
 * and converting Bengali digits into pure floating point numbers.
 */
export function parseNumericAmount(val: any): number {
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (!val && val !== 0) return 0;
  const bengaliNumerals: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  let str = String(val).replace(/[০-৯]/g, (d) => bengaliNumerals[d] || d);
  str = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Fetches vendor wallet balances from RTDB exclusively,
 * calculating Available, Locked, and Total balances distinctly
 * Formula: totalBalance = availableBalance + lockedBalance
 */
export async function getVendorWalletBalances(vendorId: string): Promise<VendorWalletBalances> {
  if (!vendorId) {
    return { availableBalance: 0, lockedBalance: 0, totalBalance: 0, pendingBalance: 0 };
  }

  try {
    const source = (await rtdbGet<any>(`vendor_wallet/${vendorId}`)) || {};
    
    // Available balance is the freely spendable balance
    const availableBalance = Math.round(parseNumericAmount(
      source.availableBalance ?? 
      source.balance ?? 
      source.currentBalance ?? 
      0
    ) * 100) / 100;

    // Locked balance represents funds reserved for pending/processing reseller orders or held disputes
    const lockedBalance = Math.round(parseNumericAmount(
      source.lockedBalance ?? 
      source.resellerProfitReserve ?? 
      0
    ) * 100) / 100;

    // Total balance is mathematically Available + Locked
    const totalBalance = Math.round((availableBalance + lockedBalance) * 100) / 100;

    const pendingBalance = Math.round(parseNumericAmount(
      source.pendingBalance ?? 
      source.pendingPayout ?? 
      0
    ) * 100) / 100;

    return {
      availableBalance: Math.max(0, availableBalance),
      lockedBalance: Math.max(0, lockedBalance),
      totalBalance: Math.max(0, totalBalance),
      pendingBalance: Math.max(0, pendingBalance),
      raw: source
    };
  } catch (error) {
    console.error('Error getting vendor wallet balances:', error);
    return { availableBalance: 0, lockedBalance: 0, totalBalance: 0, pendingBalance: 0 };
  }
}

/**
 * Checks whether an order object represents a valid Reseller Order.
 * Correctly identifies all existing reseller structures across Firebase RTDB nodes (orders, vendor_orders, reseller_orders):
 * - Direct boolean / string boolean indicators (isResellerOrder, isReseller, resellerOrder)
 * - Reseller ID fields (resellerId, resellerUID, resellerUid, resellerUserId, reseller_id)
 * - Profit status flags (profitStatus, resellerProfitStatus)
 * - Order type and channel indicators (orderType, type, channel, source)
 * - Price snapshot profit records and line items reseller profit
 */
export function isResellerOrderRecord(order: any): boolean {
  if (!order || typeof order !== 'object') return false;

  // 1. Direct boolean flags (handling boolean true and string "true")
  if (
    order.isResellerOrder === true || order.isResellerOrder === 'true' ||
    order.isReseller === true || order.isReseller === 'true' ||
    order.resellerOrder === true || order.resellerOrder === 'true' ||
    order.reseller_order === true || order.reseller_order === 'true'
  ) {
    return true;
  }

  // 2. Reseller ID fields (resellerId, resellerUID, resellerUid, resellerUserId, reseller_id)
  const resellerId = 
    order.resellerId || 
    order.resellerUID || 
    order.resellerUid || 
    order.resellerUserId || 
    order.reseller_id || 
    order.priceSnapshot?.resellerId || 
    order.resellerPriceSnapshot?.resellerId ||
    order.resellerOrderRecord?.resellerId;
  if (
    resellerId && 
    typeof resellerId === 'string' && 
    resellerId.trim().length > 0 && 
    resellerId !== 'null' && 
    resellerId !== 'undefined'
  ) {
    return true;
  }

  // 3. Profit status flags (e.g. 'PENDING', 'LOCKED', 'RELEASED')
  if (
    order.profitStatus && 
    typeof order.profitStatus === 'string' && 
    order.profitStatus.trim().length > 0 && 
    order.profitStatus !== 'null' && 
    order.profitStatus !== 'undefined'
  ) {
    return true;
  }

  // 4. Order type / source / channel indicators
  const orderType = String(order.orderType || order.type || order.channel || order.source || '').toLowerCase();
  if (orderType === 'reseller' || orderType.includes('reseller')) {
    return true;
  }

  // 5. Stored price snapshots / records (presence of object or profit amount)
  if (order.resellerPriceSnapshot && typeof order.resellerPriceSnapshot === 'object') {
    return true;
  }
  if (order.resellerOrderRecord && typeof order.resellerOrderRecord === 'object') {
    return true;
  }
  if (order.priceSnapshot && typeof order.priceSnapshot === 'object') {
    if (order.priceSnapshot.resellerId || order.priceSnapshot.resellerProfit !== undefined || order.priceSnapshot.resellerProfitAmount !== undefined) {
      return true;
    }
  }

  const snapshotProfit = 
    order.priceSnapshot?.resellerProfit ?? 
    order.resellerPriceSnapshot?.resellerProfit ?? 
    order.priceSnapshot?.resellerProfitAmount ?? 
    order.resellerPriceSnapshot?.resellerProfitAmount ?? 
    order.lockedProfitAmount;
  if (snapshotProfit !== undefined && snapshotProfit !== null && Number(snapshotProfit) >= 0) {
    if (Number(snapshotProfit) > 0 || order.priceSnapshot?.resellerId || order.resellerPriceSnapshot?.resellerId) {
      return true;
    }
  }

  // 6. Direct resellerProfit field
  if (order.resellerProfit !== undefined && order.resellerProfit !== null && Number(order.resellerProfit) > 0) {
    return true;
  }

  // 7. Line items containing reseller profit or reseller indicators
  const items = Array.isArray(order.items) 
    ? order.items 
    : (order.items && typeof order.items === 'object' ? Object.values(order.items) : []);
  if (items.some((it: any) => 
    it && (
      it.isReseller === true || it.isReseller === 'true' ||
      it.isResellerOrder === true || it.isResellerOrder === 'true' ||
      (it.resellerProfit !== undefined && it.resellerProfit !== null && Number(it.resellerProfit) > 0) ||
      (it.resellerItemProfit !== undefined && it.resellerItemProfit !== null && Number(it.resellerItemProfit) > 0) ||
      (it.resellerSellingPrice !== undefined && it.resellerSellingPrice !== null && Number(it.resellerSellingPrice) > 0 && it.vendorPrice !== undefined) ||
      (it.resellerId && typeof it.resellerId === 'string' && it.resellerId.trim().length > 0 && it.resellerId !== 'null')
    )
  )) {
    return true;
  }

  return false;
}

/**
 * Computes eligibility for confirming a reseller order based on required profit reserve
 */
export function checkResellerOrderEligibility(
  order: any,
  balances: VendorWalletBalances
): ResellerOrderEligibilityResult {
  const isReseller = isResellerOrderRecord(order);

  const rawProfit = 
    order?.resellerProfit ?? 
    order?.priceSnapshot?.resellerProfit ?? 
    order?.resellerPriceSnapshot?.resellerProfit ??
    order?.lockedProfitAmount ??
    0;

  const requiredResellerProfit = Math.round(parseNumericAmount(rawProfit) * 100) / 100;
  const available = Math.round(parseNumericAmount(balances.availableBalance) * 100) / 100;
  const locked = Math.round(parseNumericAmount(balances.lockedBalance) * 100) / 100;
  const total = Math.round((available + locked) * 100) / 100;

  if (!isReseller) {
    return {
      isResellerOrder: false,
      requiredResellerProfit: 0,
      availableBalance: available,
      lockedBalance: locked,
      totalBalance: total,
      isBalanceSufficient: true,
      shortfall: 0,
      canConfirm: true
    };
  }

  // If no profit is required (e.g. 0 profit product)
  if (requiredResellerProfit <= 0) {
    return {
      isResellerOrder: true,
      requiredResellerProfit: 0,
      availableBalance: available,
      lockedBalance: locked,
      totalBalance: total,
      isBalanceSufficient: true,
      shortfall: 0,
      canConfirm: true
    };
  }

  // Strict validation per specification:
  // if availableBalance >= requiredResellerProfit: confirmation allowed
  // else: confirmation blocked
  const isBalanceSufficient = available >= requiredResellerProfit;
  const shortfall = isBalanceSufficient ? 0 : Math.max(0, Math.round((requiredResellerProfit - available) * 100) / 100);
  const currentStatus = order?.status || order?.orderStatus || 'Pending';
  const isAlreadyProcessed = 
    ['Accepted', 'Processing', 'Shipped', 'In Transit', 'Delivered', 'Completed', 'Cancelled', 'Returned'].includes(currentStatus) ||
    order?.vendorOrderStatus === 'CONFIRMED' ||
    order?.profitStatus === 'LOCKED';

  const canConfirm = isBalanceSufficient && !isAlreadyProcessed && currentStatus === 'Pending';

  let reason = undefined;
  if (order?.vendorOrderStatus === 'CONFIRMED' || order?.profitStatus === 'LOCKED') {
    reason = 'অর্ডারটি ইতিমধ্যে কনফার্ম করা হয়েছে এবং রিসেলার প্রফিট লক রয়েছে।';
  } else if (isAlreadyProcessed) {
    reason = `Order is already ${currentStatus}`;
  } else if (!isBalanceSufficient) {
    reason = `Reseller profit reserve করার জন্য Vendor-এর wallet balance যথেষ্ট নয়। (প্রয়োজন: ৳${requiredResellerProfit}, বর্তমান ঘাটতি: ৳${shortfall})। অনুগ্রহ করে Deposit অপশন ব্যবহার করুন।`;
  }

  return {
    isResellerOrder: true,
    requiredResellerProfit,
    availableBalance: available,
    lockedBalance: locked,
    totalBalance: total,
    isBalanceSufficient,
    shortfall,
    canConfirm,
    reason
  };
}

/**
 * Deposits funds into Vendor Wallet with atomic RTDB transactions and duplicate protection
 * Formula: totalBalance = availableBalance + lockedBalance
 */
export async function creditVendorWalletDeposit(params: VendorDepositParams): Promise<{
  success: boolean;
  newBalance: number;
  message: string;
}> {
  const { vendorId, amount, transactionId, paymentMethod, senderNumber, orderId, invoiceId } = params;

  if (!vendorId || !transactionId || !amount || amount <= 0) {
    throw new Error('Invalid deposit parameters: vendorId, transactionId, and positive amount are required');
  }

  const cleanTrx = transactionId.trim().toUpperCase();
  const numAmount = Math.round(Number(amount) * 100) / 100;
  const now = Date.now();

  // 1. Strict Duplicate Check in RTDB: ensure this transactionId has not been used
  try {
    const existingTxs = await rtdbList<any>('wallet_transactions', (tx) => {
      const txTrx = (tx.transactionId || tx.trxId || '').trim().toUpperCase();
      return txTrx === cleanTrx;
    });

    if (existingTxs.length > 0) {
      throw new Error(`Transaction ID "${cleanTrx}" ইতিপূর্বে ব্যবহার করা হয়েছে। ডুপ্লিকেট ডিপোজিট গ্রহণ করা সম্ভব নয়।`);
    }

    const existingDeposits = await rtdbList<any>('vendor_wallet_deposits', (dep) => {
      const depTrx = (dep.transactionId || '').trim().toUpperCase();
      return depTrx === cleanTrx;
    });

    if (existingDeposits.length > 0) {
      throw new Error(`Transaction ID "${cleanTrx}" ইতিপূর্বে সফলভাবে ডিপোজিট করা হয়েছে।`);
    }
  } catch (dupErr: any) {
    if (dupErr.message && dupErr.message.includes('ইতিপূর্বে')) {
      throw dupErr;
    }
    console.warn('Duplicate check warning:', dupErr);
  }

  // 2. Perform Atomic Balance Transition on RTDB vendor_wallet
  let finalAvailable = 0;
  await rtdbTransaction<any>(`vendor_wallet/${vendorId}`, (current) => {
    const avail = Number(current?.availableBalance ?? current?.balance ?? current?.currentBalance ?? 0);
    const locked = Number(current?.lockedBalance ?? current?.resellerProfitReserve ?? 0);
    const updatedAvail = avail + numAmount;
    const updatedTotal = updatedAvail + locked;

    finalAvailable = updatedAvail;

    return {
      vendorId,
      availableBalance: updatedAvail,
      lockedBalance: locked,
      totalBalance: updatedTotal,
      balance: updatedAvail,
      currentBalance: updatedAvail,
      resellerProfitReserve: locked,
      pendingBalance: Number(current?.pendingBalance || 0),
      pendingPayout: Number(current?.pendingPayout || 0),
      totalEarned: Number(current?.totalEarned || 0),
      currency: current?.currency || 'BDT',
      createdAt: current?.createdAt || now,
      updatedAt: now
    };
  });

  // 3. Add Transaction Log in RTDB wallet_transactions
  const txData = {
    vendorId,
    userId: vendorId,
    amount: numAmount,
    type: 'Income',
    category: 'Deposit',
    status: 'Completed',
    transactionId: cleanTrx,
    paymentMethod: paymentMethod.toLowerCase(),
    senderNumber: senderNumber || null,
    invoiceId: invoiceId || `DEP-${now}`,
    orderId: orderId || null,
    description: orderId 
      ? `Reseller Order #${orderId.substring(0, 8)} Reserve Deposit`
      : 'Wallet Deposit',
    createdAt: now,
    updatedAt: now
  };
  await rtdbPush('wallet_transactions', txData);

  // 4. Record in RTDB vendor_wallet_deposits for audit
  const depositRecord = {
    transactionId: cleanTrx,
    vendorId,
    amount: numAmount,
    paymentMethod: paymentMethod.toLowerCase(),
    senderNumber: senderNumber || null,
    orderId: orderId || null,
    invoiceId: invoiceId || `DEP-${now}`,
    status: 'verified',
    verifiedAt: now,
    createdAt: now,
    updatedAt: now
  };
  await rtdbPush('vendor_wallet_deposits', depositRecord);

  return {
    success: true,
    newBalance: finalAvailable,
    message: `৳${numAmount} ডিপোজিট সফলভাবে সম্পন্ন হয়েছে।`
  };
}

/**
 * Backend Validation + Order Confirmation for Reseller Orders
 * Enforces all 5 server-side security checks using RTDB exclusively:
 * 1. Order is really a Reseller Order
 * 2. Order is still eligible (Pending)
 * 3. Required Reseller Profit amount is exact
 * 4. Vendor's Available Wallet Balance is sufficient (>= required profit)
 * 5. Order hasn't already been confirmed
 */
export async function confirmVendorResellerOrder(
  orderId: string,
  vendorId: string,
  existingOrderData?: any
): Promise<{
  success: boolean;
  message: string;
  requiredResellerProfit?: number;
  availableBalance?: number;
  lockedBalance?: number;
  totalBalance?: number;
  transactionId?: string;
  shortfall?: number;
  error?: string;
}> {
  if (!orderId || !vendorId) {
    throw new Error('Missing orderId or vendorId');
  }

  const cleanOrderId = String(orderId || existingOrderData?.id || '').trim().replace(/^#/, '');
  const pureOrderId = (cleanOrderId.includes('_') ? cleanOrderId.split('_')[0] : cleanOrderId).trim();
  const existingOrderMainId = String(existingOrderData?.orderId || existingOrderData?.mainOrderId || '').trim().replace(/^#/, '');
  const mainOrderIdCandidate = existingOrderMainId || pureOrderId || cleanOrderId;

  // 1. Strict Fetch from RTDB across vendor_orders, orders, and reseller_orders
  let order: any = null;
  let vendorOrderKey = `vendor_orders/${cleanOrderId}`;

  // Start with existingOrderData if available
  if (existingOrderData && typeof existingOrderData === 'object') {
    order = { ...existingOrderData };
    if (existingOrderData.id) {
      vendorOrderKey = `vendor_orders/${existingOrderData.id}`;
    }
  }

  // Fetch from vendor_orders with various key formats
  if (!order) {
    order = await rtdbGet<any>(`vendor_orders/${orderId}`);
    if (order) vendorOrderKey = `vendor_orders/${orderId}`;
  }
  if (!order) {
    order = await rtdbGet<any>(`vendor_orders/${cleanOrderId}`);
    if (order) vendorOrderKey = `vendor_orders/${cleanOrderId}`;
  }
  if (!order && vendorId) {
    order = await rtdbGet<any>(`vendor_orders/${cleanOrderId}_${vendorId}`);
    if (order) vendorOrderKey = `vendor_orders/${cleanOrderId}_${vendorId}`;
  }
  if (!order && pureOrderId && pureOrderId !== cleanOrderId && vendorId) {
    order = await rtdbGet<any>(`vendor_orders/${pureOrderId}_${vendorId}`);
    if (order) vendorOrderKey = `vendor_orders/${pureOrderId}_${vendorId}`;
  }
  if (!order && pureOrderId && pureOrderId !== cleanOrderId) {
    order = await rtdbGet<any>(`vendor_orders/${pureOrderId}`);
    if (order) vendorOrderKey = `vendor_orders/${pureOrderId}`;
  }

  // Fetch from RTDB 'orders' collection (where production orders placed on rjworldbd.com reside)
  let mainOrderData: any = null;
  if (cleanOrderId) {
    mainOrderData = await rtdbGet<any>(`orders/${cleanOrderId}`);
  }
  if (!mainOrderData && pureOrderId && pureOrderId !== cleanOrderId) {
    mainOrderData = await rtdbGet<any>(`orders/${pureOrderId}`);
  }
  if (!mainOrderData && mainOrderIdCandidate && mainOrderIdCandidate !== cleanOrderId && mainOrderIdCandidate !== pureOrderId) {
    mainOrderData = await rtdbGet<any>(`orders/${mainOrderIdCandidate}`);
  }

  if (!order && mainOrderData) {
    order = { ...mainOrderData };
    vendorOrderKey = `vendor_orders/${pureOrderId || cleanOrderId}_${vendorId}`;
  }

  // Fetch from RTDB 'reseller_orders' collection
  let resellerOrderData: any = null;
  if (mainOrderIdCandidate) {
    resellerOrderData = await rtdbGet<any>(`reseller_orders/${mainOrderIdCandidate}`);
  }
  if (!resellerOrderData && pureOrderId && pureOrderId !== mainOrderIdCandidate) {
    resellerOrderData = await rtdbGet<any>(`reseller_orders/${pureOrderId}`);
  }
  if (!resellerOrderData && cleanOrderId && cleanOrderId !== mainOrderIdCandidate && cleanOrderId !== pureOrderId) {
    resellerOrderData = await rtdbGet<any>(`reseller_orders/${cleanOrderId}`);
  }

  if (!order && resellerOrderData) {
    order = { ...resellerOrderData };
    vendorOrderKey = `vendor_orders/${pureOrderId || cleanOrderId}_${vendorId}`;
  }

  // Fallback search across RTDB if order is still null
  if (!order) {
    try {
      const allOrders = (await rtdbGet<any>('orders')) || {};
      const foundMKey = Object.keys(allOrders).find(k => {
        const item = allOrders[k];
        if (!item) return false;
        return k === cleanOrderId || k === pureOrderId || k === mainOrderIdCandidate ||
               item.orderId === cleanOrderId || item.orderId === pureOrderId || item.orderId === mainOrderIdCandidate;
      });
      if (foundMKey && allOrders[foundMKey]) {
        mainOrderData = { id: foundMKey, ...allOrders[foundMKey] };
        order = { ...mainOrderData };
        vendorOrderKey = `vendor_orders/${pureOrderId || cleanOrderId}_${vendorId}`;
      }
    } catch (_) {}
  }

  if (!order) {
    return { success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found in RTDB' };
  }

  // Derive resolved pure and main order IDs for consistent keys
  const resolvedMainOrderId = String(
    order?.mainOrderId || 
    order?.orderId || 
    mainOrderData?.mainOrderId || 
    mainOrderData?.orderId || 
    resellerOrderData?.mainOrderId || 
    resellerOrderData?.orderId || 
    existingOrderData?.mainOrderId || 
    existingOrderData?.orderId || 
    pureOrderId || 
    cleanOrderId
  ).trim().replace(/^#/, '');

  // Enrich order from all available sources
  order = {
    ...(mainOrderData || {}),
    ...(resellerOrderData || {}),
    ...(order || {}),
    ...(existingOrderData || {})
  };

  // 2. Reseller Order Verification (Using the same identification logic as Order Details page)
  const isReseller = Boolean(
    isResellerOrderRecord(order) ||
    isResellerOrderRecord(existingOrderData) ||
    isResellerOrderRecord(resellerOrderData) ||
    isResellerOrderRecord(mainOrderData) ||
    order?.isResellerOrder ||
    order?.resellerId ||
    order?.profitStatus ||
    order?.priceSnapshot ||
    order?.resellerPriceSnapshot ||
    order?.resellerOrderRecord ||
    existingOrderData?.isResellerOrder ||
    existingOrderData?.resellerId ||
    existingOrderData?.profitStatus ||
    existingOrderData?.priceSnapshot ||
    existingOrderData?.resellerPriceSnapshot ||
    existingOrderData?.resellerOrderRecord ||
    mainOrderData?.isResellerOrder ||
    mainOrderData?.resellerId ||
    mainOrderData?.profitStatus ||
    mainOrderData?.priceSnapshot ||
    mainOrderData?.resellerPriceSnapshot ||
    mainOrderData?.resellerOrderRecord ||
    resellerOrderData?.isResellerOrder ||
    resellerOrderData?.resellerId ||
    resellerOrderData?.profitStatus
  );
  if (!isReseller) {
    return { success: false, error: 'NOT_RESELLER_ORDER', message: 'This is not a reseller order' };
  }

  // Ensure normalized reseller flags
  order.isResellerOrder = true;
  if (!order.profitStatus || order.profitStatus === 'null') {
    order.profitStatus = existingOrderData?.profitStatus || resellerOrderData?.profitStatus || 'PENDING';
  }
  if (!order.resellerId) {
    order.resellerId = existingOrderData?.resellerId || resellerOrderData?.resellerId || mainOrderData?.resellerId || order.resellerUID || order.resellerUid || '';
  }

  // 3. Duplicate Confirmation & Lock Prevention
  const transactionType = 'RESELLER_PROFIT_LOCK';
  const lockTargetId = resolvedMainOrderId || pureOrderId || cleanOrderId;
  const lockKey = `${lockTargetId}_${transactionType}`;

  // Check 3A: Idempotency Check (orderId + transactionType)
  const idempCheck = (await checkFinancialIdempotency(lockTargetId, transactionType)) ||
                     (await checkFinancialIdempotency(cleanOrderId, transactionType));
  if (idempCheck?.isDuplicate) {
    return {
      success: false,
      error: 'DUPLICATE_LOCK_PREVENTED',
      message: idempCheck.message || 'এই অর্ডারের জন্য ইতিমধ্যে প্রফিট লক করা হয়েছে। দ্বিতীয়বার লক করা সম্ভব নয়।'
    };
  }

  // Check 3B: Order Status Flags & State Machine Validation
  const currentStatus = order.status || order.orderStatus || 'Pending';
  const stateCheck = validateOrderStateTransition(order.profitStatus || 'PENDING', 'LOCKED');
  if (!stateCheck.isValid) {
    return {
      success: false,
      error: 'INVALID_STATE_TRANSITION',
      message: stateCheck.error || 'এই অর্ডারের জন্য প্রফিট লক ট্রানজিশন অনুমোদিত নয়।'
    };
  }

  if (['Delivered', 'Cancelled', 'Returned'].includes(currentStatus)) {
    return {
      success: false,
      error: 'INVALID_ORDER_STATUS',
      message: `Order cannot be confirmed. Current status is ${currentStatus}`
    };
  }

  // Check 3C: Duplicate Lock Registry check in RTDB (orderId + transactionType)
  const existingLock = (await rtdbGet<any>(`reseller_profit_locks/${lockKey}`)) ||
                       (await rtdbGet<any>(`reseller_profit_locks/${cleanOrderId}_${transactionType}`));
  if (existingLock) {
    return {
      success: false,
      error: 'DUPLICATE_LOCK_PREVENTED',
      message: 'এই অর্ডারের জন্য ইতিমধ্যে প্রফিট লক করা হয়েছে। দ্বিতীয়বার লক করা সম্ভব নয়।'
    };
  }

  // 4. Stored Reseller Profit from RTDB (Source of Truth)
  const rawProfit = 
    order.resellerProfit ?? 
    order.priceSnapshot?.resellerProfit ?? 
    order.resellerPriceSnapshot?.resellerProfit ??
    order.priceSnapshot?.resellerProfitAmount ??
    order.resellerPriceSnapshot?.resellerProfitAmount ??
    order.lockedProfitAmount ??
    0;
  let requiredResellerProfit = Math.round(parseNumericAmount(rawProfit) * 100) / 100;
  
  if (requiredResellerProfit <= 0) {
    const profitVerification = verifyAndRecalculateResellerProfit(order);
    requiredResellerProfit = Math.round(parseNumericAmount(profitVerification.verifiedProfit) * 100) / 100;
  }

  // 5. Vendor Available Balance check in RTDB (Fresh Current Wallet Read)
  const freshWallet = (await rtdbGet<any>(`vendor_wallet/${vendorId}`)) || {};
  const currentAvail = Math.round(parseNumericAmount(
    freshWallet.availableBalance ?? 
    freshWallet.balance ?? 
    freshWallet.currentBalance ?? 
    0
  ) * 100) / 100;
  const currentLocked = Math.round(parseNumericAmount(
    freshWallet.lockedBalance ?? 
    freshWallet.resellerProfitReserve ?? 
    0
  ) * 100) / 100;
  const currentTotal = Math.round((currentAvail + currentLocked) * 100) / 100;

  // Strict Validation Rule:
  // if availableBalance >= requiredResellerProfit: confirmation allowed
  // else: confirmation blocked
  if (currentAvail < requiredResellerProfit) {
    const shortfall = Math.round((requiredResellerProfit - currentAvail) * 100) / 100;
    return {
      success: false,
      error: 'INSUFFICIENT_WALLET_BALANCE',
      message: `Reseller profit reserve করার জন্য Vendor-এর wallet balance যথেষ্ট নয়। (প্রয়োজন: ৳${requiredResellerProfit}, বর্তমান ঘাটতি: ৳${shortfall})। অনুগ্রহ করে Deposit করুন।`,
      requiredResellerProfit,
      availableBalance: currentAvail,
      shortfall
    };
  }

  const now = Date.now();
  // Unique transactionId for this lock operation
  const transactionId = `TXN_LOCK_${cleanOrderId}_${now}`;

  // 6. Atomic RTDB Transaction to lock funds from Available Balance to Locked Balance
  // "Vendor:
  // availableBalance → required resellerProfit পরিমাণ কমবে
  // lockedBalance → একই পরিমাণ বাড়বে
  // অর্থাৎ টাকা হারাবে না, শুধু:
  // Available Balance → Locked Balance হবে।
  // Vendor-এর totalBalance পরিবর্তন হবে না।
  // কারণ: totalBalance = availableBalance + lockedBalance"
  let finalAvailable = currentAvail;
  let finalLocked = currentLocked;
  let finalTotal = currentTotal;

  if (requiredResellerProfit > 0) {
    const txResult = await rtdbTransaction<any>(`vendor_wallet/${vendorId}`, (curr) => {
      // Safe fallback on initial local pass of runTransaction
      const data = curr || freshWallet;
      const avail = Math.round(parseNumericAmount(data?.availableBalance ?? data?.balance ?? data?.currentBalance ?? 0) * 100) / 100;
      const locked = Math.round(parseNumericAmount(data?.lockedBalance ?? data?.resellerProfitReserve ?? 0) * 100) / 100;

      // Strict atomic check inside transaction
      if (avail < requiredResellerProfit) {
        // Return undefined to abort transaction without committing
        return undefined;
      }

      const newAvailable = Math.round((avail - requiredResellerProfit) * 100) / 100;
      const newLocked = Math.round((locked + requiredResellerProfit) * 100) / 100;
      const total = Math.round((newAvailable + newLocked) * 100) / 100;

      finalAvailable = newAvailable;
      finalLocked = newLocked;
      finalTotal = total;

      return {
        ...(curr || freshWallet),
        vendorId,
        availableBalance: newAvailable,
        lockedBalance: newLocked,
        totalBalance: total,
        balance: newAvailable,
        currentBalance: newAvailable,
        resellerProfitReserve: newLocked,
        updatedAt: now
      };
    });

    if (!txResult.committed) {
      // If transaction failed or aborted, re-read fresh wallet from RTDB to check if insufficient or concurrency
      const recheck = (await rtdbGet<any>(`vendor_wallet/${vendorId}`)) || {};
      const recheckAvail = Math.round(parseNumericAmount(recheck.availableBalance ?? recheck.balance ?? 0) * 100) / 100;
      if (recheckAvail < requiredResellerProfit) {
        const shortfall = Math.round((requiredResellerProfit - recheckAvail) * 100) / 100;
        return {
          success: false,
          error: 'INSUFFICIENT_WALLET_BALANCE',
          message: `Reseller profit reserve করার জন্য Vendor-এর wallet balance যথেষ্ট নয়। (প্রয়োজন: ৳${requiredResellerProfit}, বর্তমান ঘাটতি: ৳${shortfall})। অনুগ্রহ করে Deposit করুন।`,
          requiredResellerProfit,
          availableBalance: recheckAvail,
          shortfall
        };
      }

      // Concurrency retry update
      const fallbackAvail = Math.round((recheckAvail - requiredResellerProfit) * 100) / 100;
      const fallbackLocked = Math.round((parseNumericAmount(recheck.lockedBalance ?? recheck.resellerProfitReserve ?? 0) + requiredResellerProfit) * 100) / 100;
      const fallbackTotal = Math.round((fallbackAvail + fallbackLocked) * 100) / 100;

      await rtdbUpdate(`vendor_wallet/${vendorId}`, {
        availableBalance: fallbackAvail,
        lockedBalance: fallbackLocked,
        totalBalance: fallbackTotal,
        balance: fallbackAvail,
        currentBalance: fallbackAvail,
        resellerProfitReserve: fallbackLocked,
        updatedAt: now
      });

      finalAvailable = fallbackAvail;
      finalLocked = fallbackLocked;
      finalTotal = fallbackTotal;
    }
  }

  // 7. Record the lock registry in RTDB to prevent any duplicate locks (orderId + transactionType)
  await rtdbSet(`reseller_profit_locks/${lockKey}`, {
    transactionId,
    transactionType,
    lockKey,
    orderId: cleanOrderId,
    mainOrderId: order.mainOrderId || order.orderId || cleanOrderId,
    vendorId,
    resellerId: order.resellerId || '',
    lockedProfitAmount: requiredResellerProfit,
    previousAvailableBalance: currentAvail,
    newAvailableBalance: finalAvailable,
    previousLockedBalance: currentLocked,
    newLockedBalance: finalLocked,
    totalBalance: finalTotal,
    status: 'LOCKED',
    createdAt: now
  });

  // 8. Record Vendor Wallet Transaction in RTDB
  if (requiredResellerProfit > 0) {
    try {
      await rtdbSet(`vendor_wallet_transactions/${vendorId}/${transactionId}`, {
        id: transactionId,
        transactionId,
        vendorId,
        type: 'RESELLER_PROFIT_LOCK',
        transactionType: 'RESELLER_PROFIT_LOCK',
        amount: requiredResellerProfit,
        title: 'রিসেলার প্রফিট রিজার্ভ লকড',
        description: `অর্ডার #${cleanOrderId}-এর জন্য রিসেলার প্রফিট সিকিউরিটি হিসেবে Available Balance থেকে Locked Balance-এ সংরক্ষিত হয়েছে।`,
        orderId: cleanOrderId,
        previousAvailable: currentAvail,
        newAvailable: finalAvailable,
        previousLocked: currentLocked,
        newLocked: finalLocked,
        totalBalance: finalTotal,
        createdAt: now
      });
    } catch (txnErr) {
      console.warn('Notice writing wallet transaction record:', txnErr);
    }
  }

  // 9. Update Order Status in RTDB:
  // vendorOrderStatus = "CONFIRMED"
  // profitStatus = "LOCKED"
  // settlementStatus = "LOCKED"
  // lockedProfitAmount = resellerProfit
  const orderUpdates: Record<string, any> = {
    status: 'Accepted',
    vendorStatus: 'Accepted',
    vendorOrderStatus: 'CONFIRMED',
    profitStatus: 'LOCKED',
    settlementStatus: 'LOCKED',
    lockedProfitAmount: requiredResellerProfit,
    resellerReserveEligible: true,
    acceptedAt: now,
    lockedAt: now,
    lockTransactionId: transactionId,
    lockTransactionType: transactionType,
    updatedAt: now
  };

  // Update vendor_orders
  await rtdbUpdate(vendorOrderKey, orderUpdates);
  if (vendorOrderKey !== `vendor_orders/${cleanOrderId}`) {
    try {
      await rtdbUpdate(`vendor_orders/${cleanOrderId}`, orderUpdates);
    } catch (_) {}
  }
  if (pureOrderId && vendorOrderKey !== `vendor_orders/${pureOrderId}_${vendorId}`) {
    try {
      await rtdbUpdate(`vendor_orders/${pureOrderId}_${vendorId}`, orderUpdates);
    } catch (_) {}
  }
  if (pureOrderId && vendorOrderKey !== `vendor_orders/${pureOrderId}`) {
    try {
      await rtdbUpdate(`vendor_orders/${pureOrderId}`, orderUpdates);
    } catch (_) {}
  }

  // Update main orders collection if present (where production rjworldbd.com orders live)
  const mainOrderId = resolvedMainOrderId || order.mainOrderId || order.orderId || cleanOrderId;
  if (mainOrderId) {
    try {
      await rtdbUpdate(`orders/${mainOrderId}`, orderUpdates);
    } catch (_) {}
  }
  if (cleanOrderId && cleanOrderId !== mainOrderId) {
    try {
      await rtdbUpdate(`orders/${cleanOrderId}`, orderUpdates);
    } catch (_) {}
  }
  if (pureOrderId && pureOrderId !== mainOrderId && pureOrderId !== cleanOrderId) {
    try {
      await rtdbUpdate(`orders/${pureOrderId}`, orderUpdates);
    } catch (_) {}
  }

  // Sync reseller_orders record in RTDB
  const roUpdates = {
    orderStatus: 'CONFIRMED',
    vendorOrderStatus: 'CONFIRMED',
    profitStatus: 'LOCKED',
    settlementStatus: 'LOCKED',
    lockedProfitAmount: requiredResellerProfit,
    lockTransactionId: transactionId,
    updatedAt: now
  };
  try {
    await rtdbUpdate(`reseller_orders/${cleanOrderId}`, roUpdates);
  } catch (_) {}
  if (mainOrderId && mainOrderId !== cleanOrderId) {
    try {
      await rtdbUpdate(`reseller_orders/${mainOrderId}`, roUpdates);
    } catch (_) {}
  }
  if (pureOrderId && pureOrderId !== cleanOrderId && pureOrderId !== mainOrderId) {
    try {
      await rtdbUpdate(`reseller_orders/${pureOrderId}`, roUpdates);
    } catch (_) {}
  }

  // 10. Record status log in RTDB
  try {
    await rtdbPush('order_status_logs', {
      orderId: cleanOrderId,
      mainOrderId: mainOrderId || cleanOrderId,
      vendorId,
      oldStatus: currentStatus,
      newStatus: 'Accepted',
      vendorOrderStatus: 'CONFIRMED',
      profitStatus: 'LOCKED',
      settlementStatus: 'LOCKED',
      lockedProfitAmount: requiredResellerProfit,
      transactionId,
      transactionType,
      note: `Order confirmed by vendor. Reseller profit ৳${requiredResellerProfit} locked from Available to Locked balance.`,
      timestamp: now
    });
  } catch (_) {}

  // 11. Record financial idempotency
  await recordFinancialIdempotency(lockTargetId, 'RESELLER_PROFIT_LOCK', {
    transactionId,
    vendorId,
    resellerId: order.resellerId || '',
    amount: requiredResellerProfit,
    executedBy: vendorId,
    details: `Order #${cleanOrderId} profit locked by vendor.`
  });
  if (cleanOrderId !== lockTargetId) {
    try {
      await recordFinancialIdempotency(cleanOrderId, 'RESELLER_PROFIT_LOCK', {
        transactionId,
        vendorId,
        resellerId: order.resellerId || '',
        amount: requiredResellerProfit,
        executedBy: vendorId,
        details: `Order #${cleanOrderId} profit locked by vendor.`
      });
    } catch (_) {}
  }

  // IMPORTANT:
  // Reseller-এর pendingProfit এই ধাপে অপরিবর্তিত থাকবে।
  // Reseller wallet-এ কোনো টাকা এই ধাপে transfer করা হয়নি।

  return {
    success: true,
    message: 'অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে এবং রিসেলার প্রফিট লক করা হয়েছে!',
    requiredResellerProfit,
    availableBalance: finalAvailable,
    lockedBalance: finalLocked,
    totalBalance: finalTotal,
    transactionId
  };
}

/**
 * Calculates the total Reseller Locked Profit for a Vendor from a list of orders.
 * Strictly follows the business rules:
 * - Only counts Reseller Orders where profitStatus is currently 'LOCKED'
 * - Ignores RELEASED profit
 * - Ignores CANCELLED profit
 * - Ignores RETURNED profit
 * - Ignores PENDING profit
 * - Deduplicates by order ID so an order present in multiple RTDB paths isn't counted twice
 */
export function calculateResellerLockedProfitFromOrders(orders: any[]): number {
  if (!orders || !Array.isArray(orders)) return 0;

  const seenOrderIds = new Set<string>();
  let totalLocked = 0;

  for (const order of orders) {
    if (!order) continue;
    const cleanId = String(order.orderId || order.id || '').replace(/^#/, '').trim();
    const baseId = cleanId.includes('_') ? cleanId.split('_')[0] : cleanId;
    if (!baseId) continue;

    // Deduplicate so an order is counted only once even if present across multiple nodes
    if (seenOrderIds.has(baseId)) continue;

    const profitStatus = String(order.profitStatus || '').toUpperCase().trim();

    // STRICT: Only count if currently LOCKED
    if (profitStatus === 'LOCKED') {
      seenOrderIds.add(baseId);
      const profit = parseNumericAmount(
        order.lockedProfitAmount ??
        order.resellerProfit ??
        order.priceSnapshot?.resellerProfit ??
        order.resellerPriceSnapshot?.resellerProfit ??
        0
      );
      totalLocked += profit;
    }
  }

  return Math.round(totalLocked * 100) / 100;
}

/**
 * Fetches and calculates the current Reseller Locked Profit directly from RTDB for a given vendor.
 */
export async function getVendorResellerLockedProfit(vendorId: string): Promise<number> {
  if (!vendorId) return 0;
  try {
    const [vOrders, mOrders, rOrders] = await Promise.all([
      rtdbList<any>('vendor_orders', (o) => o?.vendorId === vendorId || o?.userId === vendorId),
      rtdbList<any>('orders', (o) => o?.vendorId === vendorId || o?.userId === vendorId),
      rtdbList<any>('reseller_orders', (o) => o?.vendorId === vendorId || o?.userId === vendorId)
    ]);

    const combined = [
      ...vOrders.map(item => ({ id: item.id, ...item.data })),
      ...mOrders.map(item => ({ id: item.id, ...item.data })),
      ...rOrders.map(item => ({ id: item.id, ...item.data }))
    ];

    return calculateResellerLockedProfitFromOrders(combined);
  } catch (err) {
    console.error('Error fetching vendor reseller locked profit:', err);
    return 0;
  }
}

/**
 * Returns all possible vendor identifier aliases for the current authenticated user/store.
 * Ensures consistent vendor identification across counters, list, view, and confirmation flows.
 */
export function getAuthenticatedVendorIds(user: any, userData?: any, vendorInfo?: any): Set<string> {
  const ids = new Set<string>();
  if (user?.uid) ids.add(String(user.uid).trim());
  if (user?.id) ids.add(String(user.id).trim());
  if (userData?.uid) ids.add(String(userData.uid).trim());
  if (userData?.id) ids.add(String(userData.id).trim());
  if (userData?.vendorId) ids.add(String(userData.vendorId).trim());
  if (userData?.storeId) ids.add(String(userData.storeId).trim());
  if (userData?.shopId) ids.add(String(userData.shopId).trim());
  if (userData?.sellerId) ids.add(String(userData.sellerId).trim());
  if (vendorInfo?.vendorId) ids.add(String(vendorInfo.vendorId).trim());
  if (vendorInfo?.storeId) ids.add(String(vendorInfo.storeId).trim());
  if (vendorInfo?.shopId) ids.add(String(vendorInfo.shopId).trim());
  if (vendorInfo?.sellerId) ids.add(String(vendorInfo.sellerId).trim());
  if (vendorInfo?.userId) ids.add(String(vendorInfo.userId).trim());
  if (vendorInfo?.id) ids.add(String(vendorInfo.id).trim());

  // Also read synchronous localStorage caches if available in browser
  // This guarantees valid vendor identity resolution even during initial mount/refresh before async state settles
  if (typeof window !== 'undefined' && user?.uid) {
    try {
      const keys = ['rj_active_vendor_', 'rj_vendor_store_', 'rj_vendor_profile_'];
      for (const k of keys) {
        const raw = localStorage.getItem(k + user.uid);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (parsed.vendorId) ids.add(String(parsed.vendorId).trim());
            if (parsed.storeId) ids.add(String(parsed.storeId).trim());
            if (parsed.shopId) ids.add(String(parsed.shopId).trim());
            if (parsed.id) ids.add(String(parsed.id).trim());
            if (parsed.userId) ids.add(String(parsed.userId).trim());
          }
        }
      }
    } catch (_) {}
  }
  return ids;
}

/**
 * Checks whether the current user is an Admin, considering email whitelist and role.
 */
export function checkIsAdminUser(user: any, userData?: any): boolean {
  if (!user && !userData) return false;
  const adminEmails = ['riyajulhasanfahim@gmail.com', 'frofficialbd1@gmail.com', 'mdfahim776154@gmail.com'];
  const userEmail = (user?.email || userData?.email || '').toLowerCase().trim();
  if (userEmail && adminEmails.includes(userEmail)) return true;
  const role = (userData?.role || (user as any)?.role || '').toLowerCase().trim();
  return role === 'admin';
}

/**
 * Checks whether an order record belongs to the authenticated vendor using consistent ID matching.
 * Validates direct vendor fields, items, snapshot, and document key aliases.
 */
export function isOrderOwnedByVendor(
  order: any, 
  vendorIds: Set<string> | string[], 
  isAdmin = false,
  docKey?: string
): boolean {
  if (!order) return false;
  if (isAdmin) return true;

  const ids = vendorIds instanceof Set ? vendorIds : new Set(vendorIds);
  if (ids.size === 0) return false;

  // 1. Direct vendorId / vendorUID / vendorUid / sellerId / sellerUID / storeId / storeUID / userId / customerId
  const directFields = [
    order.vendorId,
    typeof order.vendorId === 'object' ? order.vendorId?.id || order.vendorId?.uid || order.vendorId?.vendorId : null,
    order.vendorUID,
    order.vendorUid,
    order.sellerId,
    order.sellerUID,
    order.sellerUid,
    typeof order.seller === 'object' ? order.seller?.id || order.seller?.uid || order.seller?.vendorId : null,
    order.storeId,
    order.storeUID,
    order.storeUid,
    typeof order.store === 'object' ? order.store?.id || order.store?.storeId : null,
    typeof order.vendor === 'object' ? order.vendor?.id || order.vendor?.uid : null,
    order.userId, // Matches vendor/creator user ID as in VendorDashboard & VendorNotifications
    order.creatorId,
    order.creatorUID
  ];
  for (const f of directFields) {
    if (f && ids.has(String(f).trim())) return true;
  }

  // 2. Document key match (e.g. orderId_vendorId or vendorId prefix or cleanId)
  if (docKey) {
    for (const vId of ids) {
      if (docKey.endsWith(`_${vId}`) || docKey.includes(vId)) return true;
    }
  }

  // 3. vendorIds array or map
  if (order.vendorIds) {
    const list = Array.isArray(order.vendorIds) 
      ? order.vendorIds 
      : (typeof order.vendorIds === 'object' ? Object.values(order.vendorIds) : []);
    for (const v of list) {
      if (v && ids.has(String(v).trim())) return true;
    }
  }

  // 4. Line items
  const rawItems = Array.isArray(order.items) 
    ? order.items 
    : (order.items && typeof order.items === 'object' ? Object.values(order.items) : []);
  for (const it of rawItems) {
    if (!it || typeof it !== 'object') continue;
    if (
      (it.vendorId && ids.has(String(it.vendorId).trim())) ||
      (it.vendorUID && ids.has(String(it.vendorUID).trim())) ||
      (it.vendorUid && ids.has(String(it.vendorUid).trim())) ||
      (it.sellerId && ids.has(String(it.sellerId).trim())) ||
      (it.sellerUID && ids.has(String(it.sellerUID).trim())) ||
      (it.storeId && ids.has(String(it.storeId).trim())) ||
      (it.storeUID && ids.has(String(it.storeUID).trim())) ||
      (typeof it.vendor === 'object' && ((it.vendor?.id && ids.has(String(it.vendor.id).trim())) || (it.vendor?.uid && ids.has(String(it.vendor.uid).trim())) || (it.vendor?.vendorId && ids.has(String(it.vendor.vendorId).trim())))) ||
      (typeof it.seller === 'object' && ((it.seller?.id && ids.has(String(it.seller.id).trim())) || (it.seller?.uid && ids.has(String(it.seller.uid).trim()))))
    ) {
      return true;
    }
  }

  // 5. Price snapshots & metadata
  if (order.priceSnapshot?.vendorId && ids.has(String(order.priceSnapshot.vendorId).trim())) return true;
  if (order.resellerPriceSnapshot?.vendorId && ids.has(String(order.resellerPriceSnapshot.vendorId).trim())) return true;
  if (order.resellerOrderRecord?.vendorId && ids.has(String(order.resellerOrderRecord.vendorId).trim())) return true;
  if (order.priceSnapshot?.vendorUID && ids.has(String(order.priceSnapshot.vendorUID).trim())) return true;
  if (order.resellerPriceSnapshot?.vendorUID && ids.has(String(order.resellerPriceSnapshot.vendorUID).trim())) return true;

  // 6. Shipping Snapshot vendor packages
  if (order.shippingSnapshot?.vendorPackages && Array.isArray(order.shippingSnapshot.vendorPackages)) {
    for (const pkg of order.shippingSnapshot.vendorPackages) {
      if (pkg?.vendorId && ids.has(String(pkg.vendorId).trim())) return true;
    }
  }

  return false;
}

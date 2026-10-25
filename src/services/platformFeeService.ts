import { rtdbGet, rtdbSet, rtdbUpdate, rtdbList, rtdbRemove, rtdbPush } from '../lib/rtdb';
import { RTDB_BASE_URL as BASE_URL } from '../lib/firebase';
import { normalizeMethod, verifyPaymentAutomatic, VerificationResult } from './automaticPaymentVerificationService';
import { safeStorage } from '../utils/storage';

export interface PlatformFeeRecord {
  id: string; // `${vendorId}_${orderId}`
  vendorId: string;
  orderId: string;
  mainOrderId?: string;
  customerName?: string;
  customerPhone?: string;
  feeAmount: number; // e.g. 5
  paymentMethod: string; // 'cod'
  orderStatus: string; // 'Delivered' | 'Completed'
  status: 'due' | 'paid';
  deliveredAt: number;
  paidAt?: number;
  paymentTrxId?: string;
  paymentMethodUsed?: string; // 'bkash' | 'nagad' | 'rocket' | 'upay'
  createdAt: number;
}

export interface VendorPlatformFeeSummary {
  vendorId: string;
  vendorName: string;
  storeName: string;
  mobileNumber: string;
  address: string;
  email?: string;
  totalDeliveredCodOrders: number;
  totalPlatformFee: number;
  paidPlatformFee: number;
  duePlatformFee: number;
  lastUpdated: number;
}

export interface PlatformFeePaymentRecord {
  id: string;
  vendorId: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  status: 'verified' | 'rejected' | 'pending';
  coveredRecordIds: string[];
  senderNumber?: string;
  verifiedAt: number;
  createdAt: number;
}

/**
 * Robust address formatter ensuring objects or strings are always returned as safe human-readable strings
 */
export function formatAddress(addr: any): string {
  if (!addr) return 'N/A';
  if (typeof addr === 'string') return addr.trim() || 'N/A';
  if (typeof addr === 'object') {
    const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (addr.district) {
      return [addr.district, addr.upazila].filter(Boolean).join(', ');
    }
  }
  return 'N/A';
}

/**
 * Ensures safe string values, never returning raw objects that can crash React renders
 */
export function formatSafeString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return formatAddress(val);
  return String(val);
}

/**
 * Extracts all vendor IDs associated with an order across various schema formats
 */
export function extractVendorIdsFromOrder(order: any): string[] {
  if (!order) return [];
  const ids = new Set<string>();

  if (order.vendorId && typeof order.vendorId === 'string' && order.vendorId !== 'admin' && order.vendorId !== 'system') {
    ids.add(order.vendorId);
  }
  if (order.sellerId && typeof order.sellerId === 'string' && order.sellerId !== 'admin' && order.sellerId !== 'system') {
    ids.add(order.sellerId);
  }
  if (Array.isArray(order.vendorIds)) {
    order.vendorIds.forEach((v: any) => {
      if (v && typeof v === 'string' && v !== 'admin' && v !== 'system') ids.add(v);
    });
  }
  if (Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      const vId = item.vendorId || item.storeId || item.vendor?.id;
      if (vId && typeof vId === 'string' && vId !== 'admin' && vId !== 'system') ids.add(vId);
    });
  }
  if (Array.isArray(order.shippingSnapshot?.vendorPackages)) {
    order.shippingSnapshot.vendorPackages.forEach((pkg: any) => {
      if (pkg.vendorId && typeof pkg.vendorId === 'string' && pkg.vendorId !== 'admin' && pkg.vendorId !== 'system') {
        ids.add(pkg.vendorId);
      }
    });
  }

  return Array.from(ids);
}

/**
 * Checks if an order payment method is Cash on Delivery (COD)
 * Handles all formats: 'Cash on Delivery (COD)', 'cash on delivery', 'cod', 'cash', etc.
 */
export function isCodPayment(paymentMethod?: string, codAmount?: number | string): boolean {
  if (codAmount !== undefined && Number(codAmount) > 0) return true;
  if (!paymentMethod) return false;
  const pm = String(paymentMethod).toLowerCase().trim();
  
  // Explicit online full payment methods without COD
  if (
    pm === 'product_full_payment' ||
    pm === 'full_payment' ||
    pm === 'full' ||
    pm === 'stripe' ||
    pm === 'sslcommerz'
  ) {
    return false;
  }

  // Pure online payment methods ONLY if not COD
  if (
    (pm === 'bkash' || pm === 'nagad' || pm === 'rocket' || pm === 'upay' || pm === 'wallet' || pm === 'online' || pm === 'card') &&
    (codAmount === undefined || Number(codAmount) <= 0)
  ) {
    return false;
  }

  // Check if string indicates Cash on Delivery or COD
  if (
    pm === 'cod' ||
    pm.includes('cod') ||
    pm.includes('cash on delivery') ||
    pm.includes('cash_on_delivery') ||
    pm.includes('cash') ||
    pm.includes('delivery charge advance') ||
    pm.includes('only_delivery_charge') ||
    pm.includes('only delivery charge') ||
    pm.includes('hand cash')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if order status qualifies as successfully delivered/completed
 */
export function isDeliveredStatus(status?: string): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'delivered' || 
    s === 'completed' || 
    s === 'delivery completed' || 
    s === 'order delivered' ||
    s.includes('deliver') || 
    s.includes('complet')
  );
}

/**
 * Checks if an order status is cancelled/returned/failed
 */
export function isCancelledOrReturnedStatus(status?: string): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'cancelled' || 
    s === 'canceled' || 
    s === 'returned' || 
    s === 'failed' || 
    s === 'rejected' || 
    s.includes('cancel') || 
    s.includes('return') || 
    s.includes('fail')
  );
}

/**
 * Records Platform Fee when a Cash on Delivery (COD) order is Delivered/Completed.
 * IDEMPOTENT: Uses `processed_platform_fee_orders/{vendorId}_{orderId}` duplicate protection.
 */
export async function recordPlatformFeeOnDelivery(
  orderId: string,
  orderData?: any,
  explicitVendorId?: string
): Promise<{ success: boolean; feeRecorded?: number; reason?: string }> {
  try {
    const rawOrderId = orderId.trim();
    if (!rawOrderId) return { success: false, reason: 'Invalid order ID' };

    // Fetch orderData if not provided
    let finalOrder = orderData;
    if (!finalOrder) {
      finalOrder = (await rtdbGet<any>(`vendor_orders/${rawOrderId}`)) || (await rtdbGet<any>(`orders/${rawOrderId}`));
    }

    if (!finalOrder) {
      return { success: false, reason: 'Order not found in database' };
    }

    // 1. Must be Cash on Delivery (COD)
    const paymentMethod = finalOrder.paymentMethod || finalOrder.payment_method;
    const codAmt = Number(finalOrder.codAmount ?? 0);
    if (!isCodPayment(paymentMethod, codAmt)) {
      return { success: false, reason: 'Not a COD order (Online/Wallet payment orders have no COD platform fee).' };
    }

    // 2. Must be Delivered or Completed
    const status = finalOrder.status || finalOrder.orderStatus;
    if (!isDeliveredStatus(status)) {
      return { success: false, reason: `Order status is "${status}", not Delivered or Completed.` };
    }

    // 3. Resolve Vendor ID
    let targetVendorId = explicitVendorId || finalOrder.vendorId || finalOrder.sellerId;
    if (!targetVendorId || targetVendorId === 'admin' || targetVendorId === 'system') {
      const detectedIds = extractVendorIdsFromOrder(finalOrder);
      if (detectedIds.length > 0) {
        targetVendorId = detectedIds[0];
      }
    }
    if (!targetVendorId || targetVendorId === 'admin' || targetVendorId === 'system') {
      return { success: false, reason: 'No vendor ID associated with this order' };
    }

    let cleanOrderId = String(finalOrder.mainOrderId || finalOrder.orderId || rawOrderId || '').trim().replace(/^#/, '');
    if (targetVendorId && cleanOrderId.endsWith(`_${targetVendorId}`)) {
      cleanOrderId = cleanOrderId.slice(0, -(targetVendorId.length + 1));
    }
    if (cleanOrderId.includes('_')) {
      const parts = cleanOrderId.split('_');
      if (parts[0]) cleanOrderId = parts[0];
    }
    const recordId = `${targetVendorId}_${cleanOrderId}`;

    // 4. DUPLICATE PROTECTION / IDEMPOTENCY CHECK
    const alreadyProcessed = await rtdbGet<any>(`processed_platform_fee_orders/${recordId}`);
    if (alreadyProcessed) {
      await updateVendorPlatformFeeSummary(targetVendorId).catch(() => {});
      return { success: false, feeRecorded: 0, reason: 'Platform fee already recorded for this order (Idempotency protected).' };
    }

    // Check existing record
    const existingRecord = await rtdbGet<PlatformFeeRecord>(`platform_fee_records/${recordId}`);
    if (existingRecord) {
      await updateVendorPlatformFeeSummary(targetVendorId).catch(() => {});
      return { success: false, feeRecorded: 0, reason: 'Platform fee record already exists.' };
    }

    // Fixed fee amount (defaults to 5)
    const feeAmount = Number(finalOrder.platformFee || 5);
    const now = Date.now();

    // 5. Create new fee record
    const customerName = formatSafeString(finalOrder.customerName || finalOrder.shippingAddress?.name, 'Customer');
    const customerPhone = formatSafeString(finalOrder.customerPhone || finalOrder.shippingAddress?.mobile, '');

    const newRecord: PlatformFeeRecord = {
      id: recordId,
      vendorId: targetVendorId,
      orderId: cleanOrderId,
      mainOrderId: finalOrder.mainOrderId || cleanOrderId,
      customerName,
      customerPhone,
      feeAmount,
      paymentMethod: 'cod',
      orderStatus: status,
      status: 'due',
      deliveredAt: finalOrder.deliveredAt || now,
      createdAt: now
    };

    // 6. Save fee record & idempotency marker
    await Promise.all([
      rtdbSet(`platform_fee_records/${recordId}`, newRecord),
      rtdbSet(`processed_platform_fee_orders/${recordId}`, {
        processedAt: now,
        feeAmount,
        vendorId: targetVendorId,
        orderId: cleanOrderId
      })
    ]);

    // 7. Update or Initialize Vendor Platform Fee Summary
    await updateVendorPlatformFeeSummary(targetVendorId);

    return { success: true, feeRecorded: feeAmount };
  } catch (error: any) {
    console.error('Error recording platform fee on delivery:', error);
    return { success: false, reason: error?.message || 'Failed to record platform fee' };
  }
}

/**
 * Unconditionally and idempotently updates a Cash on Delivery (COD) order to 'Delivered'
 * across RTDB (orders and vendor_orders), Firestore, LocalStorage, pushes status log,
 * and records the Vendor Platform Fee without duplicate charges.
 */
export async function markCodOrderDelivered(
  rawOrderId: string,
  providedOrder?: any,
  explicitVendorId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanId = String(rawOrderId || '').trim().replace(/^#/, '');
    if (!cleanId) return { success: false, error: 'Invalid Order ID' };

    console.log(`[markCodOrderDelivered] Marking COD order ${cleanId} as Delivered`);

    // 1. Fetch current order data if not provided or incomplete
    let order = providedOrder;
    if (!order || !order.status || !order.paymentMethod) {
      order = (await rtdbGet<any>(`orders/${cleanId}`)) ||
              (await rtdbGet<any>(`vendor_orders/${cleanId}`)) ||
              providedOrder ||
              {};
    }

    const now = Date.now();
    const deliveredAtTime = order.deliveredAt || now;

    // 2. Prepare comprehensive update payload ensuring all views see 'Delivered'
    const deliveredUpdate: any = {
      status: 'Delivered',
      orderStatus: 'Delivered',
      vendorStatus: 'Delivered',
      deliveredAt: deliveredAtTime,
      paymentStatus: 'Paid',
      vendorPayoutStatus: 'None', // COD Wallet Rule: COD amount NEVER goes to vendor wallet
      platformFeeStatus: 'due',
      platformFeeRecorded: true,
      platformFee: Number(order.platformFee || 5),
      reviewCompleted: true,
      reviewSubmitted: true,
      reviewStatus: 'completed',
      reviewedAt: order.reviewedAt || now,
      updatedAt: now
    };

    // 3. Collect all vendor IDs associated with this order
    const vendorIds = new Set<string>();
    if (explicitVendorId && explicitVendorId !== 'admin' && explicitVendorId !== 'system') {
      vendorIds.add(explicitVendorId);
    }
    const extracted = extractVendorIdsFromOrder(order);
    extracted.forEach(id => vendorIds.add(id));

    // Also check vendor_orders in RTDB for any key starting with cleanId
    try {
      const vOrders = await rtdbList<any>('vendor_orders');
      for (const vo of vOrders) {
        if (vo.id === cleanId || vo.id.startsWith(`${cleanId}_`) || vo.data?.orderId === cleanId || vo.data?.mainOrderId === cleanId) {
          const vId = vo.data?.vendorId;
          if (vId && vId !== 'admin' && vId !== 'system') {
            vendorIds.add(vId);
          }
        }
      }
    } catch (_) {}

    // 4. Update RTDB: orders node
    const rtdbPromises: Promise<any>[] = [
      rtdbUpdate(`orders/${cleanId}`, deliveredUpdate),
      rtdbUpdate(`vendor_orders/${cleanId}`, deliveredUpdate).catch(() => null)
    ];

    if (rawOrderId !== cleanId) {
      rtdbPromises.push(rtdbUpdate(`orders/${rawOrderId}`, deliveredUpdate).catch(() => null));
      rtdbPromises.push(rtdbUpdate(`vendor_orders/${rawOrderId}`, deliveredUpdate).catch(() => null));
    }

    // Update each vendor-specific vendor_orders entry (e.g., ORD-xxx_VendorID)
    for (const vId of vendorIds) {
      rtdbPromises.push(rtdbUpdate(`vendor_orders/${cleanId}_${vId}`, deliveredUpdate).catch(() => null));
      if (rawOrderId !== cleanId) {
        rtdbPromises.push(rtdbUpdate(`vendor_orders/${rawOrderId}_${vId}`, deliveredUpdate).catch(() => null));
      }
    }

    // Push order status log
    rtdbPromises.push(
      rtdbPush('order_status_logs', {
        orderId: cleanId,
        mainOrderId: cleanId,
        oldStatus: order.status || 'Shipped',
        newStatus: 'Delivered',
        note: 'কাস্টমার পণ্য প্রাপ্তি নিশ্চিত করে রিভিউ সম্পন্ন করায় COD অর্ডারের স্ট্যাটাস স্বয়ংক্রিয়ভাবে Delivered হয়েছে।',
        timestamp: now
      }).catch(() => null)
    );

    await Promise.allSettled(rtdbPromises);

    // 5. Update LocalStorage cache for immediate instant UI reflection
    try {
      const pendingKey = `pending_order_${cleanId}`;
      const cached = safeStorage.getItem(pendingKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        safeStorage.setItem(pendingKey, JSON.stringify({ ...parsed, ...deliveredUpdate }));
      }
      const recentRaw = safeStorage.getItem('user_recent_orders');
      if (recentRaw) {
        const list: any[] = JSON.parse(recentRaw);
        const updated = list.map((o: any) => {
          if ((o.orderId || o.id) === cleanId || (rawOrderId && (o.orderId || o.id) === rawOrderId)) {
            return { ...o, ...deliveredUpdate };
          }
          return o;
        });
        safeStorage.setItem('user_recent_orders', JSON.stringify(updated));
      }
    } catch (stErr) {
      console.warn('[markCodOrderDelivered] Storage sync warning:', stErr);
    }

    // 7. Record Vendor Platform Fee for all vendors on this COD order
    const feeOrderData = {
      ...order,
      ...deliveredUpdate,
      paymentMethod: 'cod',
      status: 'Delivered'
    };

    if (vendorIds.size === 0) {
      const vId = explicitVendorId || order.vendorId || order.sellerId;
      if (vId) {
        await recordPlatformFeeOnDelivery(cleanId, feeOrderData, vId);
      }
    } else {
      for (const vId of vendorIds) {
        await recordPlatformFeeOnDelivery(cleanId, { ...feeOrderData, vendorId: vId }, vId);
      }
    }

    console.log(`[markCodOrderDelivered] Successfully marked COD order ${cleanId} as Delivered`);
    return { success: true };
  } catch (err: any) {
    console.error('[markCodOrderDelivered] Error:', err);
    return { success: false, error: err?.message || 'Failed to mark COD order delivered' };
  }
}

/**
 * Reverses a due platform fee if an order was mistakenly marked Delivered and then cancelled/returned.
 */
export async function reversePlatformFeeOnOrderCancellation(
  orderId: string,
  vendorId?: string
): Promise<{ success: boolean; reversed?: boolean }> {
  try {
    const cleanOrderId = orderId.trim();
    if (!cleanOrderId) return { success: false };

    // Find record
    const allRecords = await rtdbList<PlatformFeeRecord>('platform_fee_records').catch(() => []);
    const matching = allRecords.find(r => 
      (r.data?.orderId === cleanOrderId || r.data?.mainOrderId === cleanOrderId) &&
      (!vendorId || r.data?.vendorId === vendorId)
    );

    if (!matching || !matching.data) return { success: false };

    const record = matching.data;
    // Only reverse if it is still 'due'
    if (record.status === 'due') {
      await Promise.allSettled([
        rtdbRemove(`platform_fee_records/${record.id}`),
        rtdbRemove(`processed_platform_fee_orders/${record.id}`)
      ]);
      await updateVendorPlatformFeeSummary(record.vendorId);
      return { success: true, reversed: true };
    }

    return { success: false };
  } catch (e) {
    console.error('Error reversing platform fee:', e);
    return { success: false };
  }
}

/**
 * Re-computes and saves the accurate summary for a single vendor
 */
export async function updateVendorPlatformFeeSummary(vendorId: string): Promise<VendorPlatformFeeSummary> {
  // 1. Get vendor details
  const [vendorData, userData, storeData] = await Promise.all([
    rtdbGet<any>(`vendors/${vendorId}`).catch(() => null),
    rtdbGet<any>(`users/${vendorId}`).catch(() => null),
    rtdbGet<any>(`stores/${vendorId}`).catch(() => null)
  ]);

  const rawAddress = vendorData?.address || (vendorData?.district ? `${vendorData.district}${vendorData.upazila ? ', ' + vendorData.upazila : ''}` : (userData?.address || 'N/A'));
  const address = formatAddress(rawAddress);
  const vendorName = formatSafeString(vendorData?.ownerName || vendorData?.name || userData?.name, 'Vendor');
  const storeName = formatSafeString(vendorData?.storeName || vendorData?.shopName || storeData?.storeName, 'Shop');
  const mobileNumber = formatSafeString(vendorData?.mobileNumber || vendorData?.phone || userData?.phone, '');
  const email = formatSafeString(vendorData?.email || userData?.email, '');

  // 2. Fetch all fee records for this vendor
  const allRecords = await rtdbList<PlatformFeeRecord>('platform_fee_records').catch(() => []);
  const vendorRecords = allRecords.map(r => r.data).filter(r => r && r.vendorId === vendorId);

  let totalDeliveredCodOrders = 0;
  let totalPlatformFee = 0;
  let paidPlatformFee = 0;

  for (const rec of vendorRecords) {
    totalDeliveredCodOrders += 1;
    totalPlatformFee += Number(rec.feeAmount || 5);
    if (rec.status === 'paid') {
      paidPlatformFee += Number(rec.feeAmount || 5);
    }
  }

  const duePlatformFee = Math.max(0, totalPlatformFee - paidPlatformFee);

  const summary: VendorPlatformFeeSummary = {
    vendorId,
    vendorName,
    storeName,
    mobileNumber,
    address,
    email,
    totalDeliveredCodOrders,
    totalPlatformFee,
    paidPlatformFee,
    duePlatformFee,
    lastUpdated: Date.now()
  };

  await rtdbSet(`vendor_platform_fees/${vendorId}`, summary);
  return summary;
}

/**
 * Scans delivered COD orders for a specific vendor, backfills any missing fee records,
 * and recalculates the summary. Ensures self-healing accuracy whenever vendor accesses their fee page.
 */
export async function syncPlatformFeesForVendor(vendorId: string): Promise<VendorPlatformFeeSummary> {
  try {
    if (!vendorId) {
      throw new Error('Invalid vendor ID');
    }

    // 1. Fetch vendor_orders and general orders
    const [allVendorOrders, allMainOrders] = await Promise.all([
      rtdbList<any>('vendor_orders').catch(() => []),
      rtdbList<any>('orders').catch(() => [])
    ]);

    // 2. Identify delivered COD orders for this vendor
    const eligibleOrders = new Map<string, any>(); // cleanOrderId -> orderData

    for (const { id, data } of allVendorOrders) {
      if (!data) continue;
      const vIds = extractVendorIdsFromOrder(data);
      const isMyOrder = data.vendorId === vendorId || 
                        data.sellerId === vendorId || 
                        id.endsWith(`_${vendorId}`) || 
                        vIds.includes(vendorId);

      if (!isMyOrder) continue;

      const pm = data.paymentMethod || data.payment_method;
      const codAmt = Number(data.codAmount ?? 0);
      const st = data.status || data.orderStatus || data.vendorStatus;

      if (isCodPayment(pm, codAmt) && isDeliveredStatus(st)) {
        let cleanId = String(data.mainOrderId || data.orderId || id || '').trim().replace(/^#/, '');
        if (cleanId.endsWith(`_${vendorId}`)) {
          cleanId = cleanId.slice(0, -(vendorId.length + 1));
        }
        if (cleanId.includes('_')) {
          const parts = cleanId.split('_');
          if (parts[0]) cleanId = parts[0];
        }
        if (cleanId && !eligibleOrders.has(cleanId)) {
          eligibleOrders.set(cleanId, data);
        }
      }
    }

    for (const { id, data } of allMainOrders) {
      if (!data) continue;
      const vIds = extractVendorIdsFromOrder(data);
      const isMyOrder = data.vendorId === vendorId || 
                        data.sellerId === vendorId || 
                        vIds.includes(vendorId);

      if (!isMyOrder) continue;

      const pm = data.paymentMethod || data.payment_method;
      const codAmt = Number(data.codAmount ?? 0);
      const st = data.status || data.orderStatus;

      if (isCodPayment(pm, codAmt) && isDeliveredStatus(st)) {
        let cleanId = String(data.orderId || data.mainOrderId || id || '').trim().replace(/^#/, '');
        if (cleanId.endsWith(`_${vendorId}`)) {
          cleanId = cleanId.slice(0, -(vendorId.length + 1));
        }
        if (cleanId.includes('_')) {
          const parts = cleanId.split('_');
          if (parts[0]) cleanId = parts[0];
        }
        if (cleanId && !eligibleOrders.has(cleanId)) {
          eligibleOrders.set(cleanId, data);
        }
      }
    }

    // 3. For each eligible order, ensure platform fee record exists
    const now = Date.now();
    for (const [cleanOrderId, order] of eligibleOrders.entries()) {
      const recordId = `${vendorId}_${cleanOrderId}`;
      const existing = await rtdbGet<PlatformFeeRecord>(`platform_fee_records/${recordId}`);
      if (!existing) {
        const feeAmount = Number(order.platformFee || 5);
        const customerName = formatSafeString(order.customerName || order.shippingAddress?.name, 'Customer');
        const customerPhone = formatSafeString(order.customerPhone || order.shippingAddress?.mobile || order.shippingAddress?.phone, '');

        const newRecord: PlatformFeeRecord = {
          id: recordId,
          vendorId,
          orderId: cleanOrderId,
          mainOrderId: order.mainOrderId || cleanOrderId,
          customerName,
          customerPhone,
          feeAmount,
          paymentMethod: 'cod',
          orderStatus: order.status || 'Delivered',
          status: 'due',
          deliveredAt: order.deliveredAt || now,
          createdAt: order.createdAt || now
        };

        await Promise.allSettled([
          rtdbSet(`platform_fee_records/${recordId}`, newRecord),
          rtdbSet(`processed_platform_fee_orders/${recordId}`, {
            processedAt: now,
            feeAmount,
            vendorId,
            orderId: cleanOrderId
          })
        ]);
      }
    }

    // 4. Update and return summary
    return await updateVendorPlatformFeeSummary(vendorId);
  } catch (err) {
    console.error('Error syncing platform fees for vendor:', err);
    return await updateVendorPlatformFeeSummary(vendorId);
  }
}

/**
 * Gets the current platform fee summary for a vendor with automatic synchronization
 */
export async function getVendorPlatformFee(vendorId: string): Promise<VendorPlatformFeeSummary | null> {
  try {
    if (!vendorId) return null;
    return await syncPlatformFeesForVendor(vendorId);
  } catch (e) {
    console.error('Error fetching vendor platform fee summary:', e);
    return null;
  }
}

/**
 * Gets all fee records for a specific vendor
 */
export async function getVendorPlatformFeeRecords(vendorId: string): Promise<PlatformFeeRecord[]> {
  try {
    const all = await rtdbList<PlatformFeeRecord>('platform_fee_records').catch(() => []);
    return all
      .map(r => r.data)
      .filter(r => r && r.vendorId === vendorId)
      .map(r => ({
        ...r,
        customerName: formatSafeString(r.customerName, 'Customer'),
        customerPhone: formatSafeString(r.customerPhone, ''),
        paymentMethod: formatSafeString(r.paymentMethod, 'cod'),
        paymentTrxId: formatSafeString(r.paymentTrxId, ''),
        paymentMethodUsed: formatSafeString(r.paymentMethodUsed, '')
      }))
      .sort((a, b) => (b.deliveredAt || b.createdAt || 0) - (a.deliveredAt || a.createdAt || 0));
  } catch (e) {
    console.error('Error getting vendor fee records:', e);
    return [];
  }
}

/**
 * Gets all vendors' platform fee summaries for Admin Dashboard
 */
export async function getAllVendorsPlatformFees(): Promise<VendorPlatformFeeSummary[]> {
  try {
    // 1. Fetch from summary node
    const list = await rtdbList<VendorPlatformFeeSummary>('vendor_platform_fees').catch(() => []);
    const summaries: VendorPlatformFeeSummary[] = [];

    for (const item of list) {
      if (!item || !item.data) continue;
      const vId = item.id || item.data?.vendorId;
      if (!vId) continue;
      summaries.push({
        vendorId: vId,
        vendorName: formatSafeString(item.data.vendorName, 'Vendor'),
        storeName: formatSafeString(item.data.storeName, 'Shop'),
        mobileNumber: formatSafeString(item.data.mobileNumber, ''),
        address: formatAddress(item.data.address),
        email: formatSafeString(item.data.email, ''),
        totalDeliveredCodOrders: Number(item.data.totalDeliveredCodOrders || 0),
        totalPlatformFee: Number(item.data.totalPlatformFee || 0),
        paidPlatformFee: Number(item.data.paidPlatformFee || 0),
        duePlatformFee: Number(item.data.duePlatformFee || 0),
        lastUpdated: Number(item.data.lastUpdated || Date.now())
      });
    }

    // 2. Also ensure all active vendors from RTDB 'vendors' and 'users' are included
    const [allVendors, allUsers] = await Promise.all([
      rtdbList<any>('vendors').catch(() => []),
      rtdbList<any>('users').catch(() => [])
    ]);

    const existingVendorIds = new Set(summaries.map(s => s.vendorId));

    for (const { id, data } of allVendors) {
      if (!id || existingVendorIds.has(id)) continue;
      existingVendorIds.add(id);
      summaries.push({
        vendorId: id,
        vendorName: formatSafeString(data?.ownerName || data?.name, 'Vendor'),
        storeName: formatSafeString(data?.storeName || data?.shopName, 'Shop'),
        mobileNumber: formatSafeString(data?.mobileNumber || data?.phone, ''),
        address: formatAddress(data?.address || (data?.district ? `${data.district}${data?.upazila ? ', ' + data.upazila : ''}` : 'N/A')),
        email: formatSafeString(data?.email, ''),
        totalDeliveredCodOrders: 0,
        totalPlatformFee: 0,
        paidPlatformFee: 0,
        duePlatformFee: 0,
        lastUpdated: Date.now()
      });
    }

    for (const { id, data } of allUsers) {
      if (!id || existingVendorIds.has(id)) continue;
      const role = String(data?.role || '').toLowerCase();
      if (role === 'vendor' || role === 'seller') {
        existingVendorIds.add(id);
        summaries.push({
          vendorId: id,
          vendorName: formatSafeString(data?.name || data?.displayName || data?.ownerName, 'Vendor'),
          storeName: formatSafeString(data?.shopName || data?.storeName, 'Shop ' + id.substring(0, 5)),
          mobileNumber: formatSafeString(data?.phone || data?.mobileNumber, ''),
          address: formatAddress(data?.address || 'N/A'),
          email: formatSafeString(data?.email, ''),
          totalDeliveredCodOrders: 0,
          totalPlatformFee: 0,
          paidPlatformFee: 0,
          duePlatformFee: 0,
          lastUpdated: Date.now()
        });
      }
    }

    // 3. Fetch all platform_fee_records to verify and reconcile summaries
    const allRecords = await rtdbList<PlatformFeeRecord>('platform_fee_records').catch(() => []);
    const recordsByVendor = new Map<string, PlatformFeeRecord[]>();
    for (const r of allRecords) {
      if (r && r.data && r.data.vendorId) {
        const vId = r.data.vendorId;
        if (!recordsByVendor.has(vId)) {
          recordsByVendor.set(vId, []);
        }
        recordsByVendor.get(vId)!.push(r.data);
      }
    }

    for (const s of summaries) {
      const vRecords = recordsByVendor.get(s.vendorId) || [];
      if (vRecords.length > 0) {
        let totalFee = 0;
        let paidFee = 0;
        for (const rec of vRecords) {
          const amt = Number(rec.feeAmount || 5);
          totalFee += amt;
          if (rec.status === 'paid') {
            paidFee += amt;
          }
        }
        s.totalDeliveredCodOrders = vRecords.length;
        s.totalPlatformFee = totalFee;
        s.paidPlatformFee = paidFee;
        s.duePlatformFee = Math.max(0, totalFee - paidFee);
      }
    }

    return summaries.sort((a, b) => (b.duePlatformFee || 0) - (a.duePlatformFee || 0));
  } catch (e) {
    console.error('Error getting all vendors platform fees:', e);
    return [];
  }
}

/**
 * Verifies transaction ID against RTDB `payments` node and marks vendor's platform fee as Paid.
 */
export interface SettleVendorPlatformFeeParams {
  vendorId: string;
  paidAmount: number;
  transactionId: string;
  paymentMethod: string;
  senderNumber?: string;
  invoiceId?: string;
}

/**
 * Settles vendor platform fee arrears upon verified payment.
 * Marks vendor's due platform fee records as 'paid', updates related orders,
 * logs the payment, and refreshes the vendor summary in RTDB.
 */
export async function settleVendorPlatformFeePayment(params: SettleVendorPlatformFeeParams): Promise<void> {
  const { vendorId, paidAmount, transactionId, paymentMethod, senderNumber } = params;
  const now = Date.now();
  const cleanTrxId = (transactionId || '').trim().replace(/^#/, '').replace(/\s+/g, '').toUpperCase();
  const targetAmount = Math.round(Number(paidAmount) * 100) / 100;
  const normMethod = normalizeMethod(paymentMethod);

  // 1. Fetch 'due' records for this vendor and mark as 'paid'
  const records = await getVendorPlatformFeeRecords(vendorId);
  const dueRecords = records.filter(r => r.status === 'due');

  let remainingCoverage = targetAmount;
  const coveredIds: string[] = [];

  for (const rec of dueRecords) {
    if (remainingCoverage <= 0) break;
    await rtdbUpdate(`platform_fee_records/${rec.id}`, {
      status: 'paid',
      paidAt: now,
      paymentTrxId: cleanTrxId,
      paymentMethodUsed: normMethod,
      paymentSenderNumber: senderNumber || '',
      updatedAt: now
    });

    if (rec.orderId) {
      const pureOrderId = String(rec.orderId).replace(/^#/, '');
      rtdbUpdate(`orders/${pureOrderId}`, {
        platformFeeStatus: 'paid',
        platformFeePaidAt: now,
        platformFeeTrxId: cleanTrxId
      }).catch(() => null);

      rtdbUpdate(`vendor_orders/${pureOrderId}_${vendorId}`, {
        platformFeeStatus: 'paid',
        platformFeePaidAt: now,
        platformFeeTrxId: cleanTrxId
      }).catch(() => null);
    }

    coveredIds.push(rec.id);
    remainingCoverage -= Number(rec.feeAmount || 5);
  }

  // 2. Record the payment log in RTDB platform_fee_payments
  const paymentId = `FEE-PAY-${cleanTrxId}-${now}`;
  const paymentRecord: PlatformFeePaymentRecord = {
    id: paymentId,
    vendorId,
    amount: targetAmount,
    transactionId: cleanTrxId,
    paymentMethod: normMethod,
    status: 'verified',
    coveredRecordIds: coveredIds,
    senderNumber,
    verifiedAt: now,
    createdAt: now
  };
  await rtdbSet(`platform_fee_payments/${paymentId}`, paymentRecord);

  // 3. Recalculate Vendor Summary
  await updateVendorPlatformFeeSummary(vendorId);
}

/**
 * Verifies vendor's platform fee payment using the centralized automatic payment verification engine.
 * Validates TrxID, Payment Method, and Exact Amount against RTDB payments node.
 */
export async function payVendorPlatformFeeWithTrxId(
  vendorId: string,
  amount: number,
  transactionId: string,
  paymentMethod: string,
  senderNumber?: string,
  invoiceId?: string
): Promise<{ success: boolean; message: string; verifiedPayment?: any }> {
  try {
    const cleanTrxId = (transactionId || '').trim().replace(/^#/, '').replace(/\s+/g, '').toUpperCase();
    if (!cleanTrxId || cleanTrxId.length < 3) {
      return { 
        success: false, 
        message: 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন' 
      };
    }

    const currentInvoiceId = invoiceId || `FEE-INV-${vendorId.substring(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const targetAmount = Math.round(Number(amount) * 100) / 100;

    // Safety timeout promise (matching vendor registration)
    const timeoutPromise = new Promise<VerificationResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Payment verification timed out. Please try again.'));
      }, 8000);
    });

    const result = await Promise.race([
      verifyPaymentAutomatic({
        transactionId: cleanTrxId,
        paymentMethod,
        expectedAmount: targetAmount,
        invoiceId: currentInvoiceId,
        userId: vendorId,
        userType: 'vendor_platform_fee',
        contextData: {
          action: 'vendor_platform_fee',
          vendorId,
          amount: targetAmount,
          senderNumber
        }
      }),
      timeoutPromise
    ]);

    if (result.status === 'verified') {
      // Settle the records (idempotent call)
      await settleVendorPlatformFeePayment({
        vendorId,
        paidAmount: targetAmount,
        transactionId: cleanTrxId,
        paymentMethod,
        senderNumber,
        invoiceId: currentInvoiceId
      }).catch((e) => console.warn('Settlement notice:', e));

      return {
        success: true,
        message: `অভিনন্দন! ৳${targetAmount.toFixed(2)} প্ল্যাটফর্ম ফি সফলভাবে পরিশোধিত হয়েছে এবং বকেয়া তালিকা থেকে বাদ দেওয়া হয়েছে।`,
        verifiedPayment: result
      };
    } else {
      let errorMsg = 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন';
      if (result.rejectionReason === 'amount_mismatch') {
        errorMsg = result.message || `পেমেন্ট এমাউন্ট সঠিক নয়! প্রত্যাশিত: ৳${targetAmount.toFixed(2)}।`;
      } else if (result.rejectionReason === 'method_mismatch') {
        errorMsg = result.message || 'পেমেন্ট মেথড সঠিক নয়! সঠিক পেমেন্ট মেথড ব্যবহার করুন।';
      } else if (result.rejectionReason === 'duplicate_transaction') {
        errorMsg = result.message || 'এই ট্রানজেকশন আইডি ইতিমধ্যে ব্যবহৃত হয়েছে!';
      } else if (result.message) {
        errorMsg = result.message;
      }
      return {
        success: false,
        message: errorMsg
      };
    }
  } catch (error: any) {
    console.error('Error paying platform fee:', error);
    return { 
      success: false, 
      message: 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন' 
    };
  }
}

/**
 * Scans all orders in RTDB and reconciles past completed COD orders into the platform fee system.
 * Useful for 1-click historical synchronization and auditing.
 */
export async function reconcileAllDeliveredCodOrders(): Promise<{
  processedCount: number;
  totalFeeAccrued: number;
  vendorsUpdated: number;
}> {
  try {
    const [allVendorOrders, allMainOrders] = await Promise.all([
      rtdbList<any>('vendor_orders').catch(() => []),
      rtdbList<any>('orders').catch(() => [])
    ]);

    let processedCount = 0;
    let totalFeeAccrued = 0;
    const affectedVendorIds = new Set<string>();

    // 1. Process vendor_orders
    for (const { id, data } of allVendorOrders) {
      if (!data) continue;
      const paymentMethod = data.paymentMethod || data.payment_method;
      const codAmt = Number(data.codAmount ?? 0);
      const status = data.status || data.orderStatus || data.vendorStatus;

      if (isCodPayment(paymentMethod, codAmt) && isDeliveredStatus(status)) {
        const vendorIds = extractVendorIdsFromOrder(data);
        for (const vId of vendorIds) {
          if (vId && vId !== 'admin' && vId !== 'system') {
            const res = await recordPlatformFeeOnDelivery(id, data, vId);
            if (res.success) {
              processedCount++;
              totalFeeAccrued += (res.feeRecorded || 5);
            }
            affectedVendorIds.add(vId);
          }
        }
      }
    }

    // 2. Process main orders that might not be in vendor_orders
    for (const { id, data } of allMainOrders) {
      if (!data) continue;
      const paymentMethod = data.paymentMethod || data.payment_method;
      const codAmt = Number(data.codAmount ?? 0);
      const status = data.status || data.orderStatus || data.vendorStatus;

      if (isCodPayment(paymentMethod, codAmt) && isDeliveredStatus(status)) {
        const vendorIds = extractVendorIdsFromOrder(data);
        for (const vId of vendorIds) {
          if (vId && vId !== 'admin' && vId !== 'system') {
            const res = await recordPlatformFeeOnDelivery(id, data, vId);
            if (res.success) {
              processedCount++;
              totalFeeAccrued += (res.feeRecorded || 5);
            }
            affectedVendorIds.add(vId);
          }
        }
      }
    }

    // 3. Update summaries for all affected vendors
    for (const vId of affectedVendorIds) {
      await updateVendorPlatformFeeSummary(vId);
    }

    return {
      processedCount,
      totalFeeAccrued,
      vendorsUpdated: affectedVendorIds.size
    };
  } catch (error) {
    console.error('Error during platform fee reconciliation:', error);
    return { processedCount: 0, totalFeeAccrued: 0, vendorsUpdated: 0 };
  }
}

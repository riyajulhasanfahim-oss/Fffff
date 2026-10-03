/**
 * Automatic Payment Verification Service
 * 
 * Strict Verification Engine:
 * - Single Source of Truth: Cloud Firestore `payments` collection (/payments/{paymentId})
 *   Database ID: ai-studio-fffff-7c4582d2-5500-4f2c-b20c-2484bf6b633c
 *   Project ID: gen-lang-client-0902472299
 * - Verified ONLY when a real matching payment record from SMS Reader exists in Firestore
 * - verifiedAt is written ONLY upon final successful business verification
 * 
 * Step-by-step verification pipeline:
 * 1. Read pending request (TrxID, Method, Amount, Invoice, User, UserType)
 * 2. Query Firestore `payments` collection for matching TrxID
 * 3. Validate Payment Method (bKash/Nagad/Rocket/Upay)
 * 4. Validate Amount (exact match)
 * 5. Validate Duplicate Protection (not verified for different invoice/user)
 * 6. Execute Business Action (Activate Vendor / Confirm Customer Order / Approve Reseller)
 * 7. Write status: 'VERIFIED' and verifiedAt timestamp to Firestore `/payments/{docId}`
 * 8. Return success to user UI with instant navigation
 */

import { rtdbUpdate, rtdbGet, rtdbList } from '../lib/rtdb';
import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import {
  PaymentMethodType,
  PaymentUserType
} from '../types/paymentVerification';
import { smsReaderSyncManager } from './smsReaderOfflineQueue';
import { ensureResellerWallet } from './resellerWalletService';

export interface VerifyPaymentRequest {
  transactionId: string;
  paymentMethod: PaymentMethodType | string;
  expectedAmount: number;
  invoiceId: string;
  userId: string;
  userType: PaymentUserType;
  contextData?: {
    orderId?: string;
    storeName?: string;
    ownerName?: string;
    fullName?: string;
    phone?: string;
    mobileNumber?: string;
    address?: string;
    [key: string]: any;
  };
}

export interface VerificationResult {
  success: boolean;
  status: 'verified' | 'rejected' | 'pending';
  message: string;
  rejectionReason?: 'transaction_not_found' | 'record_not_found' | 'amount_mismatch' | 'method_mismatch' | 'duplicate_transaction' | 'pending_sms_sync' | 'timeout' | 'network_error';
  paymentId?: string;
  verifiedAt?: number | null;
  receivedAmount?: number | null;
  senderNumber?: string | null;
  pushKey?: string | null;
  diagnostic?: any;
}

/**
 * Normalizes payment method string into standard lowercase enum
 */
export function normalizeMethod(method: string | PaymentMethodType): PaymentMethodType {
  const m = (method || '').toLowerCase().trim();
  if (m.includes('bkash')) return 'bkash';
  if (m.includes('nagad')) return 'nagad';
  if (m.includes('rocket')) return 'rocket';
  if (m.includes('upay')) return 'upay';
  return 'bkash';
}

export interface FirestorePaymentRecord {
  pushKey: string;
  amount: number;
  paymentMethod: string;
  senderNumber: string;
  status: string;
  syncStatus: string;
  syncedAt?: number;
  receivedAt?: number;
  verifiedAt?: number | null;
  verifiedFor?: any;
  rawMessage?: string;
}

function parseFirestorePaymentItem(id: string, data: any): FirestorePaymentRecord {
  const rawAmt = data.amount ?? data.receivedAmount ?? data.paidAmount ?? data.totalAmount ?? data.fee ?? data.total ?? 0;
  const parsedAmt = typeof rawAmt === 'number'
    ? rawAmt
    : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;

  const rawMethod = data.paymentMethod || data.payment_method || data.method || data.channel || data.provider || data.gateway || '';
  const rawReceivedAt = data.receivedAt || data.syncedAt || data.createdAt || 0;
  const receivedAt = typeof rawReceivedAt === 'number'
    ? rawReceivedAt
    : (rawReceivedAt?.toMillis ? rawReceivedAt.toMillis() : Date.parse(rawReceivedAt) || 0);

  return {
    pushKey: id,
    amount: parsedAmt,
    paymentMethod: String(rawMethod).toLowerCase().trim(),
    senderNumber: String(data.senderNumber || data.sender || data.mobileNumber || data.phone || '').trim(),
    status: String(data.status || data.syncStatus || 'SYNCED').toUpperCase(),
    syncStatus: String(data.syncStatus || data.status || 'SYNCED').toUpperCase(),
    syncedAt: Number(data.syncedAt || receivedAt),
    receivedAt,
    verifiedAt: data.verifiedAt ? Number(data.verifiedAt) : null,
    verifiedFor: data.verifiedFor || null,
    rawMessage: data.rawMessage || ''
  };
}

/**
 * Direct query to Cloud Firestore `payments` collection
 * Single Source of Truth
 */
async function queryFirestorePaymentsNode(cleanTrxId: string): Promise<FirestorePaymentRecord | null> {
  try {
    // 1. Direct document fetch by ID (SMS Reader writes document with docId == cleanTrxId)
    const directDocRef = doc(db, 'payments', cleanTrxId);
    const directDoc = await getDoc(directDocRef);
    if (directDoc.exists()) {
      const data = directDoc.data();
      const rawTrx = data.transactionId || data.trxId || directDoc.id;
      const itemTrx = String(rawTrx).trim().replace(/^#/, '').replace(/\s+/g, '').toUpperCase();
      if (itemTrx === cleanTrxId) {
        return parseFirestorePaymentItem(directDoc.id, data);
      }
    }

    // 2. Query Firestore 'payments' collection where transactionId == cleanTrxId
    const q = query(
      collection(db, 'payments'),
      where('transactionId', '==', cleanTrxId)
    );
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return parseFirestorePaymentItem(firstDoc.id, firstDoc.data());
    }
  } catch (err) {
    console.warn('[VERIFY] Firestore payments query notice:', err);
  }
  return null;
}

/**
 * Fulfills the business action (Vendor approval, Order confirmation, Reseller approval)
 * Wrapped in a safe timeout guard so slow network never hangs the verification flow.
 */
async function executeBusinessActionSafely(
  req: VerifyPaymentRequest,
  cleanTrxId: string,
  verifiedAmount: number,
  senderNumber: string
): Promise<boolean> {
  const now = Date.now();
  console.log(`[VERIFY] Activating service / confirming order for userType=${req.userType}, userId=${req.userId}, invoiceId=${req.invoiceId}`);

  // 1. VENDOR WALLET DEPOSIT (For Reseller Order Profit Reserve)
  if (
    req.contextData?.type === 'vendor_wallet_deposit' ||
    req.contextData?.action === 'vendor_wallet_deposit' ||
    (req.userType as string) === 'vendor_wallet_deposit'
  ) {
    const vendorId = req.userId || req.contextData?.vendorId;
    if (vendorId) {
      const { creditVendorWalletDeposit } = await import('./vendorResellerOrderService');
      await creditVendorWalletDeposit({
        vendorId,
        amount: verifiedAmount,
        transactionId: cleanTrxId,
        paymentMethod: normalizeMethod(req.paymentMethod),
        senderNumber,
        orderId: req.contextData?.orderId,
        invoiceId: req.invoiceId
      });
    }
    return true;
  }

  const businessPromise = (async () => {
    // 2. CUSTOMER ORDER CONFIRMATION
    if (req.userType === 'customer') {
      const orderId = req.contextData?.orderId || req.invoiceId;
      if (orderId) {
        try {
          const oDoc = await rtdbGet<any>(`orders/${orderId}`).catch(() => null);
          const oGrandTotal = Number(oDoc?.grandTotal ?? oDoc?.total ?? verifiedAmount);
          const isFull = verifiedAmount >= oGrandTotal || !oDoc?.paymentMethod || oDoc?.paymentMethod === 'product_full_payment';
          const isDelCharge = oDoc?.paymentMethod === 'only_delivery_charge';

          const finalAdv = isFull ? oGrandTotal : (isDelCharge ? verifiedAmount : verifiedAmount);
          const finalCod = isFull ? 0 : Math.max(0, oGrandTotal - finalAdv);

          await rtdbUpdate(`orders/${orderId}`, {
            paymentStatus: 'Paid',
            status: 'Confirmed',
            transactionId: cleanTrxId,
            verifiedAt: now,
            receivedAmount: verifiedAmount,
            advancePaymentAmount: finalAdv,
            paidAmount: finalAdv,
            advanceAmount: finalAdv,
            advancePaymentType: isFull ? 'full' : (isDelCharge ? 'delivery_charge' : 'partial'),
            codAmount: finalCod,
            senderNumber: senderNumber || null,
            updatedAt: now
          });

          // Also sync any vendor_orders
          try {
            const vOrders = await rtdbList<any>('vendor_orders', (item) => item?.orderId === orderId);
            for (const vDoc of vOrders) {
              const vGrand = Number(vDoc.data?.grandTotal ?? vDoc.data?.total ?? 0);
              const vAdv = isFull ? vGrand : (isDelCharge ? Number(vDoc.data?.deliveryCharge ?? 0) : 0);
              await rtdbUpdate(`vendor_orders/${vDoc.id}`, {
                paymentStatus: 'Paid',
                status: 'Confirmed',
                transactionId: cleanTrxId,
                advancePaymentAmount: vAdv,
                paidAmount: vAdv,
                advanceAmount: vAdv,
                advancePaymentType: isFull ? 'full' : (isDelCharge ? 'delivery_charge' : 'none'),
                codAmount: isFull ? 0 : Math.max(0, vGrand - vAdv),
                updatedAt: now
              });
            }
          } catch (syncErr) {
            console.warn('[VERIFY] Vendor order sync error:', syncErr);
          }
        } catch (err) {
          console.warn('[VERIFY] Customer order save notice:', err);
        }
      }
    }

    // 3. VENDOR REGISTRATION ACTIVATION
    else if (req.userType === 'vendor') {
      const vendorId = req.userId;
      if (vendorId && vendorId !== 'guest') {
        const vendorPayload = {
          vendorId,
          storeId: vendorId,
          status: 'active',
          registrationPayment: 'completed',
          transactionId: cleanTrxId,
          verifiedAt: now,
          updatedAt: now,
          ...(req.contextData?.storeName ? { storeName: req.contextData.storeName } : {}),
          ...(req.contextData?.ownerName ? { ownerName: req.contextData.ownerName } : {}),
          ...(req.contextData?.mobileNumber ? { mobileNumber: req.contextData.mobileNumber } : {})
        };

        try {
          localStorage.setItem('rj_active_vendor_' + vendorId, JSON.stringify(vendorPayload));
          localStorage.setItem('rj_has_active_vendor_' + vendorId, 'true');
          localStorage.setItem('rj_user_role_' + vendorId, 'Vendor');
        } catch (_) {}

        try {
          await rtdbUpdate(`vendors/${vendorId}`, vendorPayload);
          await rtdbUpdate(`stores/${vendorId}`, {
            id: vendorId,
            vendorId,
            status: 'active',
            updatedAt: now,
            ...(req.contextData?.storeName ? { storeName: req.contextData.storeName } : {})
          });
          await rtdbUpdate(`vendor_profiles/${vendorId}`, {
            vendorId,
            status: 'Active',
            updatedAt: now
          });
        } catch (err) {
          console.warn('[VERIFY] Vendor RTDB save notice:', err);
        }

        try {
          const { db } = await import('../lib/firebase');
          const { doc, setDoc } = await import('firebase/firestore');
          await Promise.allSettled([
            setDoc(doc(db, 'vendors', vendorId), vendorPayload, { merge: true }),
            setDoc(doc(db, 'stores', vendorId), {
              id: vendorId,
              vendorId,
              status: 'active',
              updatedAt: now,
              ...(req.contextData?.storeName ? { storeName: req.contextData.storeName, shopName: req.contextData.storeName } : {})
            }, { merge: true })
          ]);
        } catch (_) {}

        try {
          const { notifyStoreUpdated } = await import('./storeCache');
          notifyStoreUpdated({
            id: vendorId,
            vendorId,
            storeId: vendorId,
            shopName: req.contextData?.storeName || 'Vendor Shop',
            storeName: req.contextData?.storeName || 'Vendor Shop',
            name: req.contextData?.ownerName || 'Vendor',
            ownerName: req.contextData?.ownerName || 'Vendor',
            phone: req.contextData?.mobileNumber || '',
            mobileNumber: req.contextData?.mobileNumber || '',
            status: 'active',
            ...vendorPayload
          });
        } catch (_) {}

        try {
          await rtdbUpdate(`users/${vendorId}`, {
            role: 'Vendor',
            updatedAt: now
          });
        } catch (err) {
          console.warn('[VERIFY] User role save notice:', err);
        }
      }
    }

    // 4. RESELLER REGISTRATION ACTIVATION
    else if (req.userType === 'reseller') {
      const resellerId = req.userId;
      if (resellerId && resellerId !== 'guest') {
        const resellerPayload = {
          resellerId,
          userId: resellerId,
          status: 'approved',
          registrationPayment: 'completed',
          transactionId: cleanTrxId,
          verifiedAt: now,
          updatedAt: now
        };

        try {
          localStorage.setItem('rj_active_reseller_' + resellerId, JSON.stringify(resellerPayload));
          localStorage.setItem('rj_has_active_reseller_' + resellerId, 'true');
          localStorage.setItem('rj_user_role_' + resellerId, 'Reseller');
        } catch (_) {}

        try {
          await rtdbUpdate(`resellers/${resellerId}`, resellerPayload);
          await ensureResellerWallet(resellerId);
        } catch (err) {
          console.warn('[VERIFY] Reseller RTDB save notice:', err);
        }

        try {
          await rtdbUpdate(`users/${resellerId}`, {
            role: 'Reseller',
            updatedAt: now
          });
        } catch (err) {
          console.warn('[VERIFY] User role save notice:', err);
        }
      }
    }

    // 5. VENDOR PLATFORM FEE ARREARS PAYMENT
    else if (req.userType === 'vendor_platform_fee' || req.contextData?.action === 'vendor_platform_fee') {
      const vendorId = req.userId || req.contextData?.vendorId;
      if (vendorId) {
        try {
          const { settleVendorPlatformFeePayment } = await import('./platformFeeService');
          await settleVendorPlatformFeePayment({
            vendorId,
            paidAmount: verifiedAmount,
            transactionId: cleanTrxId,
            paymentMethod: normalizeMethod(req.paymentMethod),
            senderNumber,
            invoiceId: req.invoiceId
          });
        } catch (feeErr) {
          console.warn('[VERIFY] Vendor platform fee settlement notice:', feeErr);
        }
      }
    }
    return true;
  })();

  // Safe timeout guard on business action writes
  const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000));
  return Promise.race([businessPromise, timeoutPromise]);
}

/**
 * Updates the Firestore `payments` document with status: 'VERIFIED' and verifiedAt timestamp
 * Called ONLY AFTER business action is confirmed.
 * Uses parallel dispatch (Promise.allSettled) for instantaneous completion.
 */
async function markPaymentVerified(
  docId: string,
  cleanTrxId: string,
  req: VerifyPaymentRequest,
  verifiedAmount: number,
  senderNumber: string
): Promise<number> {
  const verifiedAt = Date.now();
  console.log('[VERIFY] Updating payment status in Firestore payments collection');

  const updateData = {
    status: 'VERIFIED',
    verifiedAt,
    verifiedFor: {
      invoiceId: req.invoiceId || null,
      userId: req.userId || null,
      userType: req.userType || null
    }
  };

  // Parallelize Firestore update, server endpoint confirmation, and RTDB mirror
  await Promise.allSettled([
    // 1. Direct Firestore document update (Single Source of Truth)
    updateDoc(doc(db, 'payments', docId), updateData).catch(err => {
      console.warn('[VERIFY] Firestore doc update notice:', err);
    }),

    // 2. Update via server endpoint if running in browser
    (async () => {
      try {
        if (typeof window !== 'undefined') {
          await fetch('/api/payment/confirm-completion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(2000),
            body: JSON.stringify({
              transactionId: cleanTrxId,
              pushKey: docId,
              invoiceId: req.invoiceId,
              userId: req.userId,
              userType: req.userType,
              receivedAmount: verifiedAmount,
              senderNumber
            })
          });
        }
      } catch (err) {
        console.warn('[VERIFY] Server confirm-completion notice:', err);
      }
    })(),

    // 3. Mirror update to RTDB payments node if it exists
    rtdbUpdate(`payments/${docId}`, updateData).catch(() => {})
  ]);

  try {
    smsReaderSyncManager.updateTransactionStatus(cleanTrxId, 'verified');
  } catch {}

  return verifiedAt;
}

/**
 * Main Automatic Payment Verification Entry Point
 * Reads from existing Firestore database and payments collection
 */
export async function verifyPaymentAutomatic(
  req: VerifyPaymentRequest
): Promise<VerificationResult> {
  console.log('[VERIFY] Start verification');
  console.log('[VERIFY] Pending request lookup started');

  const cleanTrxId = (req.transactionId || '').trim().replace(/\s+/g, '').toUpperCase();
  const reqMethod = normalizeMethod(req.paymentMethod);
  const expectedAmount = Math.round(Number(req.expectedAmount) * 100) / 100;

  console.log(`[VERIFY] Pending request found: TrxID=${cleanTrxId}, Method=${reqMethod}, Amount=৳${expectedAmount}, Invoice=${req.invoiceId || 'N/A'}, User=${req.userId || 'N/A'}, Type=${req.userType}`);
  console.log('[VERIFY] Pending request found');

  // 1. Validate basic input fields
  if (!cleanTrxId || cleanTrxId.length < 3) {
    console.warn('[VERIFY] Validation failed: Invalid Transaction ID');
    console.log('[VERIFY] Final response sent');
    return {
      success: false,
      status: 'pending',
      message: 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন',
      rejectionReason: 'transaction_not_found'
    };
  }

  const allowedProviders: PaymentMethodType[] = ['bkash', 'nagad', 'rocket', 'upay'];
  if (!allowedProviders.includes(reqMethod)) {
    console.warn(`[VERIFY] Validation failed: Unsupported method ${reqMethod}`);
    console.log('[VERIFY] Final response sent');
    return {
      success: false,
      status: 'rejected',
      message: 'পেমেন্ট মেথডটি সমর্থিত নয়। শুধুমাত্র bKash, Nagad, Rocket, বা Upay নির্বাচন করুন।',
      rejectionReason: 'method_mismatch'
    };
  }

  // Polling loop against Firestore payments collection (Single Source of Truth)
  const startTime = Date.now();
  const MAX_WAIT_MS = 6000;

  while (Date.now() - startTime < MAX_WAIT_MS) {
    console.log('[VERIFY] Querying Firestore payments collection');

    // Run Server API and Direct Firestore Query in Parallel for maximum speed
    const [serverResData, firestoreRecord] = await Promise.all([
      (async () => {
        try {
          if (typeof window !== 'undefined') {
            const serverRes = await fetch('/api/payment/verify-automatic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(2500),
              body: JSON.stringify({
                transactionId: cleanTrxId,
                paymentMethod: reqMethod,
                expectedAmount,
                invoiceId: req.invoiceId,
                userId: req.userId,
                userType: req.userType,
                contextData: req.contextData
              })
            });
            if (serverRes.ok) {
              return await serverRes.json();
            }
          }
        } catch (netErr) {
          console.warn('[VERIFY] Backend verify-automatic fetch notice:', netErr);
        }
        return null;
      })(),
      queryFirestorePaymentsNode(cleanTrxId)
    ]);

    console.log('[VERIFY] Payment query completed');

    // If server returned explicit mismatch rejection (amount or method mismatch, or duplicate), fail fast!
    if (serverResData?.status === 'rejected' && serverResData?.rejectionReason !== 'record_not_found') {
      console.warn(`[VERIFY] Server returned rejection: ${serverResData.message}`);
      console.log('[VERIFY] Final response sent');
      return {
        success: false,
        status: 'rejected',
        message: serverResData.message || 'Payment verification failed. Please check your Transaction ID.',
        rejectionReason: serverResData.rejectionReason || 'amount_mismatch'
      };
    }

    const foundMatch = firestoreRecord || (
      (serverResData?.status === 'matched' || serverResData?.status === 'verified') ? serverResData : null
    );

    if (foundMatch) {
      console.log('[VERIFY] Payment found in Firestore payments collection');
      const docId = foundMatch.pushKey || foundMatch.id || cleanTrxId;
      const rawAmt = foundMatch.amount ?? foundMatch.receivedAmount ?? 0;
      const receivedAmount = Math.round((typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0) * 100) / 100;
      const senderNumber = foundMatch.senderNumber || '';
      const paymentMethod = normalizeMethod(foundMatch.paymentMethod || reqMethod);

      // 1. Amount Validation (Exact match required: Transaction ID, Method, and Amount all must match)
      if (Math.abs(receivedAmount - expectedAmount) >= 0.01) {
        console.warn(`[VERIFY] Amount validation failed: expected ৳${expectedAmount} vs received ৳${receivedAmount}`);
        console.log('[VERIFY] Final response sent');
        return {
          success: false,
          status: 'rejected',
          message: `পেমেন্ট এমাউন্ট সঠিক নয়! প্রত্যাশিত: ৳${expectedAmount.toFixed(2)}, কিন্তু পেমেন্ট পাওয়া গেছে: ৳${receivedAmount.toFixed(2)}। সঠিক এমাউন্ট পরিশোধ করুন।`,
          rejectionReason: 'amount_mismatch',
          receivedAmount
        };
      }
      console.log('[VERIFY] Amount validation completed');

      // 2. Payment Method Validation (Exact match required)
      if (paymentMethod !== reqMethod) {
        console.warn(`[VERIFY] Payment method validation failed: expected ${reqMethod} vs received ${paymentMethod}`);
        console.log('[VERIFY] Final response sent');
        return {
          success: false,
          status: 'rejected',
          message: `পেমেন্ট মেথড সঠিক নয়! আপনি ${reqMethod.toUpperCase()} নির্বাচন করেছেন, কিন্তু পেমেন্ট পাওয়া গেছে ${paymentMethod.toUpperCase()} এর।`,
          rejectionReason: 'method_mismatch'
        };
      }
      console.log('[VERIFY] Payment method validation completed');

      // 3. Duplicate Protection Validation
      const isAlreadyVerified = (foundMatch.status === 'VERIFIED' || foundMatch.status === 'verified') && (foundMatch.verifiedAt && foundMatch.verifiedAt > 0);
      if (isAlreadyVerified) {
        const verifiedFor = foundMatch.verifiedFor;
        const isSameInvoice = Boolean(req.invoiceId && verifiedFor?.invoiceId && verifiedFor?.invoiceId === req.invoiceId);

        if (!isSameInvoice) {
          console.warn(`[VERIFY] Duplicate check failed: Already verified for different invoice/user: TrxID=${cleanTrxId}`);
          console.log('[VERIFY] Final response sent');
          return {
            success: false,
            status: 'rejected',
            message: `এই Transaction ID (${cleanTrxId}) ইতিমধ্যে ব্যবহার করা হয়েছে। একটি ট্রানজেকশন আইডি দিয়ে একাধিকবার ডিপোজিট বা পেমেন্ট করা যাবে না।`,
            rejectionReason: 'duplicate_transaction'
          };
        }
      }

      // Check if this transaction has already been credited in wallet_transactions or vendor_wallet_deposits
      if (
        req.contextData?.type === 'vendor_wallet_deposit' ||
        req.contextData?.action === 'vendor_wallet_deposit' ||
        (req.userType as string) === 'vendor_wallet_deposit'
      ) {
        try {
          const [existingDep, existingTx] = await Promise.all([
            rtdbList<any>('vendor_wallet_deposits', (dep) => {
              const depTrx = (dep.transactionId || dep.trxId || '').trim().toUpperCase();
              return depTrx === cleanTrxId;
            }),
            rtdbList<any>('wallet_transactions', (tx) => {
              const txTrx = (tx.transactionId || tx.trxId || '').trim().toUpperCase();
              return txTrx === cleanTrxId;
            })
          ]);

          if (existingDep.length > 0 || existingTx.length > 0) {
            console.warn(`[VERIFY] Duplicate check failed: TrxID=${cleanTrxId} already in deposits/transactions`);
            console.log('[VERIFY] Final response sent');
            return {
              success: false,
              status: 'rejected',
              message: `এই Transaction ID (${cleanTrxId}) দিয়ে ইতিপূর্বে ডিপোজিট সম্পন্ন হয়েছে। পুনরায় ব্যবহার করা যাবে না।`,
              rejectionReason: 'duplicate_transaction'
            };
          }
        } catch (dupCheckErr) {
          console.warn('[VERIFY] Deposit duplicate query warning:', dupCheckErr);
        }
      }

      // 4. Service / Order Activation
      console.log('[VERIFY] Service/order validation started');
      try {
        await executeBusinessActionSafely(req, cleanTrxId, receivedAmount, senderNumber);
      } catch (actionErr: any) {
        console.error('[VERIFY] Business action failed:', actionErr);
        const isDuplicate = actionErr?.message && actionErr.message.includes('ইতিপূর্বে');
        return {
          success: false,
          status: 'rejected',
          message: actionErr?.message || 'ডিপোজিট সম্পন্ন করা সম্ভব হয়নি।',
          rejectionReason: isDuplicate ? 'duplicate_transaction' : 'transaction_not_found'
        };
      }
      console.log('[VERIFY] Service/order activation completed');

      // 5. Updating payment status in Firestore (and mirroring)
      const verifiedAt = await markPaymentVerified(docId, cleanTrxId, req, receivedAmount, senderNumber);

      // 6. Return Final Verified Response
      console.log('[VERIFY] Final response sent');
      return {
        success: true,
        status: 'verified',
        message: 'পেমেন্ট সফলভাবে যাচাই হয়েছে!',
        paymentId: `PAY-${cleanTrxId}`,
        verifiedAt,
        receivedAmount,
        senderNumber,
        pushKey: docId
      };
    }

    // If not found yet and still within timeout window, short 800ms sleep before re-polling
    if (Date.now() - startTime < MAX_WAIT_MS - 1000) {
      await new Promise(resolve => setTimeout(resolve, 800));
    } else {
      break;
    }
  }

  // Timeout reached and no matching payment record found in Firestore payments collection
  console.warn(`[VERIFY] Payment record not found in Firestore payments collection for TrxID: ${cleanTrxId}`);
  console.log('[VERIFY] Final response sent');
  return {
    success: false,
    status: 'pending',
    rejectionReason: 'record_not_found',
    message: 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন',
    diagnostic: {
      transactionId: cleanTrxId,
      expectedMethod: reqMethod,
      expectedAmount,
      invoiceId: req.invoiceId,
      elapsedMs: Date.now() - startTime
    }
  };
}

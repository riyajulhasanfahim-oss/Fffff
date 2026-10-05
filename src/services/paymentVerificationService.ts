import {
  PaymentVerificationRecord,
  CreatePaymentVerificationInput,
  UpdateVerificationStatusInput,
  PaymentVerificationStatus,
  PaymentUserType,
  PaymentMethodType
} from '../types/paymentVerification';
import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  limit,
  Timestamp
} from 'firebase/firestore';

/**
 * Calculates a Firestore Timestamp exactly 10 days in the future for Firestore TTL automatic deletion.
 */
export function calculatePaymentExpiresAt(createdAtMs?: number): Timestamp {
  const baseMs = Number(createdAtMs) || Date.now();
  const tenDaysMs = 10 * 24 * 60 * 60 * 1000;
  return Timestamp.fromMillis(baseMs + tenDaysMs);
}

/**
 * Normalizes payment method string into standard lowercase enum
 */
export function normalizePaymentMethod(method: string): PaymentMethodType {
  const m = (method || '').toLowerCase().trim();
  if (m.includes('bkash')) return 'bkash';
  if (m.includes('nagad')) return 'nagad';
  if (m.includes('rocket')) return 'rocket';
  if (m.includes('upay')) return 'upay';
  return 'bkash';
}

/**
 * Generates a unique, standardized payment ID
 */
export function generatePaymentId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `PAY-${timestamp}-${randomStr}`;
}

/**
 * Fetches a single payment record from Cloud Firestore `payments` collection by Transaction ID
 * Single Source of Truth: Firestore 'payments' collection
 */
export async function getPaymentVerificationByTransactionId(
  transactionId: string
): Promise<{ pushKey: string; data: any } | null> {
  const cleanTrxId = (transactionId || '').trim().replace(/\s+/g, '').toUpperCase();
  if (!cleanTrxId) return null;

  try {
    // 1. Direct doc lookup by ID
    const directDocRef = doc(db, 'payments', cleanTrxId);
    const directDoc = await getDoc(directDocRef);
    if (directDoc.exists()) {
      return { pushKey: directDoc.id, data: directDoc.data() };
    }

    // 2. Query where transactionId == cleanTrxId
    const q = query(
      collection(db, 'payments'),
      where('transactionId', '==', cleanTrxId),
      limit(1)
    );
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      const firstDoc = qSnap.docs[0];
      return { pushKey: firstDoc.id, data: firstDoc.data() };
    }
  } catch (err) {
    console.warn('[PAYMENT-SERVICE] Error fetching payment by TrxID from Firestore:', err);
  }
  return null;
}

/**
 * Creates/opens a payment verification request object
 * Default status is strictly 'pending'.
 * NEVER writes a fake payment record into Firestore `/payments` collection!
 * The SMS Reader is the only entity that writes payment records into `/payments`.
 */
export async function createPaymentVerificationRecord(
  input: CreatePaymentVerificationInput
): Promise<PaymentVerificationRecord> {
  const paymentId = input.paymentId || generatePaymentId();
  const cleanTrxId = (input.transactionId || '').trim().replace(/\s+/g, '').toUpperCase();
  const normalizedMethod = normalizePaymentMethod(input.paymentMethod);
  const now = Date.now();

  const record: PaymentVerificationRecord = {
    paymentId,
    invoiceId: input.invoiceId,
    userId: input.userId,
    userType: input.userType,
    paymentMethod: normalizedMethod,
    expectedAmount: Number(input.expectedAmount) || 0,
    transactionId: cleanTrxId,
    status: 'pending',
    senderNumber: input.senderNumber || null,
    receivedAmount: null,
    verifiedAt: null,
    createdAt: now,
    expiresAt: calculatePaymentExpiresAt(now),
    rejectionReason: null,
    ...(input.metadata ? { metadata: input.metadata } : {})
  };

  // Website does NOT write fake records to /payments; returns pending request
  return record;
}

/**
 * Updates payment verification status in Cloud Firestore (payments/{docId})
 * Only writes verifiedAt during final successful verification.
 */
export async function updatePaymentVerificationStatus(
  pushKeyOrTrxId: string,
  update: UpdateVerificationStatusInput & { pushKey?: string }
): Promise<boolean> {
  let targetDocId = update.pushKey;

  if (!targetDocId) {
    const existing = await getPaymentVerificationByTransactionId(pushKeyOrTrxId);
    if (existing) {
      targetDocId = existing.pushKey;
    } else {
      targetDocId = pushKeyOrTrxId;
    }
  }

  if (!targetDocId) return false;

  const updateFields: any = {
    status: update.status === 'verified' ? 'VERIFIED' : 'SYNCED'
  };

  if (update.status === 'verified') {
    updateFields.verifiedAt = Date.now();
  }

  try {
    await updateDoc(doc(db, 'payments', targetDocId), updateFields);
    return true;
  } catch (err) {
    console.warn('[PAYMENT-SERVICE] Error updating payment status in Firestore:', err);
    return false;
  }
}

/**
 * Lists payment verification records directly from Cloud Firestore `payments` collection
 */
export async function listPaymentVerifications(options?: { limitCount?: number }): Promise<PaymentVerificationRecord[]> {
  try {
    const q = query(
      collection(db, 'payments'),
      limit(options?.limitCount || 50)
    );
    const snap = await getDocs(q);
    const list: PaymentVerificationRecord[] = [];
    const now = Date.now();

    snap.forEach((d) => {
      const item = d.data();
      // Skip if past 10-day TTL expiration
      if (item.expiresAt) {
        const expMs = typeof item.expiresAt?.toMillis === 'function' 
          ? item.expiresAt.toMillis() 
          : (item.expiresAt instanceof Date ? item.expiresAt.getTime() : Number(item.expiresAt?.seconds ? item.expiresAt.seconds * 1000 : item.expiresAt));
        if (expMs && expMs < now) {
          return;
        }
      }
      const rawAmt = item.amount ?? item.receivedAmount ?? 0;
      const amt = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.]/g, '')) || 0;
      const rawTrx = item.transactionId || d.id;

      list.push({
        paymentId: d.id,
        invoiceId: item.verifiedFor?.invoiceId || `INV-${rawTrx}`,
        userId: item.verifiedFor?.userId || 'system',
        userType: item.verifiedFor?.userType || 'customer',
        paymentMethod: normalizePaymentMethod(item.paymentMethod || 'bkash'),
        expectedAmount: amt,
        receivedAmount: amt,
        transactionId: String(rawTrx).trim().toUpperCase(),
        status: (item.status === 'VERIFIED' || item.verifiedAt) ? 'verified' : 'pending',
        senderNumber: item.senderNumber || null,
        verifiedAt: item.verifiedAt || null,
        createdAt: item.receivedAt || item.syncedAt || Date.now(),
        rejectionReason: null
      });
    });

    return list;
  } catch (err) {
    console.warn('[PAYMENT-SERVICE] Error listing payments from Firestore:', err);
    return [];
  }
}

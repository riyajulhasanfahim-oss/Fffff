import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

export interface ShareholderPortfolioDoc {
  userId: string;
  shareholderName: string;
  activeSharesPercent: number;
  portfolioValue: number;
  status: 'active_shareholder' | 'inactive' | 'suspended';
  lastVerifiedAt?: number;
  updatedAt?: number;
  createdAt?: number;
  email?: string;
  phone?: string;
  guardianName?: string;
  address?: string;
}

export interface SharePaymentDoc {
  id: string;
  applicationId: string;
  userId: string;
  applicantName: string;
  guardianName?: string;
  address?: string;
  phone?: string;
  email?: string;
  sharePercent: number;
  sharePrice: number;
  shareUnits: number;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  payerMobile: string;
  screenshotUrl?: string;
  submissionTimestamp: number;
  paymentStatus: 'Pending Verification' | 'Approved' | 'Rejected' | string;
  status: 'pending_verification' | 'approved' | 'rejected' | string;
  isShareholderActive: boolean;
  isOfficialCertificateIssued: boolean;
  verifiedAt?: number | null;
  verifiedBy?: string | null;
  rejectedAt?: number | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ShareCertificateDoc {
  certificateNumber: string;
  shareholderId: string;
  userId: string;
  fullName: string;
  approvedSharePercentage: number;
  totalAmountPaid: number;
  shareUnits: number;
  pricePerShare: number;
  transactionId: string;
  issueDate: number;
  status: string;
  officialSeal: string;
  authorizedSignature: string;
  createdAt: number;
}

export interface ShareholderWithdrawalDoc {
  id: string;
  userId: string;
  shareholderId: string;
  amount: number;
  paymentMethod: string;
  accountNumber: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Rejected';
  requestedAt: number;
  processedAt?: number | null;
  transactionReference?: string | null;
  rejectionReason?: string | null;
}

export interface ShareholderRevenueData {
  resellerRegistrationTotal: number;
  verifiedBadgeTotal: number;
  orderFormFeeTotal: number;
  totalEligibleRevenue: number;
}

/**
 * Fetch shareholder profile & portfolio directly from Firestore 'shareholders' collection
 */
export async function getShareholderPortfolioFromFirestore(userId: string): Promise<ShareholderPortfolioDoc | null> {
  if (!userId) return null;
  try {
    const docRef = doc(db, 'shareholders', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ShareholderPortfolioDoc;
    }
  } catch (err: any) {
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      console.warn('[FIRESTORE QUOTA NOTICE] Quota limit exceeded for read units.');
    } else {
      console.warn('[Shareholder Firestore] Error getting portfolio:', err);
    }
  }
  return null;
}

/**
 * Fetch all user's payment records & applications from Firestore 'share_payments' collection
 */
export async function getShareholderPaymentsFromFirestore(userId: string): Promise<SharePaymentDoc[]> {
  if (!userId) return [];
  const list: SharePaymentDoc[] = [];
  try {
    const q = query(
      collection(db, 'share_payments'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
  } catch (err: any) {
    if (err?.message?.includes('Quota') || err?.code === 'resource-exhausted') {
      console.warn('[FIRESTORE QUOTA NOTICE] Quota limit exceeded for read units.');
    } else {
      console.warn('[Shareholder Firestore] Error getting share payments:', err);
    }
  }

  // Also query 'shareholder_applications' if distinct
  try {
    const qApp = query(
      collection(db, 'shareholder_applications'),
      where('userId', '==', userId)
    );
    const snapApp = await getDocs(qApp);
    snapApp.forEach((d) => {
      const data = d.data() as any;
      if (!list.some(p => p.id === d.id || p.applicationId === data.applicationId)) {
        list.push({ id: d.id, ...data });
      }
    });
  } catch (_) {}

  // Sort newest first
  return list.sort((a, b) => (b.createdAt || b.submissionTimestamp || 0) - (a.createdAt || a.submissionTimestamp || 0));
}

/**
 * Save or submit a shareholder application to Firestore
 */
export async function saveShareholderApplicationToFirestore(appData: SharePaymentDoc): Promise<boolean> {
  try {
    const targetId = appData.applicationId || appData.id;
    const docRef = doc(db, 'share_payments', targetId);
    await setDoc(docRef, appData, { merge: true });

    // Also mirror to shareholder_applications collection
    try {
      const appRef = doc(db, 'shareholder_applications', targetId);
      await setDoc(appRef, appData, { merge: true });
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('[Shareholder Firestore] Error saving application:', err);
    return false;
  }
}

/**
 * Activate a verified shareholder record directly in Cloud Firestore
 */
export async function activateVerifiedShareholderInFirestore(params: {
  userId: string;
  applicationId: string;
  applicantName: string;
  sharePercent: number;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  payerMobile?: string;
  email?: string;
  phone?: string;
  guardianName?: string;
  address?: string;
}): Promise<boolean> {
  const now = Date.now();
  const sharePrice = 2000;
  const portfolioDoc: ShareholderPortfolioDoc = {
    userId: params.userId,
    shareholderName: params.applicantName,
    activeSharesPercent: params.sharePercent,
    portfolioValue: params.totalAmount || (params.sharePercent * sharePrice),
    status: 'active_shareholder',
    lastVerifiedAt: now,
    updatedAt: now,
    createdAt: now,
    email: params.email || '',
    phone: params.phone || params.payerMobile || '',
    guardianName: params.guardianName || '',
    address: params.address || ''
  };

  const paymentDoc: SharePaymentDoc = {
    id: params.applicationId,
    applicationId: params.applicationId,
    userId: params.userId,
    applicantName: params.applicantName,
    guardianName: params.guardianName || '',
    address: params.address || '',
    phone: params.phone || params.payerMobile || '',
    email: params.email || '',
    sharePercent: params.sharePercent,
    sharePrice: 2000,
    shareUnits: params.sharePercent,
    totalAmount: params.totalAmount || (params.sharePercent * 2000),
    paymentMethod: params.paymentMethod,
    transactionId: params.transactionId,
    payerMobile: params.payerMobile || '',
    submissionTimestamp: now,
    paymentStatus: 'Approved',
    status: 'approved',
    isShareholderActive: true,
    isOfficialCertificateIssued: true,
    verifiedAt: now,
    verifiedBy: 'automatic_verification',
    createdAt: now,
    updatedAt: now
  };

  const certificateNumber = `RJ-CERT-${params.userId.slice(0, 8).toUpperCase()}-${String(params.sharePercent * 100).padStart(4, '0')}`;
  const certificateDoc: ShareCertificateDoc = {
    certificateNumber,
    shareholderId: `RJ-SH-${params.userId.slice(0, 8).toUpperCase()}`,
    userId: params.userId,
    fullName: params.applicantName,
    approvedSharePercentage: params.sharePercent,
    totalAmountPaid: params.totalAmount || (params.sharePercent * 2000),
    shareUnits: params.sharePercent,
    pricePerShare: 2000,
    transactionId: params.transactionId,
    issueDate: now,
    status: 'Official Active Certificate',
    officialSeal: 'RJ WORLD BD Corporate Equity Registry',
    authorizedSignature: 'Executive Board of Directors',
    createdAt: now
  };

  try {
    // 1. Write to 'shareholders'
    await setDoc(doc(db, 'shareholders', params.userId), portfolioDoc, { merge: true });

    // 2. Write to 'share_payments'
    await setDoc(doc(db, 'share_payments', params.applicationId), paymentDoc, { merge: true });

    // 3. Write to 'shareholder_applications'
    try {
      await setDoc(doc(db, 'shareholder_applications', params.applicationId), paymentDoc, { merge: true });
    } catch (_) {}

    // 4. Write to 'shareholder_certificates'
    try {
      await setDoc(doc(db, 'shareholder_certificates', certificateNumber), certificateDoc, { merge: true });
    } catch (_) {}

    // 5. Write to 'shareholder_ledger'
    try {
      const ledgerEntry = {
        id: `LEDGER-${params.applicationId}`,
        shareholderId: `RJ-SH-${params.userId.slice(0, 8).toUpperCase()}`,
        userId: params.userId,
        sourceTransactionId: params.transactionId,
        revenueCategory: 'Share Capital Investment',
        eligibleRevenueAmount: params.totalAmount,
        applicableApprovedRate: params.sharePercent,
        calculatedAmount: params.totalAmount,
        type: 'share_purchase_credit',
        status: 'verified',
        reference: params.applicationId,
        notes: `Verified share purchase of ${params.sharePercent}% equity at ৳2,000/1% rate.`,
        timestamp: now,
        createdBy: 'automatic_verification'
      };
      await setDoc(doc(db, 'shareholder_ledger', ledgerEntry.id), ledgerEntry, { merge: true });
    } catch (_) {}

    // 6. Write notification
    try {
      const notifId = `NOTIF-${now}-${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: params.userId,
        targetUserId: params.userId,
        type: 'shareholder_activated',
        title: 'Shareholder Equity Ownership Activated',
        titleBn: 'শেয়ারহোল্ডার ইকুইটি মালিকানা সক্রিয় হয়েছে',
        message: `Congratulations! Your ${params.sharePercent}% share ownership in RJ WORLD BD has been verified and activated.`,
        messageBn: `অভিনন্দন! RJ WORLD BD-তে আপনার ${params.sharePercent}% শেয়ার মালিকানা সফলভাবে যাচাই ও সক্রিয় হয়েছে।`,
        timestamp: now,
        read: false,
        status: 'active'
      }, { merge: true });
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('[Shareholder Firestore Activation Error]:', err);
    return false;
  }
}

/**
 * Fetch official shareholder certificate from Firestore
 */
export async function getShareholderCertificateFromFirestore(userId: string): Promise<ShareCertificateDoc | null> {
  if (!userId) return null;
  try {
    const q = query(
      collection(db, 'shareholder_certificates'),
      where('userId', '==', userId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as ShareCertificateDoc;
    }
  } catch (_) {}
  return null;
}

/**
 * Fetch shareholder withdrawals from Firestore
 */
export async function getShareholderWithdrawalsFromFirestore(userId: string): Promise<ShareholderWithdrawalDoc[]> {
  if (!userId) return [];
  const list: ShareholderWithdrawalDoc[] = [];
  try {
    const q = query(
      collection(db, 'shareholder_withdrawals'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    snap.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as any) });
    });
  } catch (_) {}
  return list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
}

/**
 * Submit a shareholder benefit withdrawal request to Firestore
 */
export async function submitShareholderWithdrawalToFirestore(params: {
  userId: string;
  shareholderId: string;
  amount: number;
  paymentMethod: string;
  accountNumber: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const now = Date.now();
    const id = `WITHDRAW-SH-${now}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const withdrawalDoc: ShareholderWithdrawalDoc = {
      id,
      userId: params.userId,
      shareholderId: params.shareholderId,
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      accountNumber: params.accountNumber,
      status: 'Pending',
      requestedAt: now
    };

    await setDoc(doc(db, 'shareholder_withdrawals', id), withdrawalDoc);

    // Also mirror to global withdrawals collection
    try {
      await setDoc(doc(db, 'withdrawals', id), {
        ...withdrawalDoc,
        userType: 'shareholder',
        createdAt: now
      });
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    console.error('[Shareholder Withdrawal Error]:', err);
    return { success: false, error: err.message || 'Failed to submit withdrawal request' };
  }
}

/**
 * Fetch company eligible revenue data from Firestore
 */
export async function getEligibleCompanyRevenueFromFirestore(): Promise<ShareholderRevenueData> {
  let resellerRegistrationTotal = 0;
  let verifiedBadgeTotal = 0;
  let orderFormFeeTotal = 0;

  try {
    // 1. Reseller Registrations: count verified reseller applications or payments
    try {
      const rSnap = await getDocs(query(collection(db, 'reseller_applications'), limit(50)));
      rSnap.forEach(d => {
        const item = d.data();
        if (item.status === 'approved' || item.registrationPayment === 'completed') {
          resellerRegistrationTotal += Number(item.fee || 500);
        }
      });
    } catch (_) {}

    // 2. Verified Badges: count approved verified seller requests
    try {
      const vSnap = await getDocs(query(collection(db, 'verified_seller_requests'), limit(50)));
      vSnap.forEach(d => {
        const item = d.data();
        if (item.status === 'approved' || item.paymentStatus === 'Paid') {
          verifiedBadgeTotal += Number(item.fee || 1000);
        }
      });
    } catch (_) {}

    // 3. Order Form Fees: sum from platform_fees or confirmed orders
    try {
      const pSnap = await getDocs(query(collection(db, 'platform_fees'), limit(50)));
      pSnap.forEach(d => {
        const item = d.data();
        orderFormFeeTotal += Number(item.amount || item.fee || 0);
      });
    } catch (_) {}

    // Fallback if platform_fees is empty, count delivered orders
    if (orderFormFeeTotal === 0) {
      try {
        const oSnap = await getDocs(query(collection(db, 'orders'), limit(50)));
        oSnap.forEach(d => {
          const item = d.data();
          if (item.status === 'Delivered' || item.status === 'Confirmed') {
            orderFormFeeTotal += 20; // Nominal platform fee per order
          }
        });
      } catch (_) {}
    }
  } catch (_) {}

  return {
    resellerRegistrationTotal,
    verifiedBadgeTotal,
    orderFormFeeTotal,
    totalEligibleRevenue: resellerRegistrationTotal + verifiedBadgeTotal + orderFormFeeTotal
  };
}

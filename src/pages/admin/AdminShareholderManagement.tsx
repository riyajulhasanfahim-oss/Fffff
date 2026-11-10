import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  PieChart, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  FileText, 
  Wallet, 
  Layers, 
  Activity, 
  AlertTriangle, 
  Eye, 
  ArrowUpRight, 
  Check, 
  X, 
  Lock, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  UserX,
  FileCheck2,
  ChevronRight,
  ClipboardList,
  TrendingUp,
  Percent,
  Users,
  AlertCircle,
  Edit3,
  BadgeDollarSign,
  Calculator,
  Save,
  ArrowDown,
  ArrowUp,
  Info,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isAllowedAdminEmail } from '../../constants/adminAllowlist';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  getAllShareholderApplicationsFromFirestore, 
  getAllShareholdersFromFirestore,
  adminUpdateShareholderPaymentInFirestore,
  adminAddShareholderBalanceInFirestore,
  adminUpdateResellerFee,
  adminUpdatePlatformFee,
  getFinancialOverviewData,
  SharePaymentDoc,
  ShareholderPortfolioDoc
} from '../../services/shareholderFirestoreService';
import toast from 'react-hot-toast';

interface Metrics {
  totalApplications: number;
  pendingApplications: number;
  approvedShareholders: number;
  rejectedApplications: number;
  suspendedAccounts: number;
  totalApprovedSharePercent: number;
  totalAuthorizedSharePercent: number;
  remainingAvailableSharePercent: number;
  totalVerifiedSharePayments: number;
  totalPendingPayments: number;
  totalApprovedCommissionLiabilities: number;
  totalCommissionAlreadyPaid: number;
  pricePerPercent: number;
}

export default function AdminShareholderManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'applications' | 'shareholders' | 'financials' | 'availability' | 'commissions' | 'ledger' | 'withdrawals' | 'audit'>('applications');
  const [verifiedShareholders, setVerifiedShareholders] = useState<any[]>([]);

  // Datasets
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [commissionConfig, setCommissionConfig] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Financial Management State
  const [financialOverview, setFinancialOverview] = useState<{
    resellerVerification: { totalRevenue: number; approvedCount: number; pendingCount: number; currentFee: number };
    platformFee: { totalFee: number; paidFee: number; dueFee: number; feePerOrder: number; totalOrders: number };
  } | null>(null);
  const [editResellerFeeInput, setEditResellerFeeInput] = useState<string>('200');
  const [editPlatformFeeInput, setEditPlatformFeeInput] = useState<string>('5');
  const [savingFee, setSavingFee] = useState<boolean>(false);

  // Payment Edit System Modal
  const [editPaymentModalShareholder, setEditPaymentModalShareholder] = useState<any | null>(null);
  const [editPaymentBalance, setEditPaymentBalance] = useState<string>('0');
  const [editPaymentPaid, setEditPaymentPaid] = useState<string>('0');
  const [editPaymentEarned, setEditPaymentEarned] = useState<string>('0');
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>('');
  const [savingPayment, setSavingPayment] = useState<boolean>(false);

  // Add Balance Modal (Direct Balance Increase)
  const [addBalanceModalShareholder, setAddBalanceModalShareholder] = useState<any | null>(null);
  const [addBalanceAmountInput, setAddBalanceAmountInput] = useState<string>('');
  const [addBalanceNotesInput, setAddBalanceNotesInput] = useState<string>('');
  const [addingBalance, setAddingBalance] = useState<boolean>(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('all');
  const [shareholderStatusFilter, setShareholderStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modals & Actions
  const [selectedAppDetail, setSelectedAppDetail] = useState<any | null>(null);
  const [rejectModalApp, setRejectModalApp] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Pool availability form
  const [newAvailableShares, setNewAvailableShares] = useState<number>(40);
  const [poolUpdateNotes, setPoolUpdateNotes] = useState<string>('');

  // Withdrawal action modal
  const [payoutModalWithdrawal, setPayoutModalWithdrawal] = useState<any | null>(null);
  const [payoutReference, setPayoutReference] = useState<string>('');
  const [rejectWithdrawalModal, setRejectWithdrawalModal] = useState<any | null>(null);
  const [withdrawalRejectReason, setWithdrawalRejectReason] = useState<string>('');

  // Ledger Correction Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState<boolean>(false);
  const [correctionTargetId, setCorrectionTargetId] = useState<string>('');
  const [correctionShareholderId, setCorrectionShareholderId] = useState<string>('');
  const [correctionAmount, setCorrectionAmount] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  const fetchOverview = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      setFetchError(null);

      // =========================================================================
      // DIRECT CLOUD FIRESTORE DATA INGESTION (SINGLE SOURCE OF TRUTH)
      // Requirements 1, 2, 3, 4: Directly queries Firestore collections
      // =========================================================================
      let fetchedApps: any[] = [];
      let fetchedShareholders: any[] = [];
      let primaryFirestoreError: any = null;

      try {
        fetchedApps = await getAllShareholderApplicationsFromFirestore();
      } catch (err: any) {
        console.warn('[Firestore Service Apps Fetch]:', err);
        primaryFirestoreError = err;
      }

      try {
        fetchedShareholders = await getAllShareholdersFromFirestore();
      } catch (err: any) {
        console.warn('[Firestore Service Shareholders Fetch]:', err);
        if (!primaryFirestoreError) primaryFirestoreError = err;
      }

      // Direct Firestore queries for supporting ledger, audit logs, and configuration
      const [ledgerSnap, auditSnap, withdrawalsSnap, configSnap, commSnap] = await Promise.all([
        getDocs(collection(db, 'shareholder_ledger')).catch(() => null),
        getDocs(collection(db, 'shareholder_audit_logs')).catch(() => null),
        getDocs(collection(db, 'shareholder_withdrawals')).catch(() => null),
        getDoc(doc(db, 'system_config', 'shareholders')).catch(() => null),
        getDoc(doc(db, 'system_config', 'shareholder_commissions')).catch(() => null)
      ]);

      const ledgerList: any[] = [];
      if (ledgerSnap) {
        ledgerSnap.forEach(d => ledgerList.push({ id: d.id, ...d.data() }));
      }
      ledgerList.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));

      const auditList: any[] = [];
      if (auditSnap) {
        auditSnap.forEach(d => auditList.push({ id: d.id, ...d.data() }));
      }
      auditList.sort((a, b) => (b.timestamp || b.createdAt || 0) - (a.timestamp || a.createdAt || 0));

      const withdrawalsList: any[] = [];
      if (withdrawalsSnap) {
        withdrawalsSnap.forEach(d => withdrawalsList.push({ id: d.id, ...d.data() }));
      }
      withdrawalsList.sort((a, b) => (b.requestedAt || b.createdAt || 0) - (a.requestedAt || a.createdAt || 0));

      let totalAuthorizedPool = 40;
      if (configSnap && configSnap.exists()) {
        const c = configSnap.data();
        if (c?.availableShares) totalAuthorizedPool = Number(c.availableShares);
      }

      let commConfigData: any = null;
      if (commSnap && commSnap.exists()) {
        commConfigData = commSnap.data();
      }

      // Cross-reference to ensure all approved applications appear in verified shareholders
      const finalShareholdersMap = new Map<string, any>();
      fetchedShareholders.forEach(sh => {
        if (sh.userId) finalShareholdersMap.set(sh.userId, sh);
      });

      fetchedApps.forEach(app => {
        const st = (app.status || app.paymentStatus || '').toLowerCase();
        const isApproved = st === 'approved' || app.isShareholderActive === true;
        if (isApproved && app.userId && !finalShareholdersMap.has(app.userId)) {
          finalShareholdersMap.set(app.userId, {
            userId: app.userId,
            shareholderId: `RJ-SH-${app.userId.slice(0, 8).toUpperCase()}`,
            shareholderName: app.applicantName || app.fullName || 'Verified Shareholder',
            activeSharesPercent: Number(app.sharePercent || 1),
            portfolioValue: Number(app.totalAmount || (Number(app.sharePercent || 1) * 2000)),
            status: app.isSuspended ? 'suspended' : 'active_shareholder',
            lastVerifiedAt: app.verifiedAt || app.updatedAt || app.submissionTimestamp || Date.now(),
            createdAt: app.createdAt || app.submissionTimestamp || Date.now(),
            email: app.email || '',
            phone: app.phone || app.payerMobile || '',
            guardianName: app.guardianName || '',
            address: app.address || '',
            availableWithdrawBalance: 0,
            paidCommission: 0,
            totalEarnedCommission: 0,
            pendingCommission: 0
          });
        }
      });

      // Supplemental dynamic financial stats (reseller & platform fees)
      try {
        const finData = await getFinancialOverviewData();
        setFinancialOverview(finData);
        if (finData?.resellerVerification?.currentFee) {
          setEditResellerFeeInput(String(finData.resellerVerification.currentFee));
        }
        if (finData?.platformFee?.feePerOrder) {
          setEditPlatformFeeInput(String(finData.platformFee.feePerOrder));
        }
      } catch (fErr) {
        console.warn('Financial overview fetch notice:', fErr);
      }

      const finalShareholdersList = Array.from(finalShareholdersMap.values());
      finalShareholdersList.sort((a, b) => (b.lastVerifiedAt || b.createdAt || 0) - (a.lastVerifiedAt || a.createdAt || 0));

      // Calculate Authoritative Metrics directly from real Firestore records
      const approvedApps = fetchedApps.filter(a => (a.status || a.paymentStatus || '').toLowerCase() === 'approved' || a.isShareholderActive === true);
      const pendingApps = fetchedApps.filter(a => {
        const st = (a.status || a.paymentStatus || '').toLowerCase();
        return st.includes('pending') || (!st.includes('approved') && !st.includes('rejected'));
      });
      const rejectedApps = fetchedApps.filter(a => (a.status || a.paymentStatus || '').toLowerCase().includes('reject'));
      const suspendedCount = finalShareholdersList.filter(s => s.status === 'suspended').length;

      const totalApprovedPercent = approvedApps.reduce((acc, a) => acc + (Number(a.sharePercent) || 0), 0);
      const remainingAvailablePercent = Math.max(0, totalAuthorizedPool - totalApprovedPercent);
      const verifiedPaymentsTotal = totalApprovedPercent * 2000;
      const pendingPaymentsTotal = pendingApps.reduce((acc, a) => acc + (Number(a.totalAmount) || (Number(a.sharePercent || 1) * 2000)), 0);
      const commissionPaidTotal = withdrawalsList.filter(w => (w.status || '').toLowerCase() === 'paid').reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

      const computedMetrics: Metrics = {
        totalApplications: fetchedApps.length,
        pendingApplications: pendingApps.length,
        approvedShareholders: Math.max(finalShareholdersList.length, approvedApps.length),
        rejectedApplications: rejectedApps.length,
        suspendedAccounts: suspendedCount,
        totalApprovedSharePercent: totalApprovedPercent,
        totalAuthorizedSharePercent: totalAuthorizedPool,
        remainingAvailableSharePercent: remainingAvailablePercent,
        totalVerifiedSharePayments: verifiedPaymentsTotal,
        totalPendingPayments: pendingPaymentsTotal,
        totalApprovedCommissionLiabilities: 0,
        totalCommissionAlreadyPaid: commissionPaidTotal,
        pricePerPercent: 2000
      };

      setApplications(fetchedApps);
      setVerifiedShareholders(finalShareholdersList);
      setMetrics(computedMetrics);
      setLedgerEntries(ledgerList);
      setAuditLogs(auditList);
      setWithdrawals(withdrawalsList);
      setNewAvailableShares(totalAuthorizedPool);
      if (commConfigData) setCommissionConfig(commConfigData);

      // If Firestore failed completely and returned 0 records due to an error, record error state
      if (fetchedApps.length === 0 && primaryFirestoreError) {
        const msg = primaryFirestoreError.message || 'Permission or network issue retrieving records from Cloud Firestore.';
        setFetchError(msg);
      }

      // Supplemental background sync with server without throwing network error
      try {
        const token = await user.getIdToken().catch(() => '');
        const headers: Record<string, string> = { 'x-admin-email': user.email || '' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/shareholders/admin/overview', { headers });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success) {
            if (data.commissionConfig) setCommissionConfig(data.commissionConfig);
          }
        }
      } catch (_) {
        // Non-blocking: Firestore is authoritative
      }

    } catch (err: any) {
      console.error('Error fetching admin shareholder data from Cloud Firestore:', err);
      const msg = err.message || 'Error fetching shareholder records from Cloud Firestore.';
      setFetchError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [user]);

  // Handle Application Approval
  const handleApproveApp = async (app: any) => {
    if (!user) return;
    if (metrics && (metrics.totalApprovedSharePercent + app.sharePercent > metrics.totalAuthorizedSharePercent)) {
      toast.error(`Cannot approve: requested ${app.sharePercent}% exceeds remaining pool (${metrics.remainingAvailableSharePercent}%).`);
      return;
    }
    if (!confirm(`Are you sure you want to approve and ratify Application ${app.id} for ${app.sharePercent}% (৳${app.totalAmount?.toLocaleString()})?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');

      // Direct Firestore update as Single Source of Truth
      const targetAppId = app.applicationId || app.id;
      const targetUserId = app.userId;
      try {
        const { db } = await import('../../lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const now = Date.now();
        await Promise.allSettled([
          setDoc(doc(db, 'share_payments', targetAppId), {
            paymentStatus: 'Approved',
            status: 'approved',
            verifiedAt: now,
            verifiedBy: user.email || 'admin',
            isShareholderActive: true,
            isOfficialCertificateIssued: true,
            updatedAt: now
          }, { merge: true }),
          setDoc(doc(db, 'shareholders', targetUserId), {
            userId: targetUserId,
            shareholderName: app.applicantName,
            activeSharesPercent: app.sharePercent,
            portfolioValue: app.sharePercent * 2000,
            status: 'active_shareholder',
            lastVerifiedAt: now,
            updatedAt: now
          }, { merge: true }),
          setDoc(doc(db, 'shareholder_certificates', `RJ-CERT-${targetUserId.slice(0, 8).toUpperCase()}-${String(app.sharePercent * 100).padStart(4, '0')}`), {
            certificateNumber: `RJ-CERT-${targetUserId.slice(0, 8).toUpperCase()}-${String(app.sharePercent * 100).padStart(4, '0')}`,
            shareholderId: `RJ-SH-${targetUserId.slice(0, 8).toUpperCase()}`,
            userId: targetUserId,
            fullName: app.applicantName,
            approvedSharePercentage: app.sharePercent,
            totalAmountPaid: app.totalAmount || (app.sharePercent * 2000),
            shareUnits: app.sharePercent,
            pricePerShare: 2000,
            transactionId: app.transactionId,
            issueDate: now,
            status: 'Official Active Certificate',
            officialSeal: 'RJ WORLD BD Corporate Equity Registry',
            authorizedSignature: 'Executive Board of Directors',
            createdAt: now
          }, { merge: true })
        ]);
      } catch (fsErr) {
        console.warn('[Admin Approve Firestore Note]:', fsErr);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/verify-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicationId: app.applicationId || app.id,
          action: 'approve'
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Application approved successfully.');
        setSelectedAppDetail(null);
        fetchOverview();
      } else {
        toast.error(data.error || 'Approval failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing approval.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Application Rejection
  const handleRejectAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalApp || !rejectionReason.trim() || !user) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');

      // Direct Firestore update on rejection
      const targetAppId = rejectModalApp.applicationId || rejectModalApp.id;
      try {
        const { db } = await import('../../lib/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const now = Date.now();
        await setDoc(doc(db, 'share_payments', targetAppId), {
          paymentStatus: 'Rejected',
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          rejectedAt: now,
          rejectedBy: user.email || 'admin',
          isShareholderActive: false,
          updatedAt: now
        }, { merge: true });
      } catch (_) {}

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/verify-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicationId: rejectModalApp.applicationId || rejectModalApp.id,
          action: 'reject',
          rejectionReason: rejectionReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Application rejected.');
        setRejectModalApp(null);
        setRejectionReason('');
        setSelectedAppDetail(null);
        fetchOverview();
      } else {
        toast.error(data.error || 'Rejection failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error executing rejection.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Update Share Pool Availability (Task 3)
  const handleUpdateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/availability', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          availableShares: newAvailableShares,
          notes: poolUpdateNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Share pool updated.');
        setPoolUpdateNotes('');
        fetchOverview();
      } else {
        toast.error(data.error || 'Update failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating availability pool.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Commission Settings Save (Task 5)
  const handleSaveCommissionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commissionConfig) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/commission-settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(commissionConfig)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Commission settings saved.');
        fetchOverview();
      } else {
        toast.error(data.error || 'Failed to save settings.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving commission configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Withdrawal Payout (Task 7)
  const handleWithdrawalPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModalWithdrawal || !payoutReference.trim() || !user) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/verify-withdrawal', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: payoutModalWithdrawal.userId,
          withdrawalId: payoutModalWithdrawal.id,
          action: 'pay',
          payoutReference: payoutReference.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Withdrawal marked as paid.');
        setPayoutModalWithdrawal(null);
        setPayoutReference('');
        fetchOverview();
      } else {
        toast.error(data.error || 'Payout recording failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing payout.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Account Suspension (Task 1 & 9)
  const handleToggleSuspension = async (userId: string, isCurrentlySuspended: boolean) => {
    if (!user) return;
    const actionName = isCurrentlySuspended ? 'reactivate' : 'suspend';
    const reason = prompt(`Enter reason to ${actionName} account ${userId}:`);
    if (reason === null) return;

    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/toggle-suspension', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          suspend: !isCurrentlySuspended,
          reason
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Account ${actionName}d successfully.`);
        fetchOverview();
      } else {
        toast.error(data.error || 'Action failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error toggling suspension.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Controlled Ledger Adjustment (Task 6)
  const handleLedgerCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionShareholderId || !correctionAmount || !correctionReason.trim() || !user) return;
    try {
      setActionLoading(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': user.email || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/shareholders/admin/ledger-correction', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          shareholderId: correctionShareholderId.trim(),
          targetLedgerId: correctionTargetId.trim(),
          amount: Number(correctionAmount),
          reason: correctionReason.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Correction recorded.');
        setShowCorrectionModal(false);
        setCorrectionAmount('');
        setCorrectionReason('');
        setCorrectionTargetId('');
        setCorrectionShareholderId('');
        fetchOverview();
      } else {
        toast.error(data.error || 'Correction failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error recording correction.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Individual Shareholder Payment Edit (Requirements 1 & 2)
  const handlePaymentEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPaymentModalShareholder || !user) return;
    try {
      setSavingPayment(true);
      const targetUserId = editPaymentModalShareholder.userId;
      const availableNum = Math.max(0, Number(editPaymentBalance) || 0);
      const paidNum = Math.max(0, Number(editPaymentPaid) || 0);
      const earnedNum = Math.max(0, Number(editPaymentEarned) || 0);
      const pendingNum = Math.max(0, earnedNum - paidNum);

      // 1. Direct authoritative Cloud Firestore write
      const success = await adminUpdateShareholderPaymentInFirestore({
        userId: targetUserId,
        availableWithdrawBalance: availableNum,
        paidCommission: paidNum,
        totalEarnedCommission: earnedNum,
        pendingCommission: pendingNum,
        adminEmail: user.email || 'admin',
        notes: editPaymentNotes.trim()
      });

      // 2. Server endpoint write
      try {
        const token = await user.getIdToken().catch(() => '');
        await fetch('/api/shareholders/admin/update-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-email': user.email || '',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            userId: targetUserId,
            availableWithdrawBalance: availableNum,
            paidCommission: paidNum,
            totalEarnedCommission: earnedNum,
            notes: editPaymentNotes.trim()
          })
        });
      } catch (_) {}

      if (success) {
        toast.success(`পেমেন্ট সফলভাবে সংরক্ষিত হয়েছে! ${editPaymentModalShareholder.shareholderName}-এর বর্তমান ব্যালেন্স ৳${availableNum.toLocaleString()} নির্ধারণ করা হয়েছে।`);
        setEditPaymentModalShareholder(null);
        await fetchOverview();
      } else {
        toast.error('পেমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      console.error('Error saving shareholder payment:', err);
      toast.error(err.message || 'Error updating payment');
    } finally {
      setSavingPayment(false);
    }
  };

  // Handle Shareholder Direct Balance Add/Increase
  const handleAddBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBalanceModalShareholder || !user) return;
    const amt = Number(addBalanceAmountInput);
    if (isNaN(amt) || amt <= 0) {
      toast.error('অনুগ্রহ করে সঠিক পরিমাণ লিখুন (ন্যূনতম ১ টাকা)');
      return;
    }
    try {
      setAddingBalance(true);
      const result = await adminAddShareholderBalanceInFirestore({
        userId: addBalanceModalShareholder.userId,
        amountToAdd: amt,
        adminEmail: user.email || 'admin',
        notes: addBalanceNotesInput.trim() || 'অ্যাডমিন কর্তৃক ব্যালেন্স বৃদ্ধি'
      });
      if (result.success) {
        toast.success(`${addBalanceModalShareholder.shareholderName}-এর ব্যালেন্সে ৳${amt.toLocaleString()} সফলভাবে যোগ করা হয়েছে! নতুন ব্যালেন্স: ৳${result.newBalance.toLocaleString()}`);
        setAddBalanceModalShareholder(null);
        setAddBalanceAmountInput('');
        setAddBalanceNotesInput('');
        await fetchOverview();
      } else {
        toast.error('ব্যালেন্স যোগ করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'ব্যালেন্স আপডেট ব্যর্থ হয়েছে');
    } finally {
      setAddingBalance(false);
    }
  };

  // Handle Reseller Verification Fee Update (Requirement 3)
  const handleUpdateResellerFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const feeNum = Number(editResellerFeeInput);
    if (isNaN(feeNum) || feeNum < 0) {
      toast.error('অনুগ্রহ করে সঠিক ফি লিখুন');
      return;
    }
    try {
      setSavingFee(true);
      const ok = await adminUpdateResellerFee(feeNum, user.email || 'admin');
      if (ok) {
        toast.success(`রিসেলার ভেরিফিকেশন ফি সফলভাবে ৳${feeNum} নির্ধারণ করা হয়েছে!`);
        await fetchOverview();
      } else {
        toast.error('ফি আপডেট করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating fee');
    } finally {
      setSavingFee(false);
    }
  };

  // Handle Platform Fee Update (Requirement 4)
  const handleUpdatePlatformFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const feeNum = Number(editPlatformFeeInput);
    if (isNaN(feeNum) || feeNum < 0) {
      toast.error('অনুগ্রহ করে সঠিক ফি লিখুন');
      return;
    }
    try {
      setSavingFee(true);
      const ok = await adminUpdatePlatformFee(feeNum, user.email || 'admin');
      if (ok) {
        toast.success(`প্রতি অর্ডারে প্ল্যাটফর্ম ফি সফলভাবে ৳${feeNum} নির্ধারণ করা হয়েছে!`);
        await fetchOverview();
      } else {
        toast.error('ফি আপডেট করতে সমস্যা হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating fee');
    } finally {
      setSavingFee(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary-main animate-spin"></div>
        <p className="mt-4 text-sm text-slate-600 font-bold">Loading Corporate Shareholder Governance Hub...</p>
      </div>
    );
  }

  // Filter verified shareholders
  const filteredShareholders = verifiedShareholders.filter((sh) => {
    const q = searchTerm.toLowerCase();
    return (
      (sh.shareholderName || '').toLowerCase().includes(q) ||
      (sh.userId || '').toLowerCase().includes(q) ||
      (sh.phone || '').includes(q) ||
      (sh.email || '').toLowerCase().includes(q)
    );
  });

  // Filter applications
  const filteredApps = applications.filter((app) => {
    const matchesSearch = 
      (app.applicantName || app.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.phone || app.payerMobile || '').includes(searchTerm);

    if (!matchesSearch) return false;

    if (appStatusFilter === 'pending') {
      return app.paymentStatus === 'Pending Verification' || app.status === 'pending_verification';
    }
    if (appStatusFilter === 'approved') {
      return app.paymentStatus === 'Approved' || app.status === 'approved';
    }
    if (appStatusFilter === 'rejected') {
      return app.paymentStatus === 'Rejected' || app.status === 'rejected';
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-sky-300 border border-slate-700">
              Corporate Governance
            </span>
            <span className="text-xs font-semibold text-slate-500">
              RJ WORLD BD Authorized Executive Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Building2 className="w-8 h-8 text-primary-main" />
            <span>Shareholder Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audited share allocations, verified capital ledgers, commission configuration, and compliance governance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchOverview}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary-main' : ''}`} />
            <span>Refresh Audit Hub</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TASK 1: EXACT 11 METRICS SUMMARY BAR
      ========================================================================== */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Applications</span>
            <div className="text-xl font-black text-slate-900 mt-1">{metrics.totalApplications}</div>
            <span className="text-[10px] text-slate-500">All submitted records</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Applications</span>
            <div className="text-xl font-black text-amber-900 mt-1">{metrics.pendingApplications}</div>
            <span className="text-[10px] text-amber-700 font-semibold">Requires verification</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Approved Shareholders</span>
            <div className="text-xl font-black text-emerald-900 mt-1">{metrics.approvedShareholders}</div>
            <span className="text-[10px] text-emerald-700 font-semibold">Active equity holders</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rejected Applications</span>
            <div className="text-xl font-black text-slate-900 mt-1">{metrics.rejectedApplications}</div>
            <span className="text-[10px] text-slate-500">Ineligible or failed</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Suspended Accounts</span>
            <div className="text-xl font-black text-slate-900 mt-1">{metrics.suspendedAccounts}</div>
            <span className="text-[10px] text-slate-500">Temporary holds</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Approved Allocation</span>
            <div className="text-xl font-black text-primary-main mt-1">{metrics.totalApprovedSharePercent}%</div>
            <span className="text-[10px] text-slate-500">Remaining: <strong className="text-emerald-600">{metrics.remainingAvailableSharePercent}%</strong></span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Verified Share Payments</span>
            <div className="text-xl font-black text-slate-900 mt-1">৳{metrics.totalVerifiedSharePayments?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">Paid capital @ ৳2,000/1%</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending Payments</span>
            <div className="text-xl font-black text-amber-600 mt-1">৳{metrics.totalPendingPayments?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">Awaiting bank verification</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Commission Liabilities</span>
            <div className="text-xl font-black text-indigo-700 mt-1">৳{metrics.totalApprovedCommissionLiabilities?.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500">On approved revenues</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs col-span-2 sm:col-span-1 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Commission Already Paid Out</span>
                <div className="text-xl font-black text-emerald-600 mt-1">৳{metrics.totalCommissionAlreadyPaid?.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Authorized Pool</span>
                <span className="text-sm font-bold text-slate-800">{metrics.totalAuthorizedSharePercent}% Ceiling</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          NAVIGATION TABS
      ========================================================================== */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'applications' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          1. Share Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shareholders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'shareholders' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          2. Verified Shareholders ({verifiedShareholders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('financials')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'financials' ? 'bg-slate-900 text-white shadow-2xs ring-2 ring-primary-main/20' : 'text-slate-700 hover:text-slate-950 font-extrabold bg-white/60'
          }`}
        >
          3. 💰 Financial Hub & Fees (আর্থিক নিয়ন্ত্রণ ও ফি)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'availability' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          4. Share Availability & Price Pool
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('commissions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'commissions' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          5. Commission Sharing Agreements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          6. Auditable Financial Ledger ({ledgerEntries.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          7. Withdrawal Requests ({withdrawals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          8. Governance Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* =========================================================================
          TAB 1: SHARE APPLICATIONS & REVIEW (TASK 2 & 4)
      ========================================================================== */}
      {activeTab === 'applications' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Applicant Name, TrxID, App ID, or Phone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Filter:</span>
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAppStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    appStatusFilter === status 
                      ? 'bg-slate-900 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Firestore Error Alert for Tab 1 */}
          {fetchError && applications.length === 0 && (
            <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-rose-900">Cloud Firestore Connection / Permission Error</h4>
                  <p className="text-rose-700 mt-0.5">{fetchError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchOverview}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shrink-0 cursor-pointer"
              >
                Retry Firestore Query
              </button>
            </div>
          )}

          {/* Applications Table */}
          <div className="overflow-x-auto">
            {filteredApps.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                {fetchError ? 'Failed to retrieve applications from Cloud Firestore.' : 'No shareholder applications found matching current criteria.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Application ID</th>
                    <th className="py-3 px-4">Applicant & Contact</th>
                    <th className="py-3 px-4">Share % (Units)</th>
                    <th className="py-3 px-4">Payable Amount</th>
                    <th className="py-3 px-4">Method & TrxID</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {app.applicationId || app.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{app.applicantName || app.fullName || 'Registered Investor'}</span>
                          {app.isSuspended && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">Suspended</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {app.phone || app.payerMobile || app.email}
                        </div>
                        {app.userId && (
                          <div className="text-[10px] text-slate-400 font-mono">UID: {app.userId}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-primary-main">
                        {app.sharePercent}% ({app.shareUnits || app.sharePercent} Units)
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        ৳{app.totalAmount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{app.paymentMethod || 'MFS'}</span>
                        <span className="font-mono text-slate-500 block text-[11px]">{app.transactionId || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {app.submissionTimestamp ? new Date(app.submissionTimestamp).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.paymentStatus === 'Approved' || app.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : app.paymentStatus === 'Rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {app.paymentStatus || app.status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedAppDetail(app)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="Inspect Details & Proof"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(app.paymentStatus === 'Pending Verification' || app.status === 'pending_verification') && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveApp(app)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModalApp(app)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {app.userId && (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspension(app.userId, Boolean(app.isSuspended))}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={app.isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                            >
                              {app.isSuspended ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: VERIFIED SHAREHOLDERS REGISTRY (TASK 2 & 4)
          Requirements 1, 2, 4: Directly renders verified shareholders from Cloud Firestore
      ========================================================================== */}
      {activeTab === 'shareholders' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Shareholder Name, ID, Phone, or Email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Status:</span>
              {(['all', 'active', 'suspended'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setShareholderStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    shareholderStatusFilter === status 
                      ? 'bg-slate-900 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Firestore Error Alert for Tab 2 */}
          {fetchError && verifiedShareholders.length === 0 && (
            <div className="p-6 m-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-rose-900">Cloud Firestore Connection / Permission Error</h4>
                  <p className="text-rose-700 mt-0.5">{fetchError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchOverview}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shrink-0 cursor-pointer"
              >
                Retry Firestore Query
              </button>
            </div>
          )}

          {/* Verified Shareholders Table */}
          <div className="overflow-x-auto">
            {filteredShareholders.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                {fetchError ? 'Failed to retrieve verified shareholders from Cloud Firestore.' : 'No verified shareholders found matching current criteria.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Shareholder ID</th>
                    <th className="py-3 px-4">Shareholder & Contact</th>
                    <th className="py-3 px-4">Equity Holding</th>
                    <th className="py-3 px-4">Verified Capital</th>
                    <th className="py-3 px-4 text-emerald-800 bg-emerald-50/50">বর্তমান ব্যালেন্স</th>
                    <th className="py-3 px-4 text-indigo-800 bg-indigo-50/50">মোট অর্জিত</th>
                    <th className="py-3 px-4 text-blue-800 bg-blue-50/50">পরিশোধিত</th>
                    <th className="py-3 px-4 text-amber-800 bg-amber-50/50">বাকি টাকা</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredShareholders.map((sh) => {
                    const currentBal = Number(sh.availableWithdrawBalance ?? 0);
                    const totalEarned = Number(sh.totalEarnedCommission ?? 0);
                    const totalPaid = Number(sh.paidCommission ?? 0);
                    const remainingDue = Number(sh.pendingCommission ?? Math.max(0, totalEarned - totalPaid));

                    return (
                      <tr key={sh.userId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{sh.shareholderId || `RJ-SH-${sh.userId.slice(0, 8).toUpperCase()}`}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal block font-mono">UID: {sh.userId}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{sh.shareholderName}</div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            {sh.phone && <span>📞 {sh.phone}</span>}
                            {sh.email && <span>✉️ {sh.email}</span>}
                          </div>
                          {sh.guardianName && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              C/O: {sh.guardianName}
                            </div>
                          )}
                          {sh.address && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">
                              📍 {sh.address}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-200">
                            {sh.activeSharesPercent}%
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {sh.activeSharesPercent} Equity Unit(s)
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900">
                            ৳{sh.portfolioValue?.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            Verified Capital
                          </span>
                        </td>

                        {/* বর্তমান ব্যালেন্স */}
                        <td className="py-3.5 px-4 bg-emerald-50/30">
                          <div className="font-black text-emerald-700 text-sm">
                            ৳{currentBal.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium block">
                            তোলার যোগ্য ব্যালেন্স
                          </span>
                        </td>

                        {/* মোট অর্জিত লভ্যাংশ */}
                        <td className="py-3.5 px-4 bg-indigo-50/30">
                          <div className="font-bold text-indigo-900">
                            ৳{totalEarned.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-indigo-600 block">
                            মোট লাভ / প্রাপ্তি
                          </span>
                        </td>

                        {/* পরিশোধিত অর্থ */}
                        <td className="py-3.5 px-4 bg-blue-50/30">
                          <div className="font-bold text-blue-900">
                            ৳{totalPaid.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-blue-600 block">
                            কোম্পানি পরিশোধ করেছে
                          </span>
                        </td>

                        {/* বাকি টাকা */}
                        <td className="py-3.5 px-4 bg-amber-50/30">
                          <div className={`font-black ${remainingDue > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                            ৳{remainingDue.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-amber-600 block">
                            {remainingDue > 0 ? 'বকেয়া লভ্যাংশ' : 'কোনো বাকি নেই'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {sh.status === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* ব্যালেন্স সরাসরি বৃদ্ধি / যোগ বাটন */}
                            <button
                              type="button"
                              onClick={() => {
                                setAddBalanceModalShareholder(sh);
                                setAddBalanceAmountInput('');
                                setAddBalanceNotesInput('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                              title="শেয়ারহোল্ডারের অ্যাকাউন্টে ব্যালেন্স যোগ / বৃদ্ধি করুন"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>+ ব্যালেন্স যোগ</span>
                            </button>

                            {/* পেমেন্ট এডিট বাটন (Payment Edit Button) */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditPaymentModalShareholder(sh);
                                setEditPaymentBalance(String(sh.availableWithdrawBalance ?? 0));
                                setEditPaymentPaid(String(sh.paidCommission ?? 0));
                                setEditPaymentEarned(String(sh.totalEarnedCommission ?? 0));
                                setEditPaymentNotes(sh.lastUpdateNotes || '');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                              title="পেমেন্টের পরিমাণ এডিট করুন"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>পেমেন্ট এডিট</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const matchingApp = applications.find(a => a.userId === sh.userId);
                                setSelectedAppDetail(matchingApp || {
                                  applicationId: sh.shareholderId,
                                  id: sh.shareholderId,
                                  userId: sh.userId,
                                  applicantName: sh.shareholderName,
                                  phone: sh.phone,
                                  email: sh.email,
                                  guardianName: sh.guardianName,
                                  address: sh.address,
                                  sharePercent: sh.activeSharesPercent,
                                  shareUnits: sh.activeSharesPercent,
                                  totalAmount: sh.portfolioValue,
                                  paymentStatus: 'Approved',
                                  status: 'approved',
                                  paymentMethod: 'Bank / MFS Verified',
                                  transactionId: 'VERIFIED-LEDGER-RATIFIED',
                                  submissionTimestamp: sh.lastVerifiedAt,
                                  isShareholderActive: sh.status !== 'suspended'
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="View Full Profile & Verification Details"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSuspension(sh.userId, sh.status === 'suspended')}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                sh.status === 'suspended'
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700'
                              }`}
                              title={sh.status === 'suspended' ? 'Reactivate Shareholder' : 'Suspend Shareholder'}
                            >
                              {sh.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: FINANCIAL HUB & FEES MANAGEMENT (REQUIREMENTS 3, 4, 5)
      ========================================================================== */}
      {activeTab === 'financials' && (
        <div className="space-y-8">
          {/* Header & Description */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold mb-3">
                <BadgeDollarSign className="w-3.5 h-3.5" />
                <span>Executive Financial Governance & Dynamic Fees</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black">
                আর্থিক ব্যবস্থাপনা ও ফি নিয়ন্ত্রণ হাব
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                রিসেলার ভেরিফিকেশন ফি, প্ল্যাটফর্ম ফি এবং শেয়ারহোল্ডারদের পরিশোধিত অর্থ ও অবশিষ্ট ব্যালেন্সের সমন্বিত হিসাব। এখান থেকে অ্যাডমিন যেকোনো ফি পরিবর্তন করতে পারেন এবং পুরো কোম্পানির আর্থিক চিত্র নিয়ন্ত্রণ করতে পারেন।
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
              <Coins className="w-80 h-80 text-white" />
            </div>
          </div>

          {/* 6 Integrated Financial Summary Cards (Requirement 5) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Shareholder Verified Capital */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-primary-main" />
                <span>শেয়ার মূলধন</span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-1.5">
                ৳{(metrics?.totalVerifiedSharePayments || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                অনুমোদিত {metrics?.approvedShareholders || 0} শেয়ারহোল্ডার
              </span>
            </div>

            {/* 2. Reseller Verification Revenue */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>রিসেলার ভেরিফিকেশন</span>
              </div>
              <div className="text-xl font-black text-indigo-950 mt-1.5">
                ৳{(financialOverview?.resellerVerification.totalRevenue || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-indigo-700 font-semibold block mt-0.5">
                ভেরিফাইড: {financialOverview?.resellerVerification.approvedCount || 0} জন
              </span>
            </div>

            {/* 3. Platform Fee Revenue */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>প্ল্যাটফর্ম ফি আয়</span>
              </div>
              <div className="text-xl font-black text-emerald-950 mt-1.5">
                ৳{(financialOverview?.platformFee.totalFee || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                {financialOverview?.platformFee.totalOrders || 0} টি সফল অর্ডার
              </span>
            </div>

            {/* 4. Total Company Revenue Inflows */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-2xs">
              <div className="flex items-center gap-1.5 text-sky-300 text-[10px] font-bold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>মোট কোম্পানি ইন-ফ্লো</span>
              </div>
              <div className="text-xl font-black text-white mt-1.5">
                ৳{(
                  (metrics?.totalVerifiedSharePayments || 0) +
                  (financialOverview?.resellerVerification.totalRevenue || 0) +
                  (financialOverview?.platformFee.totalFee || 0)
                ).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-300 block mt-0.5">
                সার্বমোট রাজস্ব ও ক্যাপিটাল
              </span>
            </div>

            {/* 5. Total Shareholder Commissions Paid */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                <span>মোট লভ্যাংশ পরিশোধ</span>
              </div>
              <div className="text-xl font-black text-blue-950 mt-1.5">
                ৳{verifiedShareholders.reduce((sum, sh) => sum + Number(sh.paidCommission || 0), 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-blue-700 font-semibold block mt-0.5">
                শেয়ারহোল্ডারদের দেয়া হয়েছে
              </span>
            </div>

            {/* 6. Remaining Balance / Liabilities */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                <span>বর্তমান ব্যালেন্স/বাকি</span>
              </div>
              <div className="text-xl font-black text-amber-900 mt-1.5">
                ৳{verifiedShareholders.reduce((sum, sh) => sum + Number(sh.availableWithdrawBalance || 0), 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                তোলার যোগ্য অবশিষ্টাংশ
              </span>
            </div>
          </div>

          {/* Dynamic Fee Configuration Cards (Requirements 3 & 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Reseller Verification Fee (Requirement 3) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-black">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        রিসেলার ভেরিফিকেশন ফি নিয়ন্ত্রণ
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Reseller Registration & Verification Fee Hub
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                    বর্তমান ফি: ৳{financialOverview?.resellerVerification.currentFee || 200}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 my-5 text-center">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">মোট সংগৃহীত ফি</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">
                      ৳{(financialOverview?.resellerVerification.totalRevenue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block">অনুমোদিত রিসেলার</span>
                    <span className="text-base font-black text-emerald-900 mt-0.5 block">
                      {financialOverview?.resellerVerification.approvedCount || 0} জন
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <span className="text-[10px] text-amber-700 font-bold block">অপেক্ষমাণ আবেদন</span>
                    <span className="text-base font-black text-amber-900 mt-0.5 block">
                      {financialOverview?.resellerVerification.pendingCount || 0} জন
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  অ্যাডমিন এখান থেকে প্রয়োজন অনুযায়ী রিসেলার ভেরিফিকেশন ফি বাড়াতে বা কমাতে পারেন। নির্ধারিত ফি সরাসরি রেজিস্ট্রেশন পেজে প্রদর্শিত হবে।
                </p>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleUpdateResellerFeeSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  নতুন রিসেলার ভেরিফিকেশন ফি নির্ধারণ করুন (৳ BDT)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editResellerFeeInput}
                      onChange={(e) => setEditResellerFeeInput(e.target.value)}
                      placeholder="e.g. 200"
                      required
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingFee}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingFee ? 'সংরক্ষণ হচ্ছে...' : 'ফি আপডেট করুন'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Card 2: Platform Fee (Requirement 4) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-base">
                        প্ল্যাটফর্ম ফি নিয়ন্ত্রণ ও অর্ডার হিসাব
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Platform Fee Governance & Vendor Accounting
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    প্রতি অর্ডার: ৳{financialOverview?.platformFee.feePerOrder || 5}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 my-5 text-center">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] text-slate-500 font-bold block">মোট প্ল্যাটফর্ম ফি</span>
                    <span className="text-base font-black text-slate-900 mt-0.5 block">
                      ৳{(financialOverview?.platformFee.totalFee || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 font-bold block">পরিশোধিত/জমা</span>
                    <span className="text-base font-black text-emerald-900 mt-0.5 block">
                      ৳{(financialOverview?.platformFee.paidFee || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
                    <span className="text-[10px] text-amber-700 font-bold block">বকেয়া প্ল্যাটফর্ম ফি</span>
                    <span className="text-base font-black text-amber-900 mt-0.5 block">
                      ৳{(financialOverview?.platformFee.dueFee || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  অর্ডারে প্রযোজ্য প্ল্যাটফর্ম ফি যেকোনো সময় সমন্বয় করতে পারবেন। সফলভাবে ডেলিভারকৃত মোট অর্ডারের সংখ্যার ভিত্তিতে এই ফি গণনা করা হয়।
                </p>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleUpdatePlatformFeeSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  প্রতি সফল ডেলিভারিতে প্ল্যাটফর্ম ফি (৳ BDT)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editPlatformFeeInput}
                      onChange={(e) => setEditPlatformFeeInput(e.target.value)}
                      placeholder="e.g. 5"
                      required
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingFee}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingFee ? 'সংরক্ষণ হচ্ছে...' : 'ফি আপডেট করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Complete Financial Overview Table (Requirement 5) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-black text-slate-900 mb-1 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <span>সার্বিক আর্থিক চিত্র ও খাতভিত্তিক বিবরণী (Unified Financial Audit)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              শেয়ারহোল্ডার পেমেন্ট, রিসেলার ভেরিফিকেশন এবং প্ল্যাটফর্ম ফির একক সমন্বিত ব্যালেন্স শিট
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">খাত (Sector)</th>
                    <th className="py-3 px-4">মোট সংগৃহীত / আয় (Inflow)</th>
                    <th className="py-3 px-4">পরিশোধিত / বিতরণকৃত (Outflow)</th>
                    <th className="py-3 px-4">অবশিষ্ট স্থিতি / বকেয়া (Balance / Due)</th>
                    <th className="py-3 px-4 text-right">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary-main" />
                      <span>শেয়ারহোল্ডার ইকুইটি ও লভ্যাংশ</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ৳{(metrics?.totalVerifiedSharePayments || 0).toLocaleString()} (মূলধন)
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-700">
                      ৳{verifiedShareholders.reduce((s, sh) => s + Number(sh.paidCommission || 0), 0).toLocaleString()} (পরিশোধিত)
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-700">
                      ৳{verifiedShareholders.reduce((s, sh) => s + Number(sh.availableWithdrawBalance || 0), 0).toLocaleString()} (ব্যালেন্স)
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        সক্রিয় ও নিরীক্ষিত
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>রিসেলার ভেরিফিকেশন ফি</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ৳{(financialOverview?.resellerVerification.totalRevenue || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      ৳০ (১০০% আয় সংরক্ষিত)
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ৳{(financialOverview?.resellerVerification.totalRevenue || 0).toLocaleString()} (জমা তহবিল)
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {financialOverview?.resellerVerification.approvedCount || 0} জন অনুমোদিত
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <span>অর্ডার প্ল্যাটফর্ম ফি</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">
                      ৳{(financialOverview?.platformFee.totalFee || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      ৳{(financialOverview?.platformFee.paidFee || 0).toLocaleString()} (পরিশোধিত)
                    </td>
                    <td className="py-3.5 px-4 font-bold text-amber-700">
                      ৳{(financialOverview?.platformFee.dueFee || 0).toLocaleString()} (বকেয়া ফি)
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {financialOverview?.platformFee.totalOrders || 0} ডেলিভারি
                      </span>
                    </td>
                  </tr>

                  {/* Summary Totals Row */}
                  <tr className="bg-slate-50/80 font-black text-slate-900 border-t-2 border-slate-200">
                    <td className="py-4 px-4 text-sm uppercase tracking-wider text-slate-900">
                      সর্বমোট আর্থিক সারসংক্ষেপ (Grand Total)
                    </td>
                    <td className="py-4 px-4 text-sm text-emerald-800 font-black">
                      ৳{(
                        (metrics?.totalVerifiedSharePayments || 0) +
                        (financialOverview?.resellerVerification.totalRevenue || 0) +
                        (financialOverview?.platformFee.totalFee || 0)
                      ).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-blue-800 font-black">
                      ৳{verifiedShareholders.reduce((s, sh) => s + Number(sh.paidCommission || 0), 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-sm text-amber-800 font-black">
                      ৳{(
                        verifiedShareholders.reduce((s, sh) => s + Number(sh.availableWithdrawBalance || 0), 0) +
                        (financialOverview?.platformFee.dueFee || 0)
                      ).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-900 text-white">
                        RJ WORLD BD
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SHARE AVAILABILITY & PRICE POOL (TASK 3)
      ========================================================================== */}
      {activeTab === 'availability' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Percent className="w-5 h-5 text-primary-main" />
                <span>Authorized Share Pool Settings</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure corporate legal equity parameters. Validated strictly on the trusted backend to prevent over-allocation.
              </p>
            </div>

            <form onSubmit={handleUpdateAvailability} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Total Legally Authorized Share Quantity (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={metrics.totalApprovedSharePercent}
                    max="100"
                    value={newAvailableShares}
                    onChange={(e) => setNewAvailableShares(Number(e.target.value))}
                    required
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-main"
                  />
                  <span className="text-xs text-slate-500">
                    Min allowable: <strong>{metrics.totalApprovedSharePercent}%</strong> (current approved)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Board Resolution / Update Notes
                </label>
                <textarea
                  value={poolUpdateNotes}
                  onChange={(e) => setPoolUpdateNotes(e.target.value)}
                  placeholder="Record board meeting or corporate resolution notes authorizing this equity quota change..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading || newAvailableShares < metrics.totalApprovedSharePercent}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Updating Pool...' : 'Save Authorized Share Pool'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-700" />
              <span>Fixed Nominal Pricing & Allocation Audit</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Nominal Rate</span>
                <div className="text-2xl font-black text-slate-900 mt-1">৳2,000 / 1% Share</div>
                <p className="text-[11px] text-slate-500 mt-0.5">Fixed nominal pricing. Never changes silently without regulatory notification.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total Authorized Pool:</span>
                  <strong className="text-slate-900">{metrics.totalAuthorizedSharePercent}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Verified Allocated:</span>
                  <strong className="text-primary-main">{metrics.totalApprovedSharePercent}%</strong>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-bold">Remaining Available Pool:</span>
                  <strong className="text-emerald-600 text-sm">{metrics.remainingAvailableSharePercent}%</strong>
                </div>
              </div>

              {/* Progress visual */}
              <div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div 
                    className="bg-primary-main h-full"
                    style={{ width: `${Math.min(100, (metrics.totalApprovedSharePercent / (metrics.totalAuthorizedSharePercent || 1)) * 100)}%` }}
                    title={`Allocated: ${metrics.totalApprovedSharePercent}%`}
                  ></div>
                  <div 
                    className="bg-emerald-400 h-full"
                    style={{ width: `${Math.max(0, 100 - (metrics.totalApprovedSharePercent / (metrics.totalAuthorizedSharePercent || 1)) * 100)}%` }}
                    title={`Remaining: ${metrics.remainingAvailableSharePercent}%`}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Allocated ({metrics.totalApprovedSharePercent}%)</span>
                  <span>Available ({metrics.remainingAvailableSharePercent}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: COMMISSION SHARING SETTINGS (TASK 5)
      ========================================================================== */}
      {activeTab === 'commissions' && commissionConfig && (
        <form onSubmit={handleSaveCommissionConfig} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-main" />
                <span>Corporate Revenue Commission Configurations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Specify contractual sharing terms and monthly payout ceilings for each corporate channel.
              </p>
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
            >
              {actionLoading ? 'Saving...' : 'Save Commission Agreements'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category 1: Reseller Registration */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">1. Reseller Registration</span>
                <input
                  type="checkbox"
                  checked={commissionConfig.resellerRegistration?.enabled}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    resellerRegistration: { ...commissionConfig.resellerRegistration, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-primary-main focus:ring-primary-main cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Commission Entitlement Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionConfig.resellerRegistration?.ratePercent || 100}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    resellerRegistration: { ...commissionConfig.resellerRegistration, ratePercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
                <span className="text-[10px] text-slate-400">100% = Full shareholder pro-rata stake applied</span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Contractual Agreement Terms</label>
                <textarea
                  value={commissionConfig.resellerRegistration?.agreementTerms || ''}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    resellerRegistration: { ...commissionConfig.resellerRegistration, agreementTerms: e.target.value }
                  })}
                  rows={3}
                  required
                  placeholder="Record agreed legal contract terms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Category 2: Verified Badge Fees */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">2. Verified Badge Fees</span>
                <input
                  type="checkbox"
                  checked={commissionConfig.verifiedBadge?.enabled}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    verifiedBadge: { ...commissionConfig.verifiedBadge, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-primary-main focus:ring-primary-main cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Commission Entitlement Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionConfig.verifiedBadge?.ratePercent || 100}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    verifiedBadge: { ...commissionConfig.verifiedBadge, ratePercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Contractual Agreement Terms</label>
                <textarea
                  value={commissionConfig.verifiedBadge?.agreementTerms || ''}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    verifiedBadge: { ...commissionConfig.verifiedBadge, agreementTerms: e.target.value }
                  })}
                  rows={3}
                  required
                  placeholder="Record agreed legal contract terms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Category 3: Order Form Fees */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">3. Order Form Fees</span>
                <input
                  type="checkbox"
                  checked={commissionConfig.orderFormFee?.enabled}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    orderFormFee: { ...commissionConfig.orderFormFee, enabled: e.target.checked }
                  })}
                  className="w-4 h-4 rounded text-primary-main focus:ring-primary-main cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Commission Entitlement Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionConfig.orderFormFee?.ratePercent || 100}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    orderFormFee: { ...commissionConfig.orderFormFee, ratePercent: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 font-bold mb-1">Contractual Agreement Terms</label>
                <textarea
                  value={commissionConfig.orderFormFee?.agreementTerms || ''}
                  onChange={(e) => setCommissionConfig({
                    ...commissionConfig,
                    orderFormFee: { ...commissionConfig.orderFormFee, agreementTerms: e.target.value }
                  })}
                  rows={3}
                  required
                  placeholder="Record agreed legal contract terms..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 4: AUDITABLE FINANCIAL LEDGER (TASK 6)
      ========================================================================== */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary-main" />
                <span>Auditable Financial Ledger</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable, append-only corporate financial ledger. Historical entries cannot be altered directly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCorrectionModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>+ Record Controlled Adjustment</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            {ledgerEntries.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No ledger entries registered yet. Approved share capital contributions and payouts will appear here.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Ledger ID</th>
                    <th className="py-3 px-4">Shareholder ID</th>
                    <th className="py-3 px-4">Category & Source Trx</th>
                    <th className="py-3 px-4">Base Amount</th>
                    <th className="py-3 px-4">Calculated Amount</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledgerEntries.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{l.id}</td>
                      <td className="py-3 px-4 text-slate-700 font-bold">{l.shareholderId}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-800">{l.revenueCategory}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{l.sourceTransactionId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">৳{l.eligibleRevenueAmount?.toLocaleString()}</td>
                      <td className={`py-3 px-4 font-black ${Number(l.calculatedAmount) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ৳{l.calculatedAmount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {l.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: WITHDRAWAL REQUEST MANAGEMENT (TASK 7)
      ========================================================================== */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary-main" />
              <span>Shareholder Withdrawal Requests</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify available payable balances and record official payment references before marking as paid.
            </p>
          </div>

          <div className="overflow-x-auto">
            {withdrawals.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No shareholder withdrawal requests found.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Withdrawal ID</th>
                    <th className="py-3 px-4">Shareholder ID</th>
                    <th className="py-3 px-4">Method & Account</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4">Status & Reference</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{w.id}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-bold">{w.shareholderId}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{w.paymentMethod}</span>
                        <span className="font-mono text-slate-500 block text-[11px]">{w.accountNumber}</span>
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900">৳{w.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : w.status === 'rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {w.status}
                        </span>
                        {w.payoutReference && (
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5">Ref: {w.payoutReference}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {w.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPayoutModalWithdrawal(w)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectWithdrawalModal(w)}
                              className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: GOVERNANCE AUDIT LOGS (TASK 9)
      ========================================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-main" />
              <span>Immutable Governance Audit Logs</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological audit log recording every executive shareholder ratification, rejection, allocation, and setting change.
            </p>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No administrative audit entries recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Audit ID</th>
                    <th className="py-3 px-4">Admin Email</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Affected Record</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{log.id}</td>
                      <td className="py-3 px-4 text-slate-700 font-sans font-bold">{log.adminEmail}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-sky-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{log.affectedRecordId}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate" title={JSON.stringify(log.details)}>
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          APPLICATION DETAILS & SCREENSHOT INSPECTION MODAL
      ========================================================================== */}
      {selectedAppDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Application & Payment Proof</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedAppDetail.applicationId || selectedAppDetail.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppDetail(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">User UID</span>
                  <div className="font-mono text-slate-700 text-xs mt-0.5 font-bold">{selectedAppDetail.userId || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Applicant Name</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedAppDetail.applicantName || selectedAppDetail.fullName}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Guardian Name</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {selectedAppDetail.guardianName || 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone & Email</span>
                  <div className="text-slate-700 mt-0.5">
                    {selectedAppDetail.phone} • {selectedAppDetail.email}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Address</span>
                  <div className="text-slate-700 mt-0.5">
                    {selectedAppDetail.address || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Shares Requested</span>
                  <div className="text-lg font-black text-primary-main mt-0.5">{selectedAppDetail.sharePercent}%</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Amount Payable</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">৳{selectedAppDetail.totalAmount?.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
                  <div className="text-xs font-bold text-slate-800 mt-1">{selectedAppDetail.paymentStatus || selectedAppDetail.status}</div>
                </div>
              </div>

              {/* Payment Proof / TrxID */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">MFS Channel:</span>
                  <span className="font-bold text-slate-900">{selectedAppDetail.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Transaction ID:</span>
                  <span className="font-mono font-bold text-primary-main">{selectedAppDetail.transactionId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">Payer Mobile:</span>
                  <span className="font-mono text-slate-800">{selectedAppDetail.payerMobile}</span>
                </div>

                {selectedAppDetail.screenshotUrl && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Uploaded Screenshot Proof</span>
                    <a
                      href={selectedAppDetail.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-xl overflow-hidden border border-slate-300 max-h-56"
                    >
                      <img
                        src={selectedAppDetail.screenshotUrl}
                        alt="Payment Proof"
                        className="object-contain max-h-56 w-auto"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Actions in Modal */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedAppDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close
              </button>

              {(selectedAppDetail.paymentStatus === 'Pending Verification' || selectedAppDetail.status === 'pending_verification') && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalApp(selectedAppDetail);
                      setSelectedAppDetail(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs"
                  >
                    Reject Application
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveApp(selectedAppDetail)}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                  >
                    Approve & Ratify
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT APPLICATION MODAL */}
      {rejectModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">Reject Share Application</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{rejectModalApp.applicationId || rejectModalApp.id}</p>

            <form onSubmit={handleRejectAppSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rejection Reason (Required)</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found in bank records, mismatched deposit amount..."
                  rows={3}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalApp(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL PAYOUT REFERENCE MODAL */}
      {payoutModalWithdrawal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">Disburse Commission Withdrawal</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Pay <strong>৳{payoutModalWithdrawal.amount?.toLocaleString()}</strong> to {payoutModalWithdrawal.paymentMethod} ({payoutModalWithdrawal.accountNumber})
            </p>

            <form onSubmit={handleWithdrawalPayoutSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Disbursement Transaction Reference (TrxID)
                </label>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={(e) => setPayoutReference(e.target.value)}
                  placeholder="e.g. bKash TrxID or Bank Transfer Ref"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPayoutModalWithdrawal(null);
                    setPayoutReference('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !payoutReference.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  Confirm & Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTROLLED LEDGER CORRECTION MODAL (TASK 6) */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base mb-1">Record Controlled Ledger Adjustment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Controlled audit correction. Never deletes historical data; appends an adjustment entry.
            </p>

            <form onSubmit={handleLedgerCorrectionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Shareholder ID</label>
                <input
                  type="text"
                  value={correctionShareholderId}
                  onChange={(e) => setCorrectionShareholderId(e.target.value)}
                  placeholder="e.g. RJ-SH-XXXXXX"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Target Entry ID (Optional)</label>
                <input
                  type="text"
                  value={correctionTargetId}
                  onChange={(e) => setCorrectionTargetId(e.target.value)}
                  placeholder="e.g. LEDGER-..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Adjustment Amount (৳ BDT - use negative to deduct)</label>
                <input
                  type="number"
                  value={correctionAmount}
                  onChange={(e) => setCorrectionAmount(e.target.value)}
                  placeholder="e.g. -500 or 500"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Audit Justification Reason</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Detailed justification for the audit adjustment..."
                  rows={3}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md"
                >
                  Record Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
          SHAREHOLDER PAYMENT EDIT MODAL (REQUIREMENTS 1 & 2)
      ========================================================================== */}
      {editPaymentModalShareholder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <BadgeDollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">
                    শেয়ারহোল্ডার পেমেন্ট ও ব্যালেন্স এডিট
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shareholder Payment Management & Direct Dashboard Sync
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditPaymentModalShareholder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shareholder Info Card */}
            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {editPaymentModalShareholder.shareholderName}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ID: {editPaymentModalShareholder.shareholderId || editPaymentModalShareholder.userId}
                  </div>
                  {editPaymentModalShareholder.phone && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      📞 {editPaymentModalShareholder.phone}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-800">
                    {editPaymentModalShareholder.activeSharesPercent}% শেয়ার
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    মূলধন: ৳{editPaymentModalShareholder.portfolioValue?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Notice */}
            <div className="mb-4 p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                অ্যাডমিন এখানে যে পরিমাণ টাকা নির্ধারণ করে Save করবেন, ঠিক সেই পরিমাণ টাকা এই শেয়ারহোল্ডারের ড্যাশবোর্ডে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে। প্রত্যেকের হিসাব আলাদা ও সুরক্ষিত থাকবে।
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handlePaymentEditSubmit} className="space-y-4 text-xs">
              {/* Field 1: Current Available Balance */}
              <div>
                <label className="block text-slate-800 font-bold mb-1 flex items-center justify-between">
                  <span>১. বর্তমান ব্যালেন্স (তোলার যোগ্য ব্যালেন্স) [৳ BDT]</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Dashboard এ দেখাবে</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editPaymentBalance}
                    onChange={(e) => setEditPaymentBalance(e.target.value)}
                    required
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  এই টাকা শেয়ারহোল্ডার তার ড্যাশবোর্ডে "বর্তমান তোলার যোগ্য ব্যালেন্স" হিসেবে দেখতে পারবেন।
                </p>
              </div>

              {/* Field 2 & 3: Total Earned & Total Paid in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    ২. মোট প্রাপ্তি / অর্জিত লভ্যাংশ [৳]
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editPaymentEarned}
                      onChange={(e) => setEditPaymentEarned(e.target.value)}
                      required
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">মোট কত টাকা লাভ পেয়েছে</span>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    ৩. পরিশোধিত অর্থ (Paid Out) [৳]
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editPaymentPaid}
                      onChange={(e) => setEditPaymentPaid(e.target.value)}
                      required
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">মোট কত টাকা পেমেন্ট করা হয়েছে</span>
                </div>
              </div>

              {/* Calculated Due Display */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    স্বয়ংক্রিয় বাকি হিসাব (Remaining Due)
                  </span>
                  <span className="text-xs text-amber-900">
                    (মোট প্রাপ্তি − মোট পরিশোধিত অর্থ)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-amber-900">
                    ৳{Math.max(0, (Number(editPaymentEarned) || 0) - (Number(editPaymentPaid) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  দ্রুত ব্যালেন্স পরিবর্তন শর্টকাট:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditPaymentBalance(String((Number(editPaymentBalance) || 0) + 1000))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors"
                  >
                    +১,০০০ ৳
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentBalance(String((Number(editPaymentBalance) || 0) + 5000))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors"
                  >
                    +৫,০০০ ৳
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPaymentBalance(String((Number(editPaymentBalance) || 0) + 10000))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-colors"
                  >
                    +১০,০০০ ৳
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const earned = Number(editPaymentEarned) || 0;
                      setEditPaymentPaid(String(earned));
                      setEditPaymentBalance('0');
                    }}
                    className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-[10px] transition-colors"
                  >
                    বকেয়া সম্পূর্ণ পরিশোধ করুন (Clear Due)
                  </button>
                </div>
              </div>

              {/* Field 4: Admin Notes */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  ৪. পেমেন্ট নোট / রেফারেন্স (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  placeholder="যেমন: মার্চ মাসের লভ্যাংশ সমন্বয় অথবা ব্যাংক রেফারেন্স..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-main"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditPaymentModalShareholder(null)}
                  disabled={savingPayment}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingPayment ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD BALANCE MODAL (Requirement 3: Admin Direct Balance Add/Increase)
      ========================================================================== */}
      {addBalanceModalShareholder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-700 to-emerald-800 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    ব্যালেন্স যোগ / বৃদ্ধি করুন
                  </h3>
                  <p className="text-xs text-teal-100">
                    শেয়ারহোল্ডারের অ্যাকাউন্টে সরাসরি ব্যালেন্স যুক্ত করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddBalanceModalShareholder(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddBalanceSubmit} className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
              {/* Shareholder Info Badge */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    শেয়ারহোল্ডার
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {addBalanceModalShareholder.shareholderName}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 block">
                    ID: {addBalanceModalShareholder.shareholderId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    বর্তমান ব্যালেন্স
                  </span>
                  <span className="font-black text-emerald-700 text-base">
                    ৳{Number(addBalanceModalShareholder.availableWithdrawBalance || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  দ্রুত অ্যামাউন্ট নির্বাচন:
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[500, 1000, 2000, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAddBalanceAmountInput(String(preset))}
                      className={`py-1.5 px-1 rounded-lg text-center font-bold text-[11px] border transition-colors cursor-pointer ${
                        addBalanceAmountInput === String(preset)
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      +৳{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount to Add */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  যোগ করার পরিমাণ (টাকায়) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={addBalanceAmountInput}
                    onChange={(e) => setAddBalanceAmountInput(e.target.value)}
                    placeholder="যেমন: 5000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 text-base"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                    নতুন সমন্বিত ব্যালেন্স হবে
                  </span>
                  <span className="text-xs text-teal-700">
                    (বর্তমান ৳{(addBalanceModalShareholder.availableWithdrawBalance || 0).toLocaleString()} + বৃদ্ধি ৳{(Number(addBalanceAmountInput) || 0).toLocaleString()})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-emerald-800">
                    ৳{((Number(addBalanceModalShareholder.availableWithdrawBalance) || 0) + (Number(addBalanceAmountInput) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  বিবরণ / রেফারেন্স নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={addBalanceNotesInput}
                  onChange={(e) => setAddBalanceNotesInput(e.target.value)}
                  placeholder="যেমন: মাসিক কোম্পানি লভ্যাংশ বরাদ্দ, বোনাস ইত্যাদি..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddBalanceModalShareholder(null)}
                  disabled={addingBalance}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={addingBalance || !addBalanceAmountInput || Number(addBalanceAmountInput) <= 0}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{addingBalance ? 'যুক্ত হচ্ছে...' : 'ব্যালেন্স যুক্ত করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

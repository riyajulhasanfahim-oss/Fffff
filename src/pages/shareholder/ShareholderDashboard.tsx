import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
import { rtdbGet } from '../../lib/rtdb';
import { db } from '../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  getShareholderPortfolioFromFirestore,
  getShareholderPaymentsFromFirestore,
  getShareholderCertificateFromFirestore,
  getShareholderWithdrawalsFromFirestore,
  getEligibleCompanyRevenueFromFirestore,
  submitShareholderWithdrawalToFirestore
} from '../../services/shareholderFirestoreService';
import OfficialShareCertificateModal, { CertificateData } from '../../components/shareholder/OfficialShareCertificateModal';
import PaymentMethodSelectionModal from '../../components/checkout/PaymentMethodSelectionModal';
import BkashPaymentModal from '../../components/checkout/BkashPaymentModal';
import NagadPaymentModal from '../../components/checkout/NagadPaymentModal';
import RocketPaymentModal from '../../components/checkout/RocketPaymentModal';
import UpayPaymentModal from '../../components/checkout/UpayPaymentModal';
import { verifyPaymentAutomatic, type VerificationResult } from '../../services/automaticPaymentVerificationService';
import { 
  Building2, 
  PieChart, 
  Coins, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  ArrowLeft,
  Plus, 
  Minus,
  X,
  FileCheck2, 
  UserCheck, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Download,
  Award,
  Layers,
  Calendar,
  DollarSign,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Lock,
  Printer,
  ChevronDown,
  Bell,
  SlidersHorizontal,
  History,
  Send,
  AlertTriangle,
  Info,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export type DashboardNavTab = 
  | 'overview' 
  | 'shares' 
  | 'certificate' 
  | 'revenue' 
  | 'transactions' 
  | 'withdrawals' 
  | 'notifications' 
  | 'profile';

interface SummaryData {
  shareholderId: string;
  shareholderStatus: string;
  approvedSharePercentage: number;
  totalAmountPaidForApprovedShares: number;
  totalEligibleRevenue: number;
  totalEarnedCommission: number;
  pendingCommission: number;
  approvedCommission: number;
  paidCommission: number;
  availableWithdrawBalance: number;
}

interface RevenueSource {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  totalEligibleRevenue: number;
  approvedCommissionPercentage: number;
  calculatedCommission: number;
  pendingCommission: number;
  paidCommission: number;
  transactionCount: number;
}

interface MonthlyRecord {
  monthKey: string;
  monthName: string;
  year: number;
  revenueCategory: string;
  eligibleRevenue: number;
  applicableCommissionPercentage: number;
  commissionEarned: number;
  amountPaid: number;
  remainingPayableAmount: number;
  status: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  timestamp: number;
  status?: string;
}

interface TransactionHistories {
  sharePurchases: any[];
  payments: any[];
  commissions: any[];
  withdrawals: any[];
}

export default function ShareholderDashboard() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dashboardStatus, setDashboardStatus] = useState<'approved' | 'pending_verification' | 'rejected' | 'none'>('none');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [revenueSources, setRevenueSources] = useState<RevenueSource[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlyRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionHistories>({
    sharePurchases: [],
    payments: [],
    commissions: [],
    withdrawals: []
  });
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // Section Navigation Tab (Section I)
  const [activeNavTab, setActiveNavTab] = useState<DashboardNavTab>('overview');

  // Transaction History sub-tabs
  const [activeHistoryTab, setActiveHistoryTab] = useState<'purchases' | 'payments' | 'commissions' | 'withdrawals'>('purchases');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any | null>(null);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);

  // Live polling ref for pending verification
  const pendingPollRef = useRef<any>(null);

  // Increase Shares & Automatic Payment Gateway States (matching Reseller Registration)
  const [showIncreaseSharesModal, setShowIncreaseSharesModal] = useState<boolean>(false);
  const [additionalSharePercent, setAdditionalSharePercent] = useState<number>(1);
  const [increaseShareSubmitting, setIncreaseShareSubmitting] = useState<boolean>(false);
  const [showPaymentSelectionModal, setShowPaymentSelectionModal] = useState<boolean>(false);
  const [showBkashModal, setShowBkashModal] = useState<boolean>(false);
  const [showNagadModal, setShowNagadModal] = useState<boolean>(false);
  const [showRocketModal, setShowRocketModal] = useState<boolean>(false);
  const [showUpayModal, setShowUpayModal] = useState<boolean>(false);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<'bkash' | 'nagad' | 'rocket' | 'upay' | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>('');
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string>(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inv = 'SHR';
    for (let i = 0; i < 9; i++) {
      inv += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return inv;
  });

  const generateNewInvoiceId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inv = 'SHR';
    for (let i = 0; i < 9; i++) {
      inv += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCurrentInvoiceId(inv);
    return inv;
  };

  // Strict Authentication Check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/shareholder-dashboard' } });
    }
  }, [user, authLoading, navigate]);

  // Fetch strictly the authenticated user's shareholder dashboard data
  // Cloud Firestore is the authoritative Single Source of Truth
  const fetchDashboardData = async (isBackground = false, retryCount = 0) => {
    if (!user) return;
    try {
      if (!isBackground) setRefreshing(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'x-user-id': user.uid
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 1. Query Cloud Firestore directly as Authoritative Source of Truth
      let fsPortfolio: any = null;
      let fsPayments: any[] = [];
      let fsCert: any = null;
      let fsWithdrawals: any[] = [];
      let fsRevenue: any = { resellerRegistrationTotal: 0, verifiedBadgeTotal: 0, orderFormFeeTotal: 0, totalEligibleRevenue: 0 };

      try {
        const [pRes, payRes, cRes, wRes, rRes] = await Promise.allSettled([
          getShareholderPortfolioFromFirestore(user.uid),
          getShareholderPaymentsFromFirestore(user.uid),
          getShareholderCertificateFromFirestore(user.uid),
          getShareholderWithdrawalsFromFirestore(user.uid),
          getEligibleCompanyRevenueFromFirestore()
        ]);

        if (pRes.status === 'fulfilled') fsPortfolio = pRes.value;
        if (payRes.status === 'fulfilled') fsPayments = payRes.value || [];
        if (cRes.status === 'fulfilled') fsCert = cRes.value;
        if (wRes.status === 'fulfilled') fsWithdrawals = wRes.value || [];
        if (rRes.status === 'fulfilled') fsRevenue = rRes.value || fsRevenue;
      } catch (fsErr) {
        console.warn('[ShareholderDashboard] Direct Firestore fetch note:', fsErr);
      }

      if (!fsPortfolio) {
        try {
          const cached = localStorage.getItem(`rj_shareholder_active_${user.uid}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && (Number(parsed.activeSharesPercent) > 0 || parsed.status === 'active_shareholder')) {
              fsPortfolio = parsed;
            }
          }
        } catch (_) {}
      }

      // 2. Also fetch server endpoint in parallel
      let serverData: any = null;
      try {
        const res = await fetch('/api/shareholders/me', { headers });
        if (res.ok) {
          serverData = await res.json().catch(() => null);
        }
      } catch (srvErr) {
        console.warn('[ShareholderDashboard] Server fetch note:', srvErr);
      }

      // Determine Genuine Status from Firestore records
      const isFsApproved = (fsPortfolio && Number(fsPortfolio.activeSharesPercent) > 0) ||
        fsPayments.some(p => p.status === 'approved' || p.paymentStatus === 'Approved' || p.isShareholderActive === true);
      const isServerApproved = serverData?.success && serverData?.shareholderStatus === 'approved';

      const isFsPending = !isFsApproved && fsPayments.some(p => p.status === 'pending_verification' || p.paymentStatus === 'Pending Verification');
      const isServerPending = !isFsApproved && serverData?.success && serverData?.shareholderStatus === 'pending_verification';

      const isFsRejected = !isFsApproved && !isFsPending && fsPayments.some(p => p.status === 'rejected' || p.paymentStatus === 'Rejected');
      const isServerRejected = !isFsApproved && !isFsPending && serverData?.success && serverData?.shareholderStatus === 'rejected';

      if (isFsApproved || isServerApproved) {
        setDashboardStatus('approved');

        // Calculate verified share allocation
        const approvedSharePercent = Number(
          fsPortfolio?.activeSharesPercent ||
          serverData?.summary?.approvedSharePercentage ||
          fsPayments.filter(p => p.status === 'approved' || p.paymentStatus === 'Approved').reduce((acc, p) => acc + Number(p.sharePercent || 0), 0) ||
          1
        );
        const totalPaid = Number(
          fsPortfolio?.portfolioValue ||
          serverData?.summary?.totalAmountPaidForApprovedShares ||
          (approvedSharePercent * 2000)
        );

        const currentShareholderId = `RJ-SH-${user.uid.slice(0, 8).toUpperCase()}`;

        // Assemble unified summary (Section B & C) with authoritative Firestore values
        const earned = fsPortfolio?.totalEarnedCommission !== undefined && !isNaN(Number(fsPortfolio.totalEarnedCommission))
          ? Number(fsPortfolio.totalEarnedCommission)
          : (serverData?.summary?.totalEarnedCommission || 0);

        const paid = fsPortfolio?.paidCommission !== undefined && !isNaN(Number(fsPortfolio.paidCommission))
          ? Number(fsPortfolio.paidCommission)
          : (serverData?.summary?.paidCommission || 0);

        const available = fsPortfolio?.availableWithdrawBalance !== undefined && !isNaN(Number(fsPortfolio.availableWithdrawBalance))
          ? Number(fsPortfolio.availableWithdrawBalance)
          : (serverData?.summary?.availableWithdrawBalance !== undefined
              ? Number(serverData.summary.availableWithdrawBalance)
              : Math.max(0, earned - paid));

        const pending = fsPortfolio?.pendingCommission !== undefined && !isNaN(Number(fsPortfolio.pendingCommission))
          ? Number(fsPortfolio.pendingCommission)
          : (serverData?.summary?.pendingCommission !== undefined
              ? Number(serverData.summary.pendingCommission)
              : Math.max(0, earned - paid));

        setSummary({
          shareholderId: currentShareholderId,
          shareholderStatus: 'Active Shareholder',
          approvedSharePercentage: approvedSharePercent,
          totalAmountPaidForApprovedShares: totalPaid,
          totalEligibleRevenue: fsRevenue.totalEligibleRevenue || serverData?.summary?.totalEligibleRevenue || 0,
          totalEarnedCommission: earned,
          pendingCommission: pending,
          approvedCommission: earned,
          paidCommission: paid,
          availableWithdrawBalance: available
        });

        // Revenue Sources Breakdown (Sections F & G)
        setRevenueSources([
          {
            id: 'reseller_registration',
            title: 'Reseller Registration Fees',
            titleBn: 'রিসেলার নিবন্ধন ফি',
            description: 'Revenue collected from verified reseller registrations and activation fees.',
            totalEligibleRevenue: fsRevenue.resellerRegistrationTotal,
            approvedCommissionPercentage: approvedSharePercent,
            calculatedCommission: 0,
            pendingCommission: 0,
            paidCommission: 0,
            transactionCount: fsRevenue.resellerRegistrationTotal > 0 ? Math.ceil(fsRevenue.resellerRegistrationTotal / 500) : 0
          },
          {
            id: 'verified_badge',
            title: 'Verified Badge Fees',
            titleBn: 'ভেরিফাইড ব্যাজ ফি',
            description: 'Revenue collected from vendor store verification and security badge renewals.',
            totalEligibleRevenue: fsRevenue.verifiedBadgeTotal,
            approvedCommissionPercentage: approvedSharePercent,
            calculatedCommission: 0,
            pendingCommission: 0,
            paidCommission: 0,
            transactionCount: fsRevenue.verifiedBadgeTotal > 0 ? Math.ceil(fsRevenue.verifiedBadgeTotal / 1000) : 0
          },
          {
            id: 'order_form_fee',
            title: 'Order Form Fees',
            titleBn: 'অর্ডার ফর্ম ফি / প্ল্যাটফর্ম ফি',
            description: 'Platform service fees collected on delivered and completed orders.',
            totalEligibleRevenue: fsRevenue.orderFormFeeTotal,
            approvedCommissionPercentage: approvedSharePercent,
            calculatedCommission: 0,
            pendingCommission: 0,
            paidCommission: 0,
            transactionCount: fsRevenue.orderFormFeeTotal > 0 ? Math.ceil(fsRevenue.orderFormFeeTotal / 20) : 0
          }
        ]);

        setMonthlyHistory(serverData?.monthlyIncomeHistory || []);
        setNotifications(serverData?.notifications || []);

        // Assemble unified transaction history from Firestore (Section D & H)
        const purchases = fsPayments.length > 0 ? fsPayments : (serverData?.transactionHistory?.sharePurchases || []);
        const wList = fsWithdrawals.length > 0 ? fsWithdrawals : (serverData?.transactionHistory?.withdrawals || []);
        setTransactions({
          sharePurchases: purchases,
          payments: purchases,
          commissions: serverData?.transactionHistory?.commissions || [],
          withdrawals: wList
        });

        // Assemble official certificate (Section E & Share Certificate)
        const certData: CertificateData = {
          certificateNumber: fsCert?.certificateNumber || serverData?.certificate?.certificateNumber || `RJ-CERT-${user.uid.slice(0, 8).toUpperCase()}-${String(approvedSharePercent * 100).padStart(4, '0')}`,
          shareholderName: fsPortfolio?.shareholderName || serverData?.profile?.fullName || userData?.name || user.displayName || 'Valued Shareholder',
          guardianName: fsPayments[0]?.guardianName || serverData?.profile?.guardianName || '',
          address: fsPayments[0]?.address || serverData?.profile?.address || '',
          shareholderId: currentShareholderId,
          approvedSharePercentage: approvedSharePercent,
          verifiedPurchaseAmount: totalPaid,
          shareUnits: approvedSharePercent,
          issueDate: fsPortfolio?.lastVerifiedAt || serverData?.certificate?.issueDate || Date.now(),
          signatoryTitle: 'Authorized Corporate Signatory',
          companyName: 'RJ WORLD BD',
          authorizedSignatory: 'Executive Board of Directors'
        };
        setCertificate(certData);

        // Shareholder Profile (Section A)
        setProfile({
          userId: user.uid,
          fullName: fsPortfolio?.shareholderName || serverData?.profile?.fullName || userData?.name || user.displayName || 'Valued Shareholder',
          applicantName: fsPortfolio?.shareholderName || serverData?.profile?.applicantName || userData?.name || user.displayName || 'Valued Shareholder',
          email: fsPortfolio?.email || serverData?.profile?.email || user.email || '',
          shareholderId: currentShareholderId,
          accountCreationDate: fsPortfolio?.createdAt || serverData?.profile?.accountCreationDate || Date.now(),
          applicationId: fsPayments[0]?.applicationId || fsPayments[0]?.id || serverData?.profile?.applicationId || 'APP-VERIFIED',
          paymentVerificationStatus: 'Verified',
          shareholderAccountStatus: 'Active Shareholder',
          phone: fsPortfolio?.phone || serverData?.profile?.phone || userData?.phone || '',
          guardianName: fsPortfolio?.guardianName || serverData?.profile?.guardianName || '',
          address: fsPortfolio?.address || serverData?.profile?.address || ''
        });

      } else if (isFsPending || isServerPending) {
        setDashboardStatus('pending_verification');
        const purchases = fsPayments.length > 0 ? fsPayments : (serverData?.transactionHistory?.sharePurchases || []);
        setTransactions({
          sharePurchases: purchases,
          payments: purchases,
          commissions: [],
          withdrawals: []
        });
      } else if (isFsRejected || isServerRejected) {
        setDashboardStatus('rejected');
        const purchases = fsPayments.length > 0 ? fsPayments : (serverData?.transactionHistory?.sharePurchases || []);
        setTransactions({
          sharePurchases: purchases,
          payments: purchases,
          commissions: [],
          withdrawals: []
        });
      } else {
        if (retryCount < 2) {
          setTimeout(() => {
            fetchDashboardData(isBackground, retryCount + 1);
          }, 800 * (retryCount + 1));
          return;
        }
        setDashboardStatus('none');
      }
    } catch (err) {
      console.error('Error loading shareholder dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchDashboardData();
    }
  }, [user?.uid]);

  // Real-time listener for shareholder document creation or updates
  useEffect(() => {
    if (!user?.uid) return;
    try {
      const unsub = onSnapshot(doc(db, 'shareholders', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && (Number(data.activeSharesPercent) > 0 || data.status === 'active_shareholder')) {
            fetchDashboardData(true);
          }
        }
      }, (err) => {
        console.warn('[ShareholderDashboard] Real-time listener notice:', err);
      });
      return () => unsub();
    } catch (_) {}
  }, [user?.uid]);

  // Live auto-polling when dashboardStatus === 'pending_verification'
  useEffect(() => {
    if (dashboardStatus === 'pending_verification' && user?.uid) {
      pendingPollRef.current = setInterval(() => {
        fetchDashboardData(true);
      }, 4000);
    } else {
      if (pendingPollRef.current) clearInterval(pendingPollRef.current);
    }

    return () => {
      if (pendingPollRef.current) clearInterval(pendingPollRef.current);
    };
  }, [dashboardStatus, user?.uid]);

  // Handle Withdrawal Request Submission (Section G)
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(withdrawAmount);
    if (!amount || isNaN(amount) || amount < 100) {
      toast.error(language === 'bn' ? 'সর্বনিম্ন উত্তোলনের পরিমাণ ১০০ টাকা।' : 'Minimum withdrawal amount is ৳100.');
      return;
    }
    const availableBal = summary?.availableWithdrawBalance || 0;
    if (amount > availableBal) {
      toast.error(language === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স।' : 'Insufficient available withdrawable balance.');
      return;
    }
    if (!withdrawAccount.trim()) {
      toast.error(language === 'bn' ? 'অ্যাকাউন্ট নম্বর প্রদান করুন।' : 'Please enter your recipient account number.');
      return;
    }

    try {
      setWithdrawSubmitting(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': user.uid
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Submit to Cloud Firestore
      await submitShareholderWithdrawalToFirestore({
        userId: user.uid,
        shareholderId: shareholderId,
        amount,
        paymentMethod: withdrawMethod,
        accountNumber: withdrawAccount.trim()
      }).catch(err => console.warn('[Withdrawal Firestore Notice]:', err));

      // 2. Submit to backend API
      const res = await fetch('/api/shareholders/withdraw', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount,
          paymentMethod: withdrawMethod,
          accountNumber: withdrawAccount.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(language === 'bn' ? 'উত্তোলনের আবেদন সফলভাবে গৃহীত হয়েছে।' : 'Withdrawal request submitted successfully.');
        setWithdrawAmount('');
        setWithdrawAccount('');
        fetchDashboardData();
      } else {
        toast.error(data.error || 'Withdrawal submission failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error submitting withdrawal.');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  // Handle Increase Shares Automatic Payment Verification (matches Reseller Registration flow)
  const handleCompleteIncreaseSharePayment = async (channel: 'bkash' | 'nagad' | 'rocket' | 'upay', trxId: string) => {
    if (!user) return;
    if (!trxId || !trxId.trim()) {
      setPaymentErrorMessage(language === 'bn' ? 'অনুগ্রহ করে Transaction ID লিখুন।' : 'Please enter the transaction ID.');
      return;
    }

    const cleanTrx = trxId.trim().toUpperCase().replace(/\s+/g, '');
    const payableAmount = additionalSharePercent * 2000;
    const invId = currentInvoiceId;
    const applicantFullName = profile?.fullName || profile?.applicantName || userData?.name || user.displayName || 'Shareholder';
    const applicantPhone = profile?.phone || userData?.phone || '';

    try {
      setIncreaseShareSubmitting(true);
      setPaymentErrorMessage('');

      // Call Automatic Payment Verification with 8-second safety timeout
      const timeoutPromise = new Promise<VerificationResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Payment verification timed out. Please try again.'));
        }, 8000);
      });

      const result = await Promise.race([
        verifyPaymentAutomatic({
          transactionId: cleanTrx,
          paymentMethod: channel,
          expectedAmount: payableAmount,
          invoiceId: invId,
          userId: user.uid,
          userType: 'shareholder',
          contextData: {
            applicationId: invId,
            sharePercent: additionalSharePercent,
            shareUnits: additionalSharePercent,
            totalAmount: payableAmount,
            applicantName: applicantFullName,
            phone: applicantPhone,
            email: user.email || '',
            address: profile?.address || ''
          }
        }),
        timeoutPromise
      ]);

      if (result.status === 'verified') {
        // Payment verified automatically and server-side verified!
        setShowBkashModal(false);
        setShowNagadModal(false);
        setShowRocketModal(false);
        setShowUpayModal(false);
        setShowPaymentSelectionModal(false);
        setShowIncreaseSharesModal(false);

        toast.success(
          language === 'bn'
            ? `অভিনন্দন! আপনার অতিরিক্ত ${additionalSharePercent}% শেয়ার সফলভাবে যুক্ত হয়েছে।`
            : `Congratulations! ${additionalSharePercent}% additional share equity successfully added and verified!`,
          { duration: 5000 }
        );

        // Instantly refresh dashboard data to reflect newly increased shares, capital, certificate, and records
        await fetchDashboardData();
        generateNewInvoiceId();
      } else if (
        result.status === 'rejected' &&
        (result.rejectionReason === 'amount_mismatch' ||
         result.rejectionReason === 'method_mismatch' ||
         result.rejectionReason === 'duplicate_transaction')
      ) {
        let errorMsg = result.message || 'Payment verification failed.';
        if (result.rejectionReason === 'amount_mismatch') {
          errorMsg = language === 'bn' 
            ? `পেমেন্ট এমাউন্ট সঠিক নয়! প্রত্যাশিত: ৳${payableAmount.toLocaleString()}।`
            : `Payment amount does not match! Expected: ৳${payableAmount.toLocaleString()}.`;
        } else if (result.rejectionReason === 'method_mismatch') {
          errorMsg = language === 'bn' 
            ? 'পেমেন্ট মেথড সঠিক নয়! অনুগ্রহ করে সঠিক মেথডে টাকা পাঠান।'
            : 'Payment channel mismatch! Please use the matching payment channel.';
        } else if (result.rejectionReason === 'duplicate_transaction') {
          errorMsg = language === 'bn' 
            ? 'এই ট্রানজেকশন আইডি ইতিমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে নতুন পেমেন্ট করুন।'
            : 'This Transaction ID has already been utilized. Duplicate payment rejected.';
        }
        setPaymentErrorMessage(errorMsg);
        toast.error(errorMsg, { duration: 6000 });
      } else {
        // Unverified / Pending SMS / Not found
        const msg = language === 'bn'
          ? 'পেমেন্ট রেকর্ড এখনও পাওয়া যায়নি। অনুগ্রহ করে সঠিক TrxID ও এমাউন্ট মিলিয়ে পুনরায় চেষ্টা করুন।'
          : 'Payment record not found yet. Please ensure you sent money with exact amount and entered correct TrxID.';
        setPaymentErrorMessage(msg);
        toast.error(msg, { duration: 5000 });
      }
    } catch (err: any) {
      console.error('[Increase Shares Verification Error]:', err);
      const errMsg = err?.message || 'Verification failed. Please try again.';
      setPaymentErrorMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setIncreaseShareSubmitting(false);
    }
  };

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-primary-main animate-spin"></div>
        <p className="mt-4 text-sm text-slate-600 font-medium tracking-wide">
          {language === 'bn' ? 'শেয়ারহোল্ডার তথ্য লোড হচ্ছে...' : 'Loading verified shareholder records...'}
        </p>
      </div>
    );
  }

  const shareholderId = summary?.shareholderId || profile?.shareholderId || `RJ-SH-${(user?.uid || '000000').slice(0, 8).toUpperCase()}`;

  // Filter monthly records
  const filteredMonthlyHistory = selectedMonthFilter === 'all' 
    ? monthlyHistory 
    : monthlyHistory.filter(m => m.monthKey === selectedMonthFilter);

  // Navigation Items (Section I)
  const navTabs: Array<{ id: DashboardNavTab; label: string; labelBn: string; icon: any; count?: number }> = [
    { id: 'overview', label: 'Overview', labelBn: 'একনজরে', icon: PieChart },
    { id: 'shares', label: 'My Shares', labelBn: 'শেয়ার তথ্য', icon: Coins },
    { id: 'certificate', label: 'Share Certificate', labelBn: 'সার্টিফিকেট', icon: Award },
    { id: 'revenue', label: 'Revenue & Benefits', labelBn: 'কোম্পানি রাজস্ব', icon: TrendingUp },
    { id: 'transactions', label: 'Transaction History', labelBn: 'লেনদেন হিস্ট্রি', icon: History, count: (transactions.sharePurchases.length + transactions.withdrawals.length) },
    { id: 'withdrawals', label: 'Withdrawals', labelBn: 'টাকা উত্তোলন', icon: Wallet },
    { id: 'notifications', label: 'Notifications', labelBn: 'বিজ্ঞপ্তি', icon: Bell, count: notifications.length },
    { id: 'profile', label: 'Profile', labelBn: 'প্রোফাইল', icon: User }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-2 sm:pt-5 pb-16 px-2.5 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-xs sm:text-sm text-slate-500 mb-2.5 sm:mb-4">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-0.5 no-scrollbar text-[11px] sm:text-xs">
            <button 
              type="button"
              onClick={() => navigate('/company-share')} 
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer font-medium shrink-0 text-[11px] sm:text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'শেয়ার পোর্টাল' : 'Share Portal'}</span>
            </button>
            <span>/</span>
            <Link to="/" className="hover:text-primary-main shrink-0">Home</Link>
            <span>/</span>
            <Link to="/company-share" className="hover:text-primary-main shrink-0">
              {language === 'bn' ? 'কোম্পানি শেয়ার' : 'Company Share'}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold shrink-0 truncate max-w-[120px] sm:max-w-none">
              {language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] sm:text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
            title="Refresh Records"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-primary-main' : ''}`} />
            <span className="hidden sm:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>
        </div>

        {/* =========================================================================
            STATE 1: NO SHAREHOLDER APPLICATION FOUND
        ========================================================================== */}
        {dashboardStatus === 'none' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-14 text-center max-w-2xl mx-auto my-8 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-sky-50 border border-sky-100 text-primary-main flex items-center justify-center mx-auto shadow-inner">
              <Building2 className="w-10 h-10" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
              {language === 'bn' ? 'কোনো সক্রিয় শেয়ার নেই' : 'No Active Shareholding'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {language === 'bn' ? 'আপনি এখনও RJ WORLD BD-এর শেয়ারহোল্ডার নন' : 'You are not yet a verified shareholder'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              {language === 'bn' 
                ? 'কোম্পানির শেয়ারহোল্ডার হয়ে বাৎসরিক ব্যবসায়িক শেয়ারিংয়ে অংশ নিতে মাত্র ২,০০০ টাকায় ১% শেয়ার কিনে আপনার আবেদন সম্পন্ন করুন।'
                : 'Join RJ WORLD BD corporate equity ownership. Select your desired share percentage starting at ৳2,000 per 1% share to initiate an application.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/company-share"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-primary-main hover:bg-sky-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'কোম্পানি শেয়ার কিনুন' : 'Buy Company Shares'}</span>
              </Link>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer"
              >
                {language === 'bn' ? 'হোমপেজে ফিরে যান' : 'Back to Home'}
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE: REJECTED / FAILED PAYMENT STATE
        ========================================================================== */}
        {dashboardStatus === 'rejected' && (
          <div className="space-y-6 max-w-4xl mx-auto my-6">
            <div className="bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3 border border-white/20">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'পেমেন্ট যাচাইকরণ প্রত্যাখ্যাত' : 'Payment Verification Rejected'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  {language === 'bn' ? 'শেয়ার আবেদনের পেমেন্ট অনুমোদিত হয়নি' : 'Share Purchase Payment Not Approved'}
                </h1>
                <p className="text-xs sm:text-sm text-rose-100 max-w-2xl leading-relaxed">
                  {language === 'bn'
                    ? 'প্রদত্ত TrxID অথবা পেমেন্ট তথ্যের সাথে ব্যাংক/MFS রেকর্ডের অমিল পাওয়ায় আবেদনটি গ্রহণ করা সম্ভব হয়নি। অনুগ্রহ করে তথ্য যাচাই করে পুনরায় আবেদন করুন অথবা হেল্পলাইনে যোগাযোগ করুন।'
                    : 'The transaction ID or payment information provided could not be matched with MFS records. Please review your payment details, submit a new application, or contact RJ WORLD BD support.'}
                </p>
              </div>
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            <div className="bg-white rounded-3xl border border-rose-100 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{language === 'bn' ? 'আবেদনের বিবরণ' : 'Rejected Application Details'}</span>
                </h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                  {language === 'bn' ? 'প্রত্যাখ্যাত' : 'Rejected'}
                </span>
              </div>

              {transactions.sharePurchases.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Application ID</span>
                    <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                      {transactions.sharePurchases[0].id || transactions.sharePurchases[0].applicationId || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Submitted TrxID</span>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      {transactions.sharePurchases[0].transactionId || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Applied Shares</span>
                    <span className="font-bold text-slate-900">
                      {transactions.sharePurchases[0].sharePercent || 1}% Equity (৳{Number(transactions.sharePurchases[0].totalAmount || 2000).toLocaleString()})
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link
                  to="/company-share"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-main hover:bg-sky-600 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'bn' ? 'পুনরায় আবেদন করুন' : 'Submit New Application'}</span>
                </Link>
                <Link
                  to="/support"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সাপোর্টে যোগাযোগ করুন' : 'Contact Support'}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 2: PENDING VERIFICATION STATE (TASK 1 & TASK 2)
        ========================================================================== */}
        {dashboardStatus === 'pending_verification' && (
          <div className="space-y-6 max-w-4xl mx-auto my-6">
            {/* Pending Notice Hero */}
            <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3 border border-white/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Administrator & SMS Verification</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  {language === 'bn' ? 'আপনার শেয়ার পেমেন্ট যাচাইকরণের অপেক্ষায় আছে' : 'Your Share Purchase is Under Review'}
                </h1>
                <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
                  {language === 'bn'
                    ? 'আপনার পেমেন্ট তথ্য ও TrxID সফলভাবে গ্রহণ করা হয়েছে। SMS রিডার এবং অ্যাডমিন সিস্টেমের মাধ্যমে যাচাই সম্পন্ন হওয়া মাত্রই আপনার শেয়ার সক্রিয় হয়ে যাবে।'
                    : 'Your payment details and TrxID have been submitted. As soon as verification completes via SMS Reader or admin confirmation, your equity will be activated.'}
                </p>
              </div>
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* Application Detail Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-main" />
                  <span>Pending Application Details</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span className="text-xs font-bold text-amber-600 font-mono">Live Polling Active</span>
                </div>
              </div>

              {transactions.sharePurchases.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Application ID</span>
                    <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
                      {transactions.sharePurchases[0].id || transactions.sharePurchases[0].applicationId}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Submitted TrxID</span>
                    <span className="font-mono font-bold text-primary-main text-sm">
                      {transactions.sharePurchases[0].transactionId || 'Awaiting'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[11px]">Share Allocation</span>
                    <span className="font-bold text-slate-900">
                      {transactions.sharePurchases[0].sharePercent || 1}% Equity (৳{Number(transactions.sharePurchases[0].totalAmount || 2000).toLocaleString()})
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-primary-main animate-spin" />
                  <p className="text-xs text-slate-700">
                    {language === 'bn' ? 'যাচাই হওয়া মাত্রই এই পৃষ্ঠাটি স্বয়ংক্রিয়ভাবে সক্রিয় ড্যাশবোর্ডে রূপান্তরিত হবে।' : 'Page will auto-refresh the moment payment verification is approved.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchDashboardData()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg shadow-2xs"
                >
                  {language === 'bn' ? 'এখনই স্ট্যাটাস দেখুন' : 'Check Now'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 3: APPROVED SHAREHOLDER DASHBOARD (COMPLETE SECTIONS A-I)
        ========================================================================== */}
        {dashboardStatus === 'approved' && (
          <div className="space-y-3 sm:space-y-5">
            {/* Header Identity Card - Compact & Mobile Friendly */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 lg:p-6 shadow-md border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] sm:text-xs font-bold border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>RJ WORLD BD • Verified Shareholder</span>
                  </div>
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight">
                    {profile?.fullName || profile?.applicantName || 'Valued Shareholder'}
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                    <span>ID: <strong className="text-white font-mono">{shareholderId}</strong></span>
                    <span>·</span>
                    <span>Ownership: <strong className="text-amber-400 font-bold">{summary?.approvedSharePercentage || 1}%</strong></span>
                    <span>·</span>
                    <span>Status: <strong className="text-emerald-400">Active</strong></span>
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (certificate) setShowCertificateModal(true);
                      else toast.error(language === 'bn' ? 'সার্টিফিকেট প্রস্তুত হচ্ছে...' : 'Certificate is being prepared.');
                    }}
                    className="w-full sm:w-auto px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-[11px] sm:text-xs rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[38px]"
                  >
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{language === 'bn' ? 'সার্টিফিকেট' : 'Certificate'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('withdrawals')}
                    className="w-full sm:w-auto px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] sm:text-xs rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[38px]"
                  >
                    <Wallet className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === 'bn' ? 'উত্তোলন' : 'Withdraw'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================================================
                SECTION I: DASHBOARD NAVIGATION BAR (COMPACT & MOBILE RESPONSIVE)
            ========================================================================== */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-1 shadow-2xs overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 min-w-max">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeNavTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveNavTab(tab.id)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-main' : 'text-slate-400'}`} />
                      <span>{language === 'bn' ? tab.labelBn : tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`px-1 py-0.1 rounded-full text-[9px] font-mono leading-none ${
                          isActive ? 'bg-primary-main text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* =========================================================================
                TAB 1: OVERVIEW (Compact KPIs & Snapshot)
            ========================================================================== */}
            {activeNavTab === 'overview' && (
              <div className="space-y-3 sm:space-y-4">
                {/* 4 Summary KPI Cards - 2 Columns on Mobile for Compact View */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  {/* Share Ownership */}
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[10px] sm:text-xs font-semibold">Share Ownership</span>
                      <Coins className="w-3.5 h-3.5 text-primary-main" />
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-slate-900">
                      {summary?.approvedSharePercentage || 1}%
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                      {summary?.approvedSharePercentage || 1} units @ ৳2k/1%
                    </p>
                  </div>

                  {/* Portfolio Capital Value */}
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[10px] sm:text-xs font-semibold">Total Paid Capital</span>
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-slate-900">
                      ৳{Number(summary?.totalAmountPaidForApprovedShares || 2000).toLocaleString()}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-emerald-600 font-medium mt-0.5 truncate">
                      Verified & Fully Paid
                    </p>
                  </div>

                  {/* Calculated Allocation */}
                  <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-[10px] sm:text-xs font-semibold">Allocation</span>
                      <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-slate-900">
                      ৳{Number(summary?.totalEarnedCommission || 0).toLocaleString()}
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
                      From revenue pools
                    </p>
                  </div>

                  {/* Available Withdrawable Balance */}
                  <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-300 mb-1">
                      <span className="text-[10px] sm:text-xs font-semibold">Withdrawable</span>
                      <Wallet className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-white">
                      ৳{Number(summary?.availableWithdrawBalance || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between mt-0.5 text-[9px] sm:text-[11px]">
                      <span className="text-slate-400">Min: ৳100</span>
                      <button
                        type="button"
                        onClick={() => setActiveNavTab('withdrawals')}
                        className="text-amber-400 font-bold hover:underline"
                      >
                        Payout &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Revenue Snapshot (Section D summary) */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary-main" />
                      <span>Company Revenue Pools (রাজস্ব উৎস)</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveNavTab('revenue')}
                      className="text-[11px] sm:text-xs text-primary-main font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>Breakdown</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {revenueSources.map((source) => (
                      <div key={source.id} className="p-2.5 sm:p-3.5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200/80 space-y-1 sm:space-y-1.5">
                        <span className="text-[11px] sm:text-xs font-bold text-slate-900 block truncate">
                          {language === 'bn' ? source.titleBn : source.title}
                        </span>
                        <div className="text-base sm:text-lg font-black text-slate-800">
                          ৳{Number(source.totalEligibleRevenue || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-slate-500 flex justify-between">
                          <span>Allocation:</span>
                          <span className="font-bold text-emerald-600">৳{Number(source.calculatedCommission || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2 text-[10px] sm:text-xs text-amber-800">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Policy Notice:</strong> Calculations are strictly derived from verified transactions in the company database according to the official corporate agreement. Allocations represent business benefit distributions and do not guarantee any fixed returns or monthly income.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 2: MY SHARES (Section B - Share Ownership Summary & Increase Shares)
            ========================================================================== */}
            {activeNavTab === 'shares' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3 sm:p-5 lg:p-6 shadow-2xs space-y-3 sm:space-y-4">
                  {/* Section B Header with + Increase Shares Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-main/10 text-primary-main flex items-center justify-center shrink-0">
                        <Coins className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide">
                          {language === 'bn' ? 'শেয়ার মালিকানা বিবরণী (My Shares)' : 'Section B: Share Ownership'}
                        </h2>
                        <span className="text-[10px] sm:text-[11px] text-slate-500 block">
                          RJ WORLD BD Corporate Equity Portfolio
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Active</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentErrorMessage('');
                          generateNewInvoiceId();
                          setShowIncreaseSharesModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-[11px] sm:text-xs rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer min-h-[32px] sm:min-h-[36px]"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{language === 'bn' ? '+ অতিরিক্ত শেয়ার' : '+ Increase Shares'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Increase Shares Promotional Action Banner - Compact */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'bn' ? 'ইকুইটি শেয়ার বৃদ্ধির সুযোগ' : 'Expand Equity'}</span>
                        </div>
                        <h3 className="text-xs sm:text-base font-black text-white">
                          {language === 'bn' ? 'অতিরিক্ত শেয়ার কিনে অংশীদারিত্ব বাড়ান' : 'Increase Your Corporate Share Equity'}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-300 max-w-xl leading-relaxed">
                          {language === 'bn'
                            ? 'প্রতি ১% শেয়ারের মূল্য মাত্র ২,০০০ টাকা। ইনস্ট্যান্ট অটোমেটিক গেটওয়ে (bKash, Nagad, Rocket, Upay) দিয়ে তাৎক্ষণিক অতিরিক্ত শেয়ার যুক্ত করুন।'
                            : 'Rate: ৳2,000 per 1% share. Pay via instant automated payment gateway (bKash, Nagad, Rocket, Upay).'}
                        </p>
                      </div>

                      <div className="shrink-0 pt-1 md:pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentErrorMessage('');
                            generateNewInvoiceId();
                            setShowIncreaseSharesModal(true);
                          }}
                          className="w-full sm:w-auto px-3.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[11px] sm:text-xs rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[34px] sm:min-h-[38px]"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>{language === 'bn' ? '+ অতিরিক্ত শেয়ার কিনুন' : '+ Increase Shares'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4 Summary KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[11px] font-medium">Purchased Percentage</span>
                      <span className="text-base sm:text-lg font-black text-primary-main block mt-0.5">
                        {summary?.approvedSharePercentage || 1}%
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 block">Corporate Equity</span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[11px] font-medium">Share Units Owned</span>
                      <span className="text-base sm:text-lg font-black text-slate-900 block mt-0.5">
                        {summary?.approvedSharePercentage || 1} Units
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 block">Rate: ৳2,000 / 1%</span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[11px] font-medium">Total Capital Paid</span>
                      <span className="text-base sm:text-lg font-black text-emerald-600 block mt-0.5">
                        ৳{Number(summary?.totalAmountPaidForApprovedShares || 2000).toLocaleString()}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-emerald-700 block">100% Verified Paid</span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[11px] font-medium">Share Status</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block mt-0.5 truncate">
                        Officially Issued
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 block">Recorded in Registry</span>
                    </div>
                  </div>

                  {/* All Verified Purchase Records List (Mobile Friendly Cards + Table) */}
                  <div className="pt-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                      <h3 className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{language === 'bn' ? 'অনুমোদিত শেয়ার ক্রয়ের রেকর্ডসমূহ' : 'Verified Purchase Records'}</span>
                      </h3>
                      <span className="text-[10px] sm:text-[11px] text-slate-500">
                        {language === 'bn' ? `মোট: ${transactions.sharePurchases.length} টি` : `Total: ${transactions.sharePurchases.length}`}
                      </span>
                    </div>

                    {transactions.sharePurchases.length > 0 ? (
                      <div className="space-y-2">
                        {/* Mobile Cards (visible on phones) - Compact & Clean */}
                        <div className="block sm:hidden space-y-2">
                          {transactions.sharePurchases.map((purchase, idx) => (
                            <div key={purchase.id || purchase.applicationId || idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-4 h-4 rounded-full bg-primary-main/10 text-primary-main text-[10px] font-bold flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-slate-900">
                                    {purchase.id || purchase.applicationId || `PUR-${idx + 1}`}
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Verified</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                <div>
                                  <span className="text-[9px] text-slate-400 block">Share</span>
                                  <span className="font-bold text-primary-main">
                                    {purchase.sharePercent || 1}% Equity
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block">Paid</span>
                                  <span className="font-bold text-emerald-600 font-mono">
                                    ৳{Number(purchase.totalAmount || 2000).toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block">Method</span>
                                  <span className="font-medium text-slate-800">
                                    {purchase.paymentMethod || 'Automatic'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 block">Date</span>
                                  <span className="font-medium text-slate-600">
                                    {purchase.verifiedAt 
                                      ? new Date(purchase.verifiedAt).toLocaleDateString('en-GB')
                                      : purchase.createdAt
                                      ? new Date(purchase.createdAt).toLocaleDateString('en-GB')
                                      : 'Verified'}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-1 border-t border-slate-200/60 text-[10px] flex items-center justify-between">
                                <span className="text-[9px] text-slate-400">TrxID:</span>
                                <span className="font-mono font-bold text-slate-900 text-[10px]">
                                  {purchase.transactionId || 'Verified Record'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop & Tablet Table (visible on sm and up) */}
                        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200">
                          <table className="min-w-[620px] w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="py-2 px-2.5">#</th>
                                <th className="py-2 px-2.5">Application ID</th>
                                <th className="py-2 px-2.5">Transaction ID</th>
                                <th className="py-2 px-2.5">Method</th>
                                <th className="py-2 px-2.5">Share %</th>
                                <th className="py-2 px-2.5">Amount Paid</th>
                                <th className="py-2 px-2.5">Verification Date</th>
                                <th className="py-2 px-2.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {transactions.sharePurchases.map((purchase, idx) => (
                                <tr key={purchase.id || purchase.applicationId || idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-2.5 font-medium text-slate-500">{idx + 1}</td>
                                  <td className="py-2 px-2.5 font-mono font-bold text-slate-900 truncate max-w-[140px]">
                                    {purchase.id || purchase.applicationId || 'N/A'}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono font-bold text-primary-main">
                                    {purchase.transactionId || 'Verified Record'}
                                  </td>
                                  <td className="py-2 px-2.5 font-medium text-slate-700">
                                    {purchase.paymentMethod || 'bKash'}
                                  </td>
                                  <td className="py-2 px-2.5 font-bold text-slate-900">
                                    {purchase.sharePercent || 1}%
                                  </td>
                                  <td className="py-2 px-2.5 font-mono font-bold text-emerald-600">
                                    ৳{Number(purchase.totalAmount || 2000).toLocaleString()}
                                  </td>
                                  <td className="py-2 px-2.5 text-slate-600">
                                    {purchase.verifiedAt 
                                      ? new Date(purchase.verifiedAt).toLocaleDateString('en-GB')
                                      : purchase.createdAt
                                      ? new Date(purchase.createdAt).toLocaleDateString('en-GB')
                                      : 'Verified'}
                                  </td>
                                  <td className="py-2 px-2.5">
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-0.5">
                                      <Check className="w-2.5 h-2.5" />
                                      <span>Verified</span>
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                        {language === 'bn' ? 'কোনো পূর্ববর্তী শেয়ার ক্রয়ের রেকর্ড পাওয়া যায়নি।' : 'No verified purchase records found.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 3: SHARE CERTIFICATE (Section C)
            ========================================================================== */}
            {activeNavTab === 'certificate' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 lg:p-6 shadow-2xs space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{language === 'bn' ? 'অফিসিয়াল শেয়ার সার্টিফিকেট' : 'Official Share Certificate'}</span>
                    </h2>
                    <span className="text-[10px] sm:text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Corporate Certified
                    </span>
                  </div>

                  {certificate ? (
                    <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/50 rounded-2xl sm:rounded-3xl border border-amber-300 p-4 sm:p-7 text-center space-y-3 sm:space-y-5 shadow-2xs relative overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-600">
                        <Award className="w-6 h-6" />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-widest text-amber-700 font-bold block">
                          RJ WORLD BD • Equity Shareholder
                        </span>
                        <h3 className="text-base sm:text-xl font-black text-slate-900">
                          {certificate.shareholderName}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-mono">
                          Certificate No: {certificate.certificateNumber}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto text-[11px] sm:text-xs py-2 border-y border-amber-200">
                        <div>
                          <span className="text-slate-400 block text-[9px] sm:text-[10px]">Shareholder ID</span>
                          <span className="font-mono font-bold text-slate-900">{certificate.shareholderId}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] sm:text-[10px]">Ownership</span>
                          <span className="font-bold text-primary-main">{certificate.approvedSharePercentage}% Equity</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] sm:text-[10px]">Capital Paid</span>
                          <span className="font-bold text-emerald-600 font-mono">৳{Number(certificate.verifiedPurchaseAmount).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] sm:text-[10px]">Issue Date</span>
                          <span className="font-medium text-slate-800">
                            {new Date(certificate.issueDate).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowCertificateModal(true)}
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Official Certificate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCertificateModal(true)}
                          className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Document</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <Lock className="w-6 h-6 text-slate-400 mx-auto" />
                      <p className="text-xs sm:text-sm font-bold text-slate-700">Official Certificate Pending Issuance</p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        Final share certificate is issued strictly after legitimate payment verification.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 4: REVENUE & BENEFITS (Section D & Section E)
            ========================================================================== */}
            {activeNavTab === 'revenue' && (
              <div className="space-y-3 sm:space-y-4">
                {/* 3 Categories Required by Section D */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 lg:p-6 shadow-2xs space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-primary-main" />
                      <span>{language === 'bn' ? 'কোম্পানি রাজস্ব ও লভ্যাংশ বিবরণী' : 'Section D: Revenue & Benefits'}</span>
                    </h2>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500">
                      Rate: {summary?.approvedSharePercentage || 1}%
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Displaying 3 designated corporate revenue pools with verified income and calculated shareholder benefits.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                    {revenueSources.map((source, idx) => (
                      <div key={source.id} className="bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-primary-main bg-primary-main/10 px-2 py-0.5 rounded-md">
                            Category {idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {source.transactionCount} Records
                          </span>
                        </div>

                        <div>
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                            {language === 'bn' ? source.titleBn : source.title}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {source.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Revenue:</span>
                            <span className="font-bold text-slate-900 font-mono">৳{Number(source.totalEligibleRevenue).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Benefit Rate:</span>
                            <span className="font-bold text-primary-main">{source.approvedCommissionPercentage}%</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 bg-emerald-50/70 p-1.5 rounded-lg font-bold">
                            <span>Calculated:</span>
                            <span className="font-mono">৳{Number(source.calculatedCommission).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Paid Out:</span>
                            <span className="text-slate-700 font-mono">৳{Number(source.paidCommission).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400">Payable:</span>
                            <span className="text-slate-700 font-mono">৳{Number(source.pendingCommission).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Section E: Monthly Earnings Summary */}
                  <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wide">
                          {language === 'bn' ? 'মাসিক আয়ের বিবরণী' : 'Section E: Monthly Earnings'}
                        </h3>
                        <p className="text-[10px] text-slate-500">
                          Derived from database transactions. Shows 0 when no eligible transactions exist.
                        </p>
                      </div>

                      {/* Date / Month Filter */}
                      <select
                        value={selectedMonthFilter}
                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                        className="px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                      >
                        <option value="all">All Months</option>
                        {monthlyHistory.map(m => (
                          <option key={m.monthKey} value={m.monthKey}>{m.monthName}</option>
                        ))}
                      </select>
                    </div>

                    {filteredMonthlyHistory.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="min-w-[620px] w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2 px-2.5">Month</th>
                              <th className="py-2 px-2.5">Category</th>
                              <th className="py-2 px-2.5">Eligible Revenue</th>
                              <th className="py-2 px-2.5">Rate</th>
                              <th className="py-2 px-2.5">Allocation</th>
                              <th className="py-2 px-2.5">Paid</th>
                              <th className="py-2 px-2.5">Remaining</th>
                              <th className="py-2 px-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredMonthlyHistory.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-semibold text-slate-800 text-[11px]">{item.monthName}</td>
                                <td className="py-2 px-2.5 text-slate-600 text-[11px]">{item.revenueCategory}</td>
                                <td className="py-2 px-2.5 font-mono text-[11px]">৳{Number(item.eligibleRevenue).toLocaleString()}</td>
                                <td className="py-2 px-2.5 font-bold text-primary-main text-[11px]">{item.applicableCommissionPercentage}%</td>
                                <td className="py-2 px-2.5 font-mono font-bold text-emerald-600 text-[11px]">৳{Number(item.commissionEarned).toLocaleString()}</td>
                                <td className="py-2 px-2.5 font-mono text-slate-600 text-[11px]">৳{Number(item.amountPaid).toLocaleString()}</td>
                                <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-[11px]">৳{Number(item.remainingPayableAmount).toLocaleString()}</td>
                                <td className="py-2 px-2.5">
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800">
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                        No monthly earnings records found for selected period (Total: ৳0.00).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 5: TRANSACTION HISTORY (Section F)
            ========================================================================== */}
            {activeNavTab === 'transactions' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 lg:p-6 shadow-2xs space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary-main" />
                      <span>{language === 'bn' ? 'লেনদেনের বিবরণী' : 'Section F: Transaction History'}</span>
                    </h2>

                    {/* Sub-Tabs: Purchases, Payments, Commissions, Withdrawals */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg overflow-x-auto no-scrollbar max-w-full">
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab('purchases')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all shrink-0 whitespace-nowrap ${
                          activeHistoryTab === 'purchases' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Purchases ({transactions.sharePurchases.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab('withdrawals')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all shrink-0 whitespace-nowrap ${
                          activeHistoryTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Withdrawals ({transactions.withdrawals.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab('commissions')}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all shrink-0 whitespace-nowrap ${
                          activeHistoryTab === 'commissions' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Allocations ({transactions.commissions.length})
                      </button>
                    </div>
                  </div>

                  {/* Purchases Table */}
                  {activeHistoryTab === 'purchases' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="min-w-[620px] w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-2.5">TrxID</th>
                            <th className="py-2 px-2.5">Application ID</th>
                            <th className="py-2 px-2.5">Date</th>
                            <th className="py-2 px-2.5">Share %</th>
                            <th className="py-2 px-2.5">Amount</th>
                            <th className="py-2 px-2.5">Method</th>
                            <th className="py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {transactions.sharePurchases.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-[11px]">{p.transactionId || 'N/A'}</td>
                              <td className="py-2 px-2.5 font-mono text-slate-600 text-[11px]">{p.id || p.applicationId}</td>
                              <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                                {new Date(p.submissionTimestamp || p.createdAt || Date.now()).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-2 px-2.5 font-bold text-primary-main text-[11px]">{p.sharePercent}%</td>
                              <td className="py-2 px-2.5 font-mono font-bold text-[11px]">৳{Number(p.totalAmount || 2000).toLocaleString()}</td>
                              <td className="py-2 px-2.5 text-[11px]">{p.paymentMethod || 'bKash'}</td>
                              <td className="py-2 px-2.5">
                                <span className="font-semibold text-emerald-700 flex items-center gap-0.5 text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{p.status === 'approved' ? 'Verified' : 'Pending'}</span>
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Withdrawals Table */}
                  {activeHistoryTab === 'withdrawals' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      {transactions.withdrawals.length > 0 ? (
                        <table className="min-w-[540px] w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2 px-2.5">Request ID</th>
                              <th className="py-2 px-2.5">Date</th>
                              <th className="py-2 px-2.5">Amount</th>
                              <th className="py-2 px-2.5">Method</th>
                              <th className="py-2 px-2.5">Account</th>
                              <th className="py-2 px-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {transactions.withdrawals.map((w, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-[11px]">{w.id}</td>
                                <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                                  {new Date(w.requestedAt || w.createdAt || Date.now()).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-2 px-2.5 font-mono font-bold text-emerald-600 text-[11px]">
                                  ৳{Number(w.amount || 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-2.5 text-[11px]">{w.paymentMethod}</td>
                                <td className="py-2 px-2.5 font-mono text-[11px]">{w.accountNumber}</td>
                                <td className="py-2 px-2.5">
                                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                    w.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                    w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {w.status ? w.status.toUpperCase() : 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center bg-slate-50 text-xs text-slate-500">
                          No withdrawal transactions yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Allocations Table */}
                  {activeHistoryTab === 'commissions' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      {transactions.commissions.length > 0 ? (
                        <table className="min-w-[540px] w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2 px-2.5">Allocation Ref</th>
                              <th className="py-2 px-2.5">Category</th>
                              <th className="py-2 px-2.5">Pool</th>
                              <th className="py-2 px-2.5">Rate</th>
                              <th className="py-2 px-2.5">Benefit</th>
                              <th className="py-2 px-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {transactions.commissions.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-[11px]">{c.id}</td>
                                <td className="py-2 px-2.5 text-slate-700 font-medium text-[11px]">{c.category}</td>
                                <td className="py-2 px-2.5 font-mono text-[11px]">৳{Number(c.eligibleRevenue || 0).toLocaleString()}</td>
                                <td className="py-2 px-2.5 font-bold text-primary-main text-[11px]">{c.rate}</td>
                                <td className="py-2 px-2.5 font-mono font-bold text-emerald-600 text-[11px]">৳{Number(c.amount || 0).toLocaleString()}</td>
                                <td className="py-2 px-2.5">
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-100 text-sky-800">
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center bg-slate-50 text-xs text-slate-500">
                          No allocation transactions recorded yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 6: WITHDRAWALS (Section G)
            ========================================================================== */}
            {activeNavTab === 'withdrawals' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 lg:p-6 shadow-2xs space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-primary-main" />
                      <span>{language === 'bn' ? 'লভ্যাংশ উত্তোলন' : 'Section G: Withdrawal'}</span>
                    </h2>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-700">
                      Available: ৳{Number(summary?.availableWithdrawBalance || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* Withdrawal Form */}
                    <div className="md:col-span-1 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 p-3.5 space-y-3">
                      <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                        <Send className="w-3 h-3 text-primary-main" />
                        <span>Request Payout</span>
                      </h3>

                      <form onSubmit={handleWithdrawSubmit} className="space-y-2.5">
                        <div>
                          <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 block mb-0.5">
                            Withdrawal Amount (৳) *
                          </label>
                          <input
                            type="number"
                            min="100"
                            step="1"
                            max={summary?.availableWithdrawBalance || 0}
                            placeholder="Min ৳100"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary-main font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 block mb-0.5">
                            Payout Method *
                          </label>
                          <select
                            value={withdrawMethod}
                            onChange={(e) => setWithdrawMethod(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary-main font-medium"
                          >
                            <option value="bKash">bKash (বিকাশ)</option>
                            <option value="Nagad">Nagad (নগদ)</option>
                            <option value="Rocket">Rocket (রকেট)</option>
                            <option value="Bank">Bank Account (ব্যাংক অ্যাকাউন্ট)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] sm:text-[11px] font-bold text-slate-700 block mb-0.5">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 01XXXXXXXXX or Bank A/C"
                            value={withdrawAccount}
                            onChange={(e) => setWithdrawAccount(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-primary-main font-mono"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={withdrawSubmitting || !withdrawAmount || Number(withdrawAmount) < 100 || Number(withdrawAmount) > (summary?.availableWithdrawBalance || 0)}
                          className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {withdrawSubmitting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>Submit Request</span>
                        </button>
                      </form>
                    </div>

                    {/* Withdrawal Guidelines and Status */}
                    <div className="md:col-span-2 space-y-3">
                      <div className="bg-sky-50 rounded-xl border border-sky-100 p-3 space-y-1.5 text-xs text-slate-700">
                        <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5 text-primary-main" />
                          <span>Official Withdrawal Protocol</span>
                        </h4>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[10px] sm:text-[11px]">
                          <li>Withdrawals are processed strictly from verified available benefits balance.</li>
                          <li>Minimum single withdrawal amount is ৳100 BDT.</li>
                          <li>Payouts processed to authorized account within 24-48 business hours.</li>
                        </ul>
                      </div>

                      {/* Withdrawal History Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        {transactions.withdrawals.length > 0 ? (
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="py-2 px-2.5">Date</th>
                                <th className="py-2 px-2.5">Amount</th>
                                <th className="py-2 px-2.5">Method</th>
                                <th className="py-2 px-2.5">Account</th>
                                <th className="py-2 px-2.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {transactions.withdrawals.map((w, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                                    {new Date(w.requestedAt || w.createdAt || Date.now()).toLocaleDateString('en-GB')}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-[11px]">
                                    ৳{Number(w.amount || 0).toLocaleString()}
                                  </td>
                                  <td className="py-2 px-2.5 font-medium text-[11px]">{w.paymentMethod}</td>
                                  <td className="py-2 px-2.5 font-mono text-[11px]">{w.accountNumber}</td>
                                  <td className="py-2 px-2.5">
                                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                      w.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                                      w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                      'bg-amber-100 text-amber-800'
                                    }`}>
                                      {w.status ? w.status.toUpperCase() : 'PENDING'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No past withdrawals found.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 7: NOTIFICATIONS (Section H)
            ========================================================================== */}
            {activeNavTab === 'notifications' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 lg:p-6 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-primary-main" />
                      <span>{language === 'bn' ? 'বিজ্ঞপ্তি ও নোটিফিকেশন' : 'Section H: Notifications'}</span>
                    </h2>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 font-mono">
                      {notifications.length} Updates
                    </span>
                  </div>

                  {notifications.length > 0 ? (
                    <div className="space-y-2">
                      {notifications.map((item) => (
                        <div key={item.id} className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-primary-main/10 text-primary-main flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="space-y-0.5 flex-grow">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] sm:text-xs font-bold text-slate-900">
                                {language === 'bn' && item.titleBn ? item.titleBn : item.title}
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {new Date(item.timestamp).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-[11px] text-slate-600 leading-relaxed">
                              {language === 'bn' && item.messageBn ? item.messageBn : item.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                      No notifications at this time.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 8: SHAREHOLDER PROFILE (Section A)
            ========================================================================== */}
            {activeNavTab === 'profile' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 lg:p-6 shadow-2xs space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary-main" />
                      <span>{language === 'bn' ? 'শেয়ারহোল্ডার প্রোফাইল' : 'Section A: Shareholder Profile'}</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 text-emerald-800">
                      Verified Member
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Full Name</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block mt-0.5 truncate">
                        {profile?.fullName || profile?.applicantName || user?.displayName || 'Registered Shareholder'}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Registered Email</span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm block mt-0.5 truncate">
                        {profile?.email || user?.email || 'N/A'}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Shareholder ID</span>
                      <span className="font-mono font-bold text-primary-main text-xs sm:text-sm block mt-0.5">
                        {shareholderId}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Activation Date</span>
                      <span className="font-bold text-slate-900 block mt-0.5 text-xs sm:text-sm">
                        {profile?.accountCreationDate ? new Date(profile.accountCreationDate).toLocaleDateString('en-GB') : 'Active'}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Primary Application ID</span>
                      <span className="font-mono font-bold text-slate-800 text-xs block mt-0.5 truncate">
                        {profile?.applicationId || transactions.sharePurchases[0]?.id || 'N/A'}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Verification Status</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1 mt-0.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{profile?.paymentVerificationStatus || 'Verified'}</span>
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Account Status</span>
                      <span className="font-bold text-slate-900 block mt-0.5 text-xs">
                        {profile?.shareholderAccountStatus || 'Active Shareholder'}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Phone</span>
                      <span className="font-mono font-bold text-slate-900 block mt-0.5 text-xs">
                        {profile?.phone || userData?.phone || 'N/A'}
                      </span>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[9px] sm:text-[10px] font-medium">Address</span>
                      <span className="font-medium text-slate-800 block mt-0.5 text-xs truncate">
                        {profile?.address || 'Bangladesh'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Official Printable Share Certificate Modal */}
      <OfficialShareCertificateModal
        isOpen={showCertificateModal}
        onClose={() => setShowCertificateModal(false)}
        certificate={certificate}
      />

      {/* =========================================================================
          INCREASE SHARES MODAL (Mobile Responsive & Touch Friendly)
      ========================================================================== */}
      {showIncreaseSharesModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
          onClick={() => setShowIncreaseSharesModal(false)}
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white p-3.5 sm:p-5 relative">
              <button
                type="button"
                onClick={() => setShowIncreaseSharesModal(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 mb-1">
                <span className="px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  RJ WORLD BD • Equity Share
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {language === 'bn' ? 'অতিরিক্ত শেয়ার বৃদ্ধি করুন' : 'Increase Your Shares'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                {language === 'bn'
                  ? 'প্রতি ১% শেয়ারের মূল্য মাত্র ২,০০০ টাকা। তাত্ক্ষণিক অটোমেটিক পেমেন্ট গেটওয়ে।'
                  : 'Rate: ৳2,000 per 1% share. Instant automatic payment gateway.'}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
              {/* Current Ownership Badge */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs">
                <span className="text-slate-600 font-medium">
                  {language === 'bn' ? 'বর্তমান মালিকানা' : 'Current Ownership'}
                </span>
                <span className="font-bold text-primary-main bg-primary-main/10 px-2 py-0.5 rounded-full font-mono">
                  {summary?.approvedSharePercentage || 1}% Equity ({summary?.approvedSharePercentage || 1} Units)
                </span>
              </div>

              {/* Share Increment Selector */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  {language === 'bn' ? 'অতিরিক্ত শেয়ার সংখ্যা' : 'Additional Share Percentage'}
                </label>

                {/* Stepper with Controls */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdditionalSharePercent(Math.max(1, additionalSharePercent - 1))}
                    disabled={additionalSharePercent <= 1}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex-1 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-300 px-3 py-1.5 text-center">
                    <span className="text-lg sm:text-xl font-black text-primary-main font-mono">
                      {additionalSharePercent}%
                    </span>
                    <span className="block text-[9px] sm:text-[10px] text-slate-500 font-medium">
                      ({additionalSharePercent} Share Units)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAdditionalSharePercent(Math.min(50, additionalSharePercent + 1))}
                    disabled={additionalSharePercent >= 50}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Selection Chips */}
                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[1, 2, 3, 5, 10].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAdditionalSharePercent(val)}
                      className={`py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all cursor-pointer text-center ${
                        additionalSharePercent === val
                          ? 'bg-primary-main text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      +{val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Financial Calculation Summary */}
              <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5 text-[11px] sm:text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>{language === 'bn' ? 'অতিরিক্ত শেয়ার' : 'Additional Share'}</span>
                  <span className="font-bold text-slate-900 font-mono">+{additionalSharePercent}%</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>{language === 'bn' ? 'শেয়ার প্রতি মূল্য' : 'Unit Price'}</span>
                  <span className="font-medium text-slate-900">৳2,000 / 1%</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 border-t border-emerald-200/60 pt-1.5">
                  <span className="font-bold text-slate-800">
                    {language === 'bn' ? 'মোট প্রদেয় অর্থ' : 'Total Amount Payable'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-700 font-mono">
                    ৳{(additionalSharePercent * 2000).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[10px] pt-0.5">
                  <span>{language === 'bn' ? 'পেমেন্ট পরবর্তী মোট মালিকানা' : 'Resulting Total Equity'}</span>
                  <span className="font-bold text-primary-main">
                    {(summary?.approvedSharePercentage || 1) + additionalSharePercent}% Equity
                  </span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-1.5 text-[10px] text-amber-800 leading-relaxed">
                <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  {language === 'bn'
                    ? 'ইনস্ট্যান্ট গেটওয়েতে সফলভাবে পেমেন্ট করার পর স্বয়ংক্রিয়ভাবে অতিরিক্ত শেয়ার আপনার অ্যাকাউন্টে যুক্ত হবে।'
                    : 'Instant Automatic Payment Gateway will verify your transaction immediately and update your portfolio.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowIncreaseSharesModal(false)}
                  className="w-1/3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowIncreaseSharesModal(false);
                    setShowPaymentSelectionModal(true);
                  }}
                  className="w-2/3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>{language === 'bn' ? `পরবর্তী: ৳${(additionalSharePercent * 2000).toLocaleString()} পে করুন` : `Pay ৳${(additionalSharePercent * 2000).toLocaleString()}`}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAYMENT SELECTION & CHANNEL MODALS (Matching Reseller Registration Gateway)
      ========================================================================== */}
      {/* 1. Payment Method Selection Modal */}
      <PaymentMethodSelectionModal
        isOpen={showPaymentSelectionModal}
        onClose={() => setShowPaymentSelectionModal(false)}
        amount={additionalSharePercent * 2000}
        invoiceId={currentInvoiceId}
        paymentType="share_purchase"
        onConfirmPayment={(channel) => {
          setSelectedPaymentChannel(channel);
          setShowPaymentSelectionModal(false);
          setPaymentErrorMessage('');
          if (channel === 'bkash') setShowBkashModal(true);
          else if (channel === 'nagad') setShowNagadModal(true);
          else if (channel === 'rocket') setShowRocketModal(true);
          else if (channel === 'upay') setShowUpayModal(true);
        }}
      />

      {/* 2. bKash Payment Modal */}
      <BkashPaymentModal
        isOpen={showBkashModal}
        onClose={() => {
          setShowBkashModal(false);
          setPaymentErrorMessage('');
        }}
        onBack={() => {
          setShowBkashModal(false);
          setShowPaymentSelectionModal(true);
        }}
        amount={additionalSharePercent * 2000}
        invoiceId={currentInvoiceId}
        isSubmitting={increaseShareSubmitting}
        errorMessage={paymentErrorMessage}
        onVerify={(trxId) => handleCompleteIncreaseSharePayment('bkash', trxId)}
      />

      {/* 3. Nagad Payment Modal */}
      <NagadPaymentModal
        isOpen={showNagadModal}
        onClose={() => {
          setShowNagadModal(false);
          setPaymentErrorMessage('');
        }}
        onBack={() => {
          setShowNagadModal(false);
          setShowPaymentSelectionModal(true);
        }}
        amount={additionalSharePercent * 2000}
        invoiceId={currentInvoiceId}
        isSubmitting={increaseShareSubmitting}
        errorMessage={paymentErrorMessage}
        onVerify={(trxId) => handleCompleteIncreaseSharePayment('nagad', trxId)}
      />

      {/* 4. Rocket Payment Modal */}
      <RocketPaymentModal
        isOpen={showRocketModal}
        onClose={() => {
          setShowRocketModal(false);
          setPaymentErrorMessage('');
        }}
        onBack={() => {
          setShowRocketModal(false);
          setShowPaymentSelectionModal(true);
        }}
        amount={additionalSharePercent * 2000}
        invoiceId={currentInvoiceId}
        isSubmitting={increaseShareSubmitting}
        errorMessage={paymentErrorMessage}
        onVerify={(trxId) => handleCompleteIncreaseSharePayment('rocket', trxId)}
      />

      {/* 5. Upay Payment Modal */}
      <UpayPaymentModal
        isOpen={showUpayModal}
        onClose={() => {
          setShowUpayModal(false);
          setPaymentErrorMessage('');
        }}
        onBack={() => {
          setShowUpayModal(false);
          setShowPaymentSelectionModal(true);
        }}
        amount={additionalSharePercent * 2000}
        invoiceId={currentInvoiceId}
        isSubmitting={increaseShareSubmitting}
        errorMessage={paymentErrorMessage}
        onVerify={(trxId) => handleCompleteIncreaseSharePayment('upay', trxId)}
      />

      <Footer />
    </div>
  );
}

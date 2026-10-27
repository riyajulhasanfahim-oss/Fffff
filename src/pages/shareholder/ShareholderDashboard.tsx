import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
import { rtdbGet } from '../../lib/rtdb';
import {
  getShareholderPortfolioFromFirestore,
  getShareholderPaymentsFromFirestore,
  getShareholderCertificateFromFirestore,
  getShareholderWithdrawalsFromFirestore,
  getEligibleCompanyRevenueFromFirestore,
  submitShareholderWithdrawalToFirestore
} from '../../services/shareholderFirestoreService';
import OfficialShareCertificateModal, { CertificateData } from '../../components/shareholder/OfficialShareCertificateModal';
import { 
  Building2, 
  PieChart, 
  Coins, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  ArrowLeft, 
  Plus, 
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
  Info
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

  // Strict Authentication Check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/shareholder-dashboard' } });
    }
  }, [user, authLoading, navigate]);

  // Fetch strictly the authenticated user's shareholder dashboard data
  // Cloud Firestore is the authoritative Single Source of Truth
  const fetchDashboardData = async (isBackground = false) => {
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

        // Assemble unified summary (Section B & C)
        setSummary({
          shareholderId: currentShareholderId,
          shareholderStatus: 'Active Shareholder',
          approvedSharePercentage: approvedSharePercent,
          totalAmountPaidForApprovedShares: totalPaid,
          totalEligibleRevenue: fsRevenue.totalEligibleRevenue || serverData?.summary?.totalEligibleRevenue || 0,
          totalEarnedCommission: serverData?.summary?.totalEarnedCommission || 0,
          pendingCommission: serverData?.summary?.pendingCommission || 0,
          approvedCommission: serverData?.summary?.approvedCommission || 0,
          paidCommission: serverData?.summary?.paidCommission || 0,
          availableWithdrawBalance: serverData?.summary?.availableWithdrawBalance || 0
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

      <main className="flex-grow pt-3 sm:pt-6 pb-20 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 no-scrollbar">
            <button 
              type="button"
              onClick={() => navigate('/company-share')} 
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer font-medium shrink-0 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'bn' ? 'শেয়ার পোর্টাল' : 'Share Portal'}</span>
            </button>
            <span>/</span>
            <Link to="/" className="hover:text-primary-main shrink-0">Home</Link>
            <span>/</span>
            <Link to="/company-share" className="hover:text-primary-main shrink-0">
              {language === 'bn' ? 'কোম্পানি শেয়ার' : 'Company Share'}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold shrink-0">
              {language === 'bn' ? 'শেয়ারহোল্ডার ড্যাশবোর্ড' : 'Shareholder Dashboard'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboardData()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
            title="Refresh Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary-main' : ''}`} />
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
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>RJ WORLD BD • Verified Shareholder</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                    {profile?.fullName || profile?.applicantName || 'Valued Shareholder'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-3 flex-wrap">
                    <span>ID: <strong className="text-white font-mono">{shareholderId}</strong></span>
                    <span>·</span>
                    <span>Ownership: <strong className="text-amber-400 font-bold">{summary?.approvedSharePercentage || 1}%</strong></span>
                    <span>·</span>
                    <span>Status: <strong className="text-emerald-400">Active</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (certificate) setShowCertificateModal(true);
                      else toast.error(language === 'bn' ? 'সার্টিফিকেট প্রস্তুত হচ্ছে...' : 'Certificate is being prepared.');
                    }}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{language === 'bn' ? 'সার্টিফিকেট দেখুন' : 'View Certificate'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('withdrawals')}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>{language === 'bn' ? 'উত্তোলন' : 'Withdraw'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* =========================================================================
                SECTION I: DASHBOARD NAVIGATION BAR (DESKTOP & MOBILE RESPONSIVE)
            ========================================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-2xs overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 min-w-max">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeNavTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveNavTab(tab.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-primary-main' : 'text-slate-400'}`} />
                      <span>{language === 'bn' ? tab.labelBn : tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
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
                TAB 1: OVERVIEW (High-Level KPIs & Snapshot)
            ========================================================================== */}
            {activeNavTab === 'overview' && (
              <div className="space-y-6">
                {/* 4 Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Share Ownership */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-semibold">Share Ownership</span>
                      <Coins className="w-4 h-4 text-primary-main" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {summary?.approvedSharePercentage || 1}%
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {summary?.approvedSharePercentage || 1} units @ ৳2,000/1%
                    </p>
                  </div>

                  {/* Portfolio Capital Value */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-semibold">Total Paid Capital</span>
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      ৳{Number(summary?.totalAmountPaidForApprovedShares || 2000).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium mt-1">
                      Verified & Fully Paid
                    </p>
                  </div>

                  {/* Calculated Allocation */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                      <span className="text-xs font-semibold">Calculated Allocation</span>
                      <TrendingUp className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      ৳{Number(summary?.totalEarnedCommission || 0).toLocaleString()}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      From recorded revenue pools
                    </p>
                  </div>

                  {/* Available Withdrawable Balance */}
                  <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-300 mb-2">
                      <span className="text-xs font-semibold">Available for Withdrawal</span>
                      <Wallet className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black text-white">
                      ৳{Number(summary?.availableWithdrawBalance || 0).toLocaleString()}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-slate-400">Min: ৳100</span>
                      <button
                        type="button"
                        onClick={() => setActiveNavTab('withdrawals')}
                        className="text-amber-400 font-bold hover:underline"
                      >
                        Withdraw &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Revenue Snapshot (Section D summary) */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary-main" />
                      <span>Company Revenue Pools Snapshot (কোম্পানি রাজস্ব উৎস)</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveNavTab('revenue')}
                      className="text-xs text-primary-main font-bold hover:underline flex items-center gap-1"
                    >
                      <span>View Full Breakdown</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {revenueSources.map((source) => (
                      <div key={source.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {language === 'bn' ? source.titleBn : source.title}
                        </span>
                        <div className="text-lg font-black text-slate-800">
                          ৳{Number(source.totalEligibleRevenue || 0).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 flex justify-between">
                          <span>Shareholder Allocation:</span>
                          <span className="font-bold text-emerald-600">৳{Number(source.calculatedCommission || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Policy Notice:</strong> Calculations are strictly derived from verified transactions in the company database according to the official corporate agreement. Allocations represent business benefit distributions and do not guarantee any fixed returns or monthly income.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 2: MY SHARES (Section B - Share Ownership Summary)
            ========================================================================== */}
            {activeNavTab === 'shares' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Coins className="w-4 h-4 text-primary-main" />
                      <span>Section B: Share Ownership Summary (শেয়ার মালিকানা বিবরণী)</span>
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Verified & Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Purchased Percentage</span>
                      <span className="text-xl font-black text-primary-main block mt-1">
                        {summary?.approvedSharePercentage || 1}%
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Corporate Equity</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Share Units Owned</span>
                      <span className="text-xl font-black text-slate-900 block mt-1">
                        {summary?.approvedSharePercentage || 1} Units
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Rate: ৳2,000 per 1% share</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Total Capital Paid</span>
                      <span className="text-xl font-black text-emerald-600 block mt-1">
                        ৳{Number(summary?.totalAmountPaidForApprovedShares || 2000).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-emerald-700 block mt-0.5">100% Verified Paid</span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Share Issuance Status</span>
                      <span className="text-base font-bold text-slate-900 block mt-1">
                        Officially Issued
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">Recorded in Registry</span>
                    </div>
                  </div>

                  {/* Payment Record Details */}
                  {transactions.sharePurchases.length > 0 && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Verified Purchase Record
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payment Transaction ID</span>
                          <span className="font-mono font-bold text-slate-900">
                            {transactions.sharePurchases[0].transactionId || 'Verified Record'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Payment Method</span>
                          <span className="font-bold text-slate-900">
                            {transactions.sharePurchases[0].paymentMethod || 'bKash/Nagad'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Verification Date</span>
                          <span className="font-medium text-slate-700">
                            {transactions.sharePurchases[0].verifiedAt 
                              ? new Date(transactions.sharePurchases[0].verifiedAt).toLocaleDateString('en-GB') 
                              : 'Verified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 3: SHARE CERTIFICATE (Section C)
            ========================================================================== */}
            {activeNavTab === 'certificate' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Section C: Official Share Certificate (শেয়ার সার্টিফিকেট)</span>
                    </h2>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Corporate Certified
                    </span>
                  </div>

                  {certificate ? (
                    <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/50 rounded-3xl border-2 border-amber-300 p-6 sm:p-10 text-center space-y-6 shadow-sm relative overflow-hidden">
                      <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400 flex items-center justify-center mx-auto text-amber-600">
                        <Award className="w-8 h-8" />
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs uppercase tracking-widest text-amber-700 font-bold block">
                          RJ WORLD BD • Equity Shareholder
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                          {certificate.shareholderName}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          Certificate No: {certificate.certificateNumber}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-xs py-3 border-y border-amber-200">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Shareholder ID</span>
                          <span className="font-mono font-bold text-slate-900">{certificate.shareholderId}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Ownership</span>
                          <span className="font-bold text-primary-main">{certificate.approvedSharePercentage}% Equity</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Capital Paid</span>
                          <span className="font-bold text-emerald-600">৳{Number(certificate.verifiedPurchaseAmount).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Issue Date</span>
                          <span className="font-medium text-slate-800">
                            {new Date(certificate.issueDate).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowCertificateModal(true)}
                          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Official Certificate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCertificateModal(true)}
                          className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Print Document</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">Official Certificate Pending Issuance</p>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Final share certificate is issued strictly after legitimate payment verification and registry issuance approval.
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
              <div className="space-y-6">
                {/* 3 Categories Required by Section D */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary-main" />
                      <span>Section D: Company Revenue & Shareholder Benefits</span>
                    </h2>
                    <span className="text-xs font-semibold text-slate-500">
                      Approved Rate: {summary?.approvedSharePercentage || 1}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Displaying the 3 designated corporate revenue pools with verified income and calculated shareholder benefits.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {revenueSources.map((source, idx) => (
                      <div key={source.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-primary-main bg-primary-main/10 px-2 py-0.5 rounded-md">
                            Category {idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {source.transactionCount} Verified Records
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            {language === 'bn' ? source.titleBn : source.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {source.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/80 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Company Revenue:</span>
                            <span className="font-bold text-slate-900">৳{Number(source.totalEligibleRevenue).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Applicable Benefit Rate:</span>
                            <span className="font-bold text-primary-main">{source.approvedCommissionPercentage}%</span>
                          </div>
                          <div className="flex justify-between text-emerald-700 bg-emerald-50/70 p-2 rounded-lg font-bold">
                            <span>Calculated Allocation:</span>
                            <span>৳{Number(source.calculatedCommission).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Paid Out:</span>
                            <span className="text-slate-700 font-mono">৳{Number(source.paidCommission).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Remaining Payable:</span>
                            <span className="text-slate-700 font-mono">৳{Number(source.pendingCommission).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Section E: Monthly Earnings Summary */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Section E: Monthly Earnings Summary (মাসিক আয়ের বিবরণী)
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Derived from database transactions. Shows 0 when no eligible transactions exist.
                        </p>
                      </div>

                      {/* Date / Month Filter */}
                      <select
                        value={selectedMonthFilter}
                        onChange={(e) => setSelectedMonthFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                      >
                        <option value="all">All Months</option>
                        {monthlyHistory.map(m => (
                          <option key={m.monthKey} value={m.monthKey}>{m.monthName}</option>
                        ))}
                      </select>
                    </div>

                    {filteredMonthlyHistory.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Month</th>
                              <th className="py-2.5 px-3">Revenue Category</th>
                              <th className="py-2.5 px-3">Eligible Revenue</th>
                              <th className="py-2.5 px-3">Rate</th>
                              <th className="py-2.5 px-3">Allocation</th>
                              <th className="py-2.5 px-3">Paid</th>
                              <th className="py-2.5 px-3">Remaining</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {filteredMonthlyHistory.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{item.monthName}</td>
                                <td className="py-2.5 px-3 text-slate-600">{item.revenueCategory}</td>
                                <td className="py-2.5 px-3 font-mono">৳{Number(item.eligibleRevenue).toLocaleString()}</td>
                                <td className="py-2.5 px-3 font-bold text-primary-main">{item.applicableCommissionPercentage}%</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">৳{Number(item.commissionEarned).toLocaleString()}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">৳{Number(item.amountPaid).toLocaleString()}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">৳{Number(item.remainingPayableAmount).toLocaleString()}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                    {item.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
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
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <History className="w-4 h-4 text-primary-main" />
                      <span>Section F: Payment and Transaction History</span>
                    </h2>

                    {/* Sub-Tabs: Purchases, Payments, Commissions, Withdrawals */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab('purchases')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          activeHistoryTab === 'purchases' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Share Purchases ({transactions.sharePurchases.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab('withdrawals')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          activeHistoryTab === 'withdrawals' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Withdrawals ({transactions.withdrawals.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveHistoryTab('commissions')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Transaction ID</th>
                            <th className="py-2.5 px-3">Application ID</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Share %</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Payment Status</th>
                            <th className="py-2.5 px-3">Verification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {transactions.sharePurchases.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.transactionId || 'N/A'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{p.id || p.applicationId}</td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {new Date(p.submissionTimestamp || p.createdAt || Date.now()).toLocaleDateString('en-GB')}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-primary-main">{p.sharePercent}%</td>
                              <td className="py-2.5 px-3 font-mono font-bold">৳{Number(p.totalAmount || 2000).toLocaleString()}</td>
                              <td className="py-2.5 px-3">{p.paymentMethod || 'bKash'}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.paymentStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.paymentStatus || 'Pending'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{p.status === 'approved' ? 'Verified' : 'Pending Review'}</span>
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
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Request ID</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Amount</th>
                              <th className="py-2.5 px-3">Method</th>
                              <th className="py-2.5 px-3">Account</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {transactions.withdrawals.map((w, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{w.id}</td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {new Date(w.requestedAt || w.createdAt || Date.now()).toLocaleDateString('en-GB')}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                                  ৳{Number(w.amount || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3">{w.paymentMethod}</td>
                                <td className="py-2.5 px-3 font-mono">{w.accountNumber}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                        <div className="p-6 text-center bg-slate-50 text-xs text-slate-500">
                          No withdrawal transactions yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Allocations Table */}
                  {activeHistoryTab === 'commissions' && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      {transactions.commissions.length > 0 ? (
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Allocation Ref</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Eligible Pool</th>
                              <th className="py-2.5 px-3">Rate</th>
                              <th className="py-2.5 px-3">Calculated Benefit</th>
                              <th className="py-2.5 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {transactions.commissions.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{c.id}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-medium">{c.category}</td>
                                <td className="py-2.5 px-3 font-mono">৳{Number(c.eligibleRevenue || 0).toLocaleString()}</td>
                                <td className="py-2.5 px-3 font-bold text-primary-main">{c.rate}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">৳{Number(c.amount || 0).toLocaleString()}</td>
                                <td className="py-2.5 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-6 text-center bg-slate-50 text-xs text-slate-500">
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
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary-main" />
                      <span>Section G: Shareholder Withdrawal Section (লভ্যাংশ উত্তোলন)</span>
                    </h2>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      Available: ৳{Number(summary?.availableWithdrawBalance || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Withdrawal Form */}
                    <div className="md:col-span-1 bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <Send className="w-3.5 h-3.5 text-primary-main" />
                        <span>Request Payout</span>
                      </h3>

                      <form onSubmit={handleWithdrawSubmit} className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
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
                            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-main font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Payout Method *
                          </label>
                          <select
                            value={withdrawMethod}
                            onChange={(e) => setWithdrawMethod(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-main font-medium"
                          >
                            <option value="bKash">bKash (বিকাশ)</option>
                            <option value="Nagad">Nagad (নগদ)</option>
                            <option value="Rocket">Rocket (রকেট)</option>
                            <option value="Bank">Bank Account (ব্যাংক অ্যাকাউন্ট)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Recipient Account Number *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 01XXXXXXXXX or Bank A/C"
                            value={withdrawAccount}
                            onChange={(e) => setWithdrawAccount(e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-main font-mono"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={withdrawSubmitting || !withdrawAmount || Number(withdrawAmount) < 100 || Number(withdrawAmount) > (summary?.availableWithdrawBalance || 0)}
                          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {withdrawSubmitting ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Submit Withdrawal Request</span>
                        </button>
                      </form>
                    </div>

                    {/* Withdrawal Guidelines and Status */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-sky-50 rounded-2xl border border-sky-100 p-4 space-y-2 text-xs text-slate-700">
                        <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-primary-main" />
                          <span>Official Withdrawal Protocol</span>
                        </h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                          <li>Withdrawal requests are processed strictly from verified available benefits balance.</li>
                          <li>Minimum single withdrawal amount is ৳100 BDT.</li>
                          <li>Corporate finance approves and disburses payouts to the authorized recipient account within 24-48 business hours.</li>
                        </ul>
                      </div>

                      {/* Withdrawal History Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        {transactions.withdrawals.length > 0 ? (
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                              <tr>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Amount</th>
                                <th className="py-2.5 px-3">Method</th>
                                <th className="py-2.5 px-3">Account</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {transactions.withdrawals.map((w, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3 text-slate-600">
                                    {new Date(w.requestedAt || w.createdAt || Date.now()).toLocaleDateString('en-GB')}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    ৳{Number(w.amount || 0).toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3 font-medium">{w.paymentMethod}</td>
                                  <td className="py-2.5 px-3 font-mono">{w.accountNumber}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                          <div className="p-6 text-center text-xs text-slate-500">
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
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-main" />
                      <span>Section H: Shareholder Notifications (বিজ্ঞপ্তি ও নোটিফিকেশন)</span>
                    </h2>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      {notifications.length} Updates
                    </span>
                  </div>

                  {notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.map((item) => (
                        <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary-main/10 text-primary-main flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5 flex-grow">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">
                                {language === 'bn' && item.titleBn ? item.titleBn : item.title}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(item.timestamp).toLocaleDateString('en-GB')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {language === 'bn' && item.messageBn ? item.messageBn : item.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl text-xs text-slate-500">
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
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <User className="w-4 h-4 text-primary-main" />
                      <span>Section A: Shareholder Profile (শেয়ারহোল্ডার প্রোফাইল)</span>
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Verified Member
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Full Name</span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base block mt-1 truncate">
                        {profile?.fullName || profile?.applicantName || user?.displayName || 'Registered Shareholder'}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Registered Email</span>
                      <span className="font-bold text-slate-900 text-sm block mt-1 truncate">
                        {profile?.email || user?.email || 'N/A'}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Shareholder ID</span>
                      <span className="font-mono font-bold text-primary-main text-sm sm:text-base block mt-1">
                        {shareholderId}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Account Activation Date</span>
                      <span className="font-bold text-slate-900 block mt-1">
                        {profile?.accountCreationDate ? new Date(profile.accountCreationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Active'}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Primary Application ID</span>
                      <span className="font-mono font-bold text-slate-800 text-xs sm:text-sm block mt-1 truncate">
                        {profile?.applicationId || transactions.sharePurchases[0]?.id || 'N/A'}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Payment Verification Status</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{profile?.paymentVerificationStatus || 'Verified'}</span>
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Shareholder Account Status</span>
                      <span className="font-bold text-slate-900 block mt-1">
                        {profile?.shareholderAccountStatus || 'Active Shareholder'}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Registered Phone</span>
                      <span className="font-mono font-bold text-slate-900 block mt-1">
                        {profile?.phone || userData?.phone || 'N/A'}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-slate-400 block text-[11px] font-medium">Official Address</span>
                      <span className="font-medium text-slate-800 block mt-1 truncate">
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

      <Footer />
    </div>
  );
}

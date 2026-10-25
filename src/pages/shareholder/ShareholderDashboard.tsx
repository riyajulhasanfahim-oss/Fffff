import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
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
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [transactions, setTransactions] = useState<TransactionHistories>({
    sharePurchases: [],
    payments: [],
    commissions: [],
    withdrawals: []
  });
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [profile, setProfile] = useState<any>(null);

  // UI Tabs & Modals
  const [activeHistoryTab, setActiveHistoryTab] = useState<'purchases' | 'payments' | 'commissions' | 'withdrawals'>('purchases');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<any | null>(null);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);

  // Strict Authentication Check
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/shareholder-dashboard' } });
    }
  }, [user, authLoading, navigate]);

  // Fetch strictly the authenticated user's shareholder dashboard data
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setRefreshing(true);
      const token = await user.getIdToken().catch(() => '');
      const headers: Record<string, string> = {
        'x-user-id': user.uid
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/shareholders/me', { headers });
      const data = await res.json();

      if (data && data.success) {
        setDashboardStatus(data.shareholderStatus || 'none');
        setSummary(data.summary || null);
        setRevenueSources(data.revenueSources || []);
        setMonthlyHistory(data.monthlyIncomeHistory || []);
        setTransactions(data.transactionHistory || {
          sharePurchases: [],
          payments: [],
          commissions: [],
          withdrawals: []
        });
        setCertificate(data.certificate || null);
        setProfile(data.profile || null);
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

  // Handle Withdrawal Request Submission
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amount = Number(withdrawAmount);
    if (!amount || amount < 100) {
      toast.error(language === 'bn' ? 'সর্বনিম্ন উত্তোলনের পরিমাণ ১০০ টাকা।' : 'Minimum withdrawal amount is ৳100.');
      return;
    }
    if (summary && amount > summary.availableWithdrawBalance) {
      toast.error(language === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স।' : 'Insufficient available commission balance.');
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
        setShowWithdrawModal(false);
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

  const shareholderId = summary?.shareholderId || `RJ-SH-${(user?.uid || '000000').slice(0, 8).toUpperCase()}`;

  // Filter monthly breakdown
  const filteredMonthlyHistory = selectedMonthFilter === 'all' 
    ? monthlyHistory 
    : monthlyHistory.filter(m => m.monthKey === selectedMonthFilter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-4 sm:pt-6 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Top Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm text-slate-500 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <button 
              type="button"
              onClick={() => navigate('/company-share')} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer font-medium shrink-0"
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
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Refresh Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary-main' : ''}`} />
            <span className="hidden sm:inline">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
          </button>
        </div>

        {/* =========================================================================
            STATE 1: NO SHAREHOLDER APPLICATION FOUND (TASK 1)
        ========================================================================== */}
        {dashboardStatus === 'none' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-14 text-center max-w-2xl mx-auto my-8">
            <div className="w-20 h-20 rounded-3xl bg-sky-50 border border-sky-100 text-primary-main flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Building2 className="w-10 h-10" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 mb-3">
              {language === 'bn' ? 'কোনো সক্রিয় শেয়ার নেই' : 'No Active Shareholding'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
              {language === 'bn' ? 'আপনি এখনও RJ WORLD BD-এর শেয়ারহোল্ডার নন' : 'You are not yet a verified shareholder'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto mb-8">
              {language === 'bn' 
                ? 'কোম্পানির শেয়ারহোল্ডার হয়ে বাৎসরিক ব্যবসায়িক শেয়ারিংয়ে অংশ নিতে মাত্র ২,০০০ টাকায় ১% শেয়ার কিনে আপনার আবেদন সম্পন্ন করুন।'
                : 'Join RJ WORLD BD corporate equity ownership. Select your desired share percentage starting at ৳2,000 per 1% share to initiate an application.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
            STATE 2: PENDING VERIFICATION STATE (TASK 1 & STEP 3 ALIGNMENT)
        ========================================================================== */}
        {dashboardStatus === 'pending_verification' && (
          <div className="space-y-6 max-w-4xl mx-auto my-6">
            {/* Pending Notice Hero */}
            <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3 border border-white/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Administrator Verification</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
                  {language === 'bn' ? 'আপনার শেয়ার পেমেন্ট যাচাইকরণের অপেক্ষায় আছে' : 'Your Share Purchase is Under Review'}
                </h1>
                <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
                  "Your payment details have been submitted successfully. Your application will remain pending until an authorized administrator verifies your payment."
                </p>
              </div>
              <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* Application Detail Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {language === 'bn' ? 'আবেদনের বিবরণ' : 'Submitted Application Details'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Shareholder ID Reference: <strong className="font-mono text-slate-800">{shareholderId}</strong>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Verification</span>
                </span>
              </div>

              {transactions.payments.length > 0 ? (
                <div className="space-y-4">
                  {transactions.payments.map((p) => (
                    <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Application ID</span>
                        <span className="font-mono font-bold text-slate-800 text-sm">{p.applicationId || p.id}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Shares Requested</span>
                        <span className="font-bold text-primary-main text-sm">{p.sharePercent}% ({p.shareUnits || p.sharePercent} Units)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Total Amount</span>
                        <span className="font-black text-slate-900 text-sm">৳{p.totalAmount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Payment Method / TrxID</span>
                        <span className="font-bold text-slate-800 text-sm">{p.paymentMethod}</span>
                        <span className="font-mono text-slate-500 text-[11px] block">{p.transactionId}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4">
                  No payment record details available for this session.
                </div>
              )}

              {/* Security & Access Restriction Notice */}
              <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3 text-xs text-slate-600">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  {language === 'bn'
                    ? 'অনুমোদন সম্পন্ন না হওয়া পর্যন্ত শেয়ারহোল্ডারদের আর্থিক ও লভ্যাংশ ড্যাশবোর্ড সক্রিয় করা হয় না। একজন অনুমোদিত প্রশাসক আপনার পেমেন্ট নিরীক্ষা করার পর স্বয়ংক্রিয়ভাবে আপনার ড্যাশবোর্ড এবং অফিশিয়াল শেয়ার সার্টিফিকেট আনলক হবে।'
                    : 'Financial revenue tracking and official share certificates unlock automatically once an authorized corporate administrator ratifies your submitted payment.'}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/company-share"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'bn' ? 'আরেকটি শেয়ারের জন্য আবেদন করুন' : 'Submit Another Request'}</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 3: REJECTED STATE (TASK 1)
        ========================================================================== */}
        {dashboardStatus === 'rejected' && (
          <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-50 text-red-700 mb-2 border border-red-200">
              Payment Verification Rejected
            </span>
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              {language === 'bn' ? 'আপনার শেয়ার আবেদনটি প্রত্যাখ্যাত হয়েছে' : 'Your Payment Verification Was Rejected'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              {transactions.payments[0]?.rejectionReason 
                ? `Reason: "${transactions.payments[0].rejectionReason}"`
                : 'The submitted transaction details could not be verified by the administrator.'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/company-share"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-main hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন করে আবেদন করুন' : 'Apply Again'}</span>
              </Link>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 4: FULL APPROVED & ACTIVE SHAREHOLDER DASHBOARD (TASKS 1-7)
        ========================================================================== */}
        {dashboardStatus === 'approved' && summary && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Shareholder Identity Hero */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400/20 to-primary-main/30 border border-sky-400/30 backdrop-blur-md flex items-center justify-center shrink-0 text-sky-300 shadow-inner">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Equity Partner</span>
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {summary.shareholderId}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                      <span>{profile?.applicantName || userData?.name || user?.displayName || 'Registered Shareholder'}</span>
                      <ShieldCheck className="w-6 h-6 text-sky-400" />
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                      {user?.email} {profile?.phone ? `• ${profile.phone}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {certificate && (
                    <button
                      type="button"
                      onClick={() => setShowCertificateModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold text-xs transition-all cursor-pointer shadow-sm"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>{language === 'bn' ? 'অফিসিয়াল সার্টিফিকেট' : 'Official Certificate'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowProfileModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold text-xs transition-all cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
                  </button>

                  <Link
                    to="/company-share"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-primary-main hover:brightness-110 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'bn' ? 'আরও শেয়ার কিনুন' : 'Buy More Shares'}</span>
                  </Link>
                </div>
              </div>

              <div className="absolute right-0 top-0 w-96 h-96 bg-primary-main/15 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* STATUTORY NOTICE: Returns or Dividends Are Not Guaranteed (Task 2 & Anti-Speculation Rule) */}
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 sm:p-5 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
                  <span className="font-black text-amber-950 uppercase tracking-wide mr-1.5">
                    {language === 'bn' ? 'সংবিধিবদ্ধ সতর্কীকরণ:' : 'Statutory Transparency Notice:'}
                  </span>
                  {language === 'bn'
                    ? 'কোম্পানি শেয়ারে কোনো নিশ্চিত বা নির্দিষ্ট মাসিক আয় গ্যারান্টি করা হয় না। বাৎসরিক নিরীক্ষিত ব্যবসায়িক রাজস্ব এবং অনুমোদিত নীতিমালার ওপর ভিত্তি করে লভ্যাংশ বণ্টিত হয়।'
                    : 'Shareholder equity returns or dividends are strictly not guaranteed and do not represent fixed monthly earnings. Commission allocations are derived strictly from verified operating revenues.'}
                </div>
              </div>
            </div>

            {/* =========================================================================
                TASK 2: EXACT 9 SHAREHOLDER SUMMARY CARDS
            ========================================================================== */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary-main" />
                  <span>{language === 'bn' ? 'শেয়ারহোল্ডার সারাংশ' : 'Shareholder Financial Summary'}</span>
                </h2>
                <span className="text-[11px] font-semibold text-slate-500">
                  {language === 'bn' ? 'নিরীক্ষিত রিয়েল-টাইম তথ্য' : 'Verified Real Database Records'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {/* 1. Shareholder ID */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Shareholder ID
                    </span>
                    <UserCheck className="w-4 h-4 text-primary-main" />
                  </div>
                  <div className="text-lg sm:text-xl font-mono font-black text-slate-900 truncate">
                    {summary.shareholderId}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Unique verified corporate identity
                  </p>
                </div>

                {/* 2. Shareholder Status */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Shareholder Status
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{summary.shareholderStatus}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Activated & legally ratified
                  </p>
                </div>

                {/* 3. Approved Share Percentage */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Approved Share %
                    </span>
                    <PieChart className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-primary-main">
                    {summary.approvedSharePercentage}%
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {summary.approvedSharePercentage} equity units @ 1% per unit
                  </p>
                </div>

                {/* 4. Total Amount Paid for Approved Shares */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Paid for Shares
                    </span>
                    <Coins className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    ৳{summary.totalAmountPaidForApprovedShares?.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fixed rate ৳2,000 per 1% share
                  </p>
                </div>

                {/* 5. Total Eligible Revenue */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Eligible Revenue
                    </span>
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    ৳{summary.totalEligibleRevenue?.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Across all verified corporate channels
                  </p>
                </div>

                {/* 6. Total Earned Commission */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Earned Commission
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                    ৳{summary.totalEarnedCommission?.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Calculated on {summary.approvedSharePercentage}% equity stake
                  </p>
                </div>

                {/* 7. Pending Commission */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Pending Commission
                    </span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-600">
                    ৳{summary.pendingCommission?.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>Available to request</span>
                    {summary.availableWithdrawBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowWithdrawModal(true)}
                        className="text-[11px] font-bold text-primary-main hover:underline cursor-pointer"
                      >
                        Withdraw ➔
                      </button>
                    )}
                  </p>
                </div>

                {/* 8. Approved Commission */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Approved Commission
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    ৳{summary.approvedCommission?.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Verified by internal financial ledger
                  </p>
                </div>

                {/* 9. Paid Commission */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Paid Commission
                    </span>
                    <Wallet className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    ৳{summary.paidCommission?.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Disbursed to shareholder account
                  </p>
                </div>
              </div>
            </div>

            {/* =========================================================================
                TASK 3: REVENUE SOURCES
            ========================================================================== */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-primary-main" />
                    <span>{language === 'bn' ? 'রাজস্ব উৎস ও লভ্যাংশ বণ্টন' : 'Revenue Sources & Commission Allocations'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'bn'
                      ? 'অনুমোদিত রাজস্ব খাত থেকে শেয়ারহোল্ডারের অর্জিত অর্থের সঠিক বিভাজন'
                      : 'Live revenue calculations derived exclusively from verified system transactions'}
                  </p>
                </div>
                <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl font-semibold self-start sm:self-auto">
                  Stake: <strong>{summary.approvedSharePercentage}%</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {revenueSources.map((source, index) => (
                  <div 
                    key={source.id} 
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                          Channel 0{index + 1}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {source.transactionCount} transactions
                        </span>
                      </div>
                      <h3 className="font-black text-slate-900 text-base mb-1">
                        {language === 'bn' ? source.titleBn : source.title}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                        {source.description}
                      </p>

                      <div className="space-y-2.5 pt-3 border-t border-slate-200 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Eligible Revenue:</span>
                          <span className="font-bold text-slate-900">৳{source.totalEligibleRevenue?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Commission Rate:</span>
                          <span className="font-bold text-primary-main">{source.approvedCommissionPercentage}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Calculated Share:</span>
                          <span className="font-black text-emerald-600 text-sm">৳{source.calculatedCommission?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span className="text-slate-400">Pending / Paid:</span>
                          <span className="text-slate-600 font-mono">
                            ৳{source.pendingCommission} / ৳{source.paidCommission}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Commission Rule Transparency Callout */}
              <div className="mt-6 p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-start gap-3 text-xs text-sky-950">
                <FileCheck2 className="w-4 h-4 text-primary-main shrink-0 mt-0.5" />
                <p>
                  <strong>Audited Accounting Rules:</strong> Commissions are strictly calculated only when the applicable transaction is paid, confirmed, and ratified. Unpaid, cancelled, or refunded items are never included in eligible corporate revenue.
                </p>
              </div>
            </div>

            {/* =========================================================================
                TASK 4: MONTHLY INCOME HISTORY & BREAKDOWN
            ========================================================================== */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-main" />
                    <span>{language === 'bn' ? 'মাসিক আয়ের বিবরণী' : 'Monthly Income History'}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === 'bn'
                      ? 'বাস্তব লেনদেনের ভিত্তিতে সংরক্ষিত মাসিক লভ্যাংশ বিবরণ'
                      : 'Historical earnings breakdown strictly recorded from actual operations'}
                  </p>
                </div>

                {/* Month Selector Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">{language === 'bn' ? 'মাস বাছাই:' : 'Period:'}</span>
                  <select
                    value={selectedMonthFilter}
                    onChange={(e) => setSelectedMonthFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-main cursor-pointer"
                  >
                    <option value="all">All Recorded Months</option>
                    {monthlyHistory.map((m) => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.monthName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredMonthlyHistory.length === 0 ? (
                /* Empty state required by Task 4 */
                <div className="py-12 text-center max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Coins className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">
                    {language === 'bn' ? 'কোনো মাসিক আয় রেকর্ড পাওয়া যায়নি (৳০)' : 'No Recorded Monthly Income (৳0)'}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {language === 'bn'
                      ? 'নির্বাচিত মাসে কোনো নিরীক্ষিত লভ্যাংশ অর্জিত হয়নি। নিয়ম অনুযায়ী নমুনা বা কাল্পনিক কোনো ডেটা প্রদর্শন করা হয় না।'
                      : 'No verified corporate revenue distributions exist for this period. As per corporate policy, sample earnings or false guarantees are never displayed.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Month & Year</th>
                        <th className="py-3 px-4">Revenue Category</th>
                        <th className="py-3 px-4">Eligible Revenue</th>
                        <th className="py-3 px-4">Commission %</th>
                        <th className="py-3 px-4">Commission Earned</th>
                        <th className="py-3 px-4">Amount Paid</th>
                        <th className="py-3 px-4">Remaining Payable</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMonthlyHistory.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{item.monthName}</td>
                          <td className="py-3.5 px-4 text-slate-600">{item.revenueCategory}</td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-800">৳{item.eligibleRevenue?.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-bold text-primary-main">{item.applicableCommissionPercentage}%</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">৳{item.commissionEarned?.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-slate-600">৳{item.amountPaid?.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-black text-amber-600">৳{item.remainingPayableAmount?.toLocaleString()}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* =========================================================================
                TASK 5: TRANSACTION HISTORY (PURCHASE, PAYMENT, COMMISSION, WITHDRAWAL)
            ========================================================================== */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900">
                      {language === 'bn' ? 'লেনদেনের পূর্ণাঙ্গ বিবরণী' : 'Shareholder Transaction History'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === 'bn'
                        ? 'আপনার অ্যাকাউন্টের সাথে জড়িত সমস্ত শেয়ার ও পেমেন্ট হিস্ট্রি'
                        : 'Private transaction and audit logs strictly scoped to your authenticated account'}
                    </p>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setActiveHistoryTab('purchases')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        activeHistoryTab === 'purchases' 
                          ? 'bg-white text-slate-900 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      A. Share Purchases ({transactions.sharePurchases.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveHistoryTab('payments')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        activeHistoryTab === 'payments' 
                          ? 'bg-white text-slate-900 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      B. Payments ({transactions.payments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveHistoryTab('commissions')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        activeHistoryTab === 'commissions' 
                          ? 'bg-white text-slate-900 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      C. Commissions ({transactions.commissions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveHistoryTab('withdrawals')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        activeHistoryTab === 'withdrawals' 
                          ? 'bg-white text-slate-900 shadow-2xs' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      D. Withdrawals ({transactions.withdrawals.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-Section A: Share Purchase History */}
              {activeHistoryTab === 'purchases' && (
                <div className="overflow-x-auto">
                  {transactions.sharePurchases.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No share purchases found.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Application / Draft Ref</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Share % (Units)</th>
                          <th className="py-3 px-4">Total Amount</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.sharePurchases.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                              {app.draftReference || app.id}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-primary-main">
                              {app.sharePercent}% ({app.shareUnits || app.sharePercent} Units)
                            </td>
                            <td className="py-3.5 px-4 font-black text-slate-900">
                              ৳{app.totalAmount?.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
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
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedRecordDetail(app)}
                                className="text-primary-main font-bold hover:underline cursor-pointer"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Sub-Section B: Payment History */}
              {activeHistoryTab === 'payments' && (
                <div className="overflow-x-auto">
                  {transactions.payments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">No payment submissions found.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Payment Method</th>
                          <th className="py-3 px-4">Transaction ID</th>
                          <th className="py-3 px-4">Payer Mobile</th>
                          <th className="py-3 px-4">Amount Paid</th>
                          <th className="py-3 px-4">Submission Date</th>
                          <th className="py-3 px-4">Verification Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-800">{p.paymentMethod}</td>
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.transactionId}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-600">{p.payerMobile}</td>
                            <td className="py-3.5 px-4 font-black text-slate-900">৳{p.totalAmount?.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {p.submissionTimestamp ? new Date(p.submissionTimestamp).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                p.paymentStatus === 'Approved'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : p.paymentStatus === 'Rejected'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {p.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Sub-Section C: Commission History */}
              {activeHistoryTab === 'commissions' && (
                <div className="overflow-x-auto">
                  {transactions.commissions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No verified commission allocations have been credited yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Record ID</th>
                          <th className="py-3 px-4">Revenue Source</th>
                          <th className="py-3 px-4">Eligible Channel Revenue</th>
                          <th className="py-3 px-4">Your Stake Rate</th>
                          <th className="py-3 px-4">Credited Share</th>
                          <th className="py-3 px-4">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.commissions.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{c.id}</td>
                            <td className="py-3.5 px-4 font-medium text-slate-800">{c.category}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-mono">৳{c.eligibleRevenue?.toLocaleString()}</td>
                            <td className="py-3.5 px-4 font-bold text-primary-main">{c.rate}</td>
                            <td className="py-3.5 px-4 font-black text-emerald-600">৳{c.amount?.toLocaleString()}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Sub-Section D: Withdrawal History */}
              {activeHistoryTab === 'withdrawals' && (
                <div className="overflow-x-auto">
                  {transactions.withdrawals.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      No withdrawal requests have been made yet.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="py-3 px-4">Withdrawal ID</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Method & Account</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.withdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{w.id}</td>
                            <td className="py-3.5 px-4 text-slate-600">
                              {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-800">{w.paymentMethod}</span>
                              <span className="text-slate-500 font-mono text-[11px] block">{w.accountNumber}</span>
                            </td>
                            <td className="py-3.5 px-4 font-black text-slate-900">৳{w.amount?.toLocaleString()}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                w.status === 'paid' || w.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : w.status === 'rejected'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TASK 7: SHAREHOLDER PROFILE MODAL (READ-ONLY ACCESS CONTROL)
        ========================================================================== */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-main/10 text-primary-main flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {language === 'bn' ? 'শেয়ারহোল্ডার প্রোফাইল' : 'Shareholder Profile'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">{shareholderId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Full Name</span>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {profile?.applicantName || userData?.name || user?.displayName || 'Registered Investor'}
                  </div>
                </div>

                {profile?.guardianName && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Father's or Mother's Name</span>
                    <div className="font-medium text-slate-800 mt-0.5">{profile.guardianName}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Email Address</span>
                    <div className="font-medium text-slate-800 mt-0.5 truncate">{user?.email}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Phone Number</span>
                    <div className="font-medium text-slate-800 mt-0.5">{profile?.phone || userData?.phone || 'N/A'}</div>
                  </div>
                </div>

                {profile?.address && (
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">Registered Address</span>
                    <div className="font-medium text-slate-700 mt-0.5">{profile.address}</div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span>Approved Share Percentage:</span>
                    <strong className="text-primary-main font-bold">{summary?.approvedSharePercentage || 0}%</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Verified Capital Contribution:</span>
                    <strong className="text-slate-900 font-bold">৳{summary?.totalAmountPaidForApprovedShares?.toLocaleString() || 0}</strong>
                  </div>
                </div>

                {/* Read-Only Access Control Notice (Task 7 Requirement) */}
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    {language === 'bn'
                      ? 'নিরাপত্তা ও নিরীক্ষা বিধির কারণে অনুমোদিত শেয়ারের শতকরা হার বা আর্থিক ব্যালেন্স ব্যবহারকারী নিজে পরিবর্তন করতে পারবেন না।'
                      : 'Financial parameters, approved equity stakes, and ledger balances are strictly server-authoritative and cannot be modified by user action.'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            WITHDRAWAL REQUEST MODAL
        ========================================================================== */}
        {showWithdrawModal && summary && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {language === 'bn' ? 'কমিশন উত্তোলনের আবেদন' : 'Request Commission Withdrawal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Available: <strong className="text-emerald-600 font-mono">৳{summary.availableWithdrawBalance?.toLocaleString()}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Withdrawal Amount (৳ BDT)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max={summary.availableWithdrawBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Min ৳100"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-main"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['bKash', 'Nagad', 'Rocket', 'Bank'] as const).map((method) => (
                      <button
                        type="button"
                        key={method}
                        onClick={() => setWithdrawMethod(method)}
                        className={`py-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                          withdrawMethod === method 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {withdrawMethod === 'Bank' ? 'Bank Account Details' : `${withdrawMethod} Mobile Number`}
                  </label>
                  <input
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder={withdrawMethod === 'Bank' ? 'Account No, Bank & Branch Name' : '01XXXXXXXXX'}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-main"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={withdrawSubmitting || summary.availableWithdrawBalance < 100}
                    className="w-full py-3 rounded-xl bg-primary-main hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {withdrawSubmitting ? 'Submitting Request...' : 'Submit Withdrawal Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Detail Modal */}
        {selectedRecordDetail && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">Application Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedRecordDetail(null)}
                  className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">Reference</span>
                  <span className="font-mono font-bold text-slate-800">{selectedRecordDetail.draftReference || selectedRecordDetail.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">Applicant</span>
                  <span className="font-bold text-slate-800">{selectedRecordDetail.applicantName || selectedRecordDetail.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">Share Percentage</span>
                  <span className="font-bold text-primary-main">{selectedRecordDetail.sharePercent}%</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">Total Amount</span>
                  <span className="font-black text-slate-900">৳{selectedRecordDetail.totalAmount?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px]">Status</span>
                  <span className="font-bold text-slate-700">{selectedRecordDetail.paymentStatus || selectedRecordDetail.status}</span>
                </div>
              </div>
              <div className="mt-5 text-right">
                <button
                  type="button"
                  onClick={() => setSelectedRecordDetail(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TASK 6: OFFICIAL SHARE CERTIFICATE MODAL
        ========================================================================== */}
        <OfficialShareCertificateModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          certificate={certificate}
        />
      </main>

      <Footer />
    </div>
  );
}

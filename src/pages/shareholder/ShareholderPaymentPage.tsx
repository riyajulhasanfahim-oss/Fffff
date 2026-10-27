import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
import toast from 'react-hot-toast';
import { 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  Copy, 
  ArrowLeft, 
  ArrowRight,
  Coins,
  FileText,
  Lock,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Phone,
  Hash,
  ExternalLink
} from 'lucide-react';
import PaymentMethodSelectionModal from '../../components/checkout/PaymentMethodSelectionModal';
import BkashPaymentModal from '../../components/checkout/BkashPaymentModal';
import NagadPaymentModal from '../../components/checkout/NagadPaymentModal';
import RocketPaymentModal from '../../components/checkout/RocketPaymentModal';
import UpayPaymentModal from '../../components/checkout/UpayPaymentModal';
import { verifyPaymentAutomatic } from '../../services/automaticPaymentVerificationService';

export default function ShareholderPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  // Load application from navigation state or local storage
  const [application, setApplication] = useState<any>(() => {
    return (location.state as any)?.application || null;
  });

  // Direct TrxID Verification Form fields
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [payerMobile, setPayerMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Asynchronous Pending Verification State
  const [pendingPaymentInfo, setPendingPaymentInfo] = useState<{
    applicationId: string;
    transactionId: string;
    paymentMethod: string;
    amount: number;
    payerMobile: string;
    submittedAt: number;
  } | null>(null);

  const [checkingPendingStatus, setCheckingPendingStatus] = useState<boolean>(false);
  const pollingIntervalRef = useRef<any>(null);

  // Automatic Payment Modals States
  const [showPaymentSelectionModal, setShowPaymentSelectionModal] = useState<boolean>(false);
  const [showBkashModal, setShowBkashModal] = useState<boolean>(false);
  const [showNagadModal, setShowNagadModal] = useState<boolean>(false);
  const [showRocketModal, setShowRocketModal] = useState<boolean>(false);
  const [showUpayModal, setShowUpayModal] = useState<boolean>(false);
  const [selectedPaymentChannel, setSelectedPaymentChannel] = useState<'bkash' | 'nagad' | 'rocket' | 'upay' | null>(null);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>('');
  const [currentInvoiceId] = useState<string>(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inv = 'SH-S2N';
    for (let i = 0; i < 8; i++) {
      inv += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return inv;
  });

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [user, authLoading, navigate, location]);

  // Initial check: If user already has an active or pending application on the server, load it
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const checkExistingStatus = async () => {
      try {
        const token = await user.getIdToken().catch(() => '');
        const headers: Record<string, string> = { 'x-user-id': user.uid };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/shareholders/me', { headers });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data && data.success) {
            if (data.shareholderStatus === 'approved') {
              // Already approved shareholder! Redirect directly to dashboard
              navigate('/shareholder/dashboard', { replace: true });
              return;
            } else if (data.shareholderStatus === 'pending_verification' && data.transactionHistory?.sharePurchases?.length > 0) {
              const pending = data.transactionHistory.sharePurchases.find((p: any) => 
                p.status === 'pending_verification' || p.paymentStatus === 'Pending Verification'
              ) || data.transactionHistory.sharePurchases[0];

              if (pending && !pendingPaymentInfo) {
                setPendingPaymentInfo({
                  applicationId: pending.id || pending.applicationId || currentInvoiceId,
                  transactionId: pending.transactionId || '',
                  paymentMethod: pending.paymentMethod || 'bKash',
                  amount: Number(pending.totalAmount || 2000),
                  payerMobile: pending.payerMobile || pending.phone || '',
                  submittedAt: pending.submissionTimestamp || pending.createdAt || Date.now()
                });
              }
            }
          }
        }
      } catch (_) {}
    };

    checkExistingStatus();
    return () => { isMounted = false; };
  }, [user]);

  // Pre-fill application data if not passed in state
  useEffect(() => {
    if (!application && user?.uid) {
      const searchParams = new URLSearchParams(location.search);
      const appId = searchParams.get('appId');
      
      const localKey = `rj_shareholder_draft_${user.uid}`;
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const draft = JSON.parse(raw);
          const percent = draft.selectedPercent || 1;
          setApplication({
            id: appId || `RJ-SH-DRAFT-2026-${user.uid.slice(0, 4).toUpperCase()}-${(percent * 100).toString().padStart(4, '0')}`,
            draftReference: appId || `RJ-SH-DRAFT-2026-${user.uid.slice(0, 4).toUpperCase()}-${(percent * 100).toString().padStart(4, '0')}`,
            userId: user.uid,
            fullName: draft.fullName || userData?.name || user.displayName || 'Shareholder Applicant',
            guardianName: draft.guardianName || '',
            address: draft.address || '',
            phone: draft.phone || userData?.phone || '',
            email: draft.email || user.email || '',
            sharePercent: percent,
            unitPrice: 2000,
            shareUnits: percent,
            totalAmount: percent * 2000
          });
        } else {
          // Default fallback application
          setApplication({
            id: appId || `RJ-SH-DRAFT-2026-${user.uid.slice(0, 4).toUpperCase()}-0100`,
            draftReference: appId || `RJ-SH-DRAFT-2026-${user.uid.slice(0, 4).toUpperCase()}-0100`,
            userId: user.uid,
            fullName: userData?.name || user.displayName || 'Shareholder Applicant',
            guardianName: '',
            address: 'Bangladesh',
            phone: userData?.phone || '',
            email: user.email || '',
            sharePercent: 1,
            unitPrice: 2000,
            shareUnits: 1,
            totalAmount: 2000
          });
        }
      } catch (_) {}
    }
  }, [application, user, userData, location.search]);

  // Prepopulate payer mobile from user profile
  useEffect(() => {
    if (userData?.phone && !payerMobile) {
      setPayerMobile(userData.phone);
    }
  }, [userData, payerMobile]);

  // Asynchronous status detector loop when in pending state (Requirement 7)
  useEffect(() => {
    if (!pendingPaymentInfo || !user) {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      return;
    }

    const checkVerificationStatus = async () => {
      try {
        setCheckingPendingStatus(true);
        const token = await user.getIdToken().catch(() => '');
        const headers: Record<string, string> = { 'x-user-id': user.uid };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/shareholders/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.shareholderStatus === 'approved') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            toast.success(
              language === 'bn' 
                ? 'আপনার পেমেন্ট সফলভাবে যাচাই হয়েছে! শেয়ারহোল্ডার ড্যাশবোর্ডে স্বাগতম।' 
                : 'Payment verified! Welcome to your Shareholder Dashboard.',
              { duration: 5000 }
            );
            navigate('/shareholder/dashboard', { replace: true });
          }
        }
      } catch (_) {
      } finally {
        setCheckingPendingStatus(false);
      }
    };

    // Poll every 4 seconds
    pollingIntervalRef.current = setInterval(checkVerificationStatus, 4000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [pendingPaymentInfo, user, navigate, language]);

  const payableAmount = application?.totalAmount || (application?.sharePercent ? application.sharePercent * 2000 : 2000);

  const handleCopyAmount = () => {
    const amt = String(payableAmount);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(amt);
      }
      toast.success(language === 'bn' ? 'পেমেন্ট এমাউন্ট কপি করা হয়েছে!' : 'Payable amount copied!');
    } catch (_) {}
  };

  const handleCopyAppId = () => {
    const ref = application?.draftReference || application?.id || '';
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(ref);
      }
      toast.success(language === 'bn' ? 'অ্যাপ্লিকেশন আইডি কপি করা হয়েছে!' : 'Application ID copied!');
    } catch (_) {}
  };

  // Main payment processing function
  const handleCompletePaymentAndRegistration = async (
    channel: 'bkash' | 'nagad' | 'rocket' | 'upay',
    trxId: string
  ) => {
    if (!trxId.trim()) {
      toast.error(language === 'bn' ? 'Transaction ID (TrxID) লিখুন' : 'Please enter Transaction ID');
      return;
    }

    if (!user) {
      toast.error('Please log in to submit your payment details.');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setPaymentErrorMessage('');

    const cleanTrx = trxId.trim().toUpperCase();
    const formattedMethod = 
      channel === 'bkash' ? 'bKash' : 
      channel === 'nagad' ? 'Nagad' : 
      channel === 'rocket' ? 'Rocket' : 'Upay';

    setPaymentMethod(formattedMethod);
    setTransactionId(cleanTrx);

    const targetAppId = application?.id || application?.draftReference || currentInvoiceId;
    const applicantFullName = application?.fullName || userData?.name || user.displayName || 'Shareholder Investor';

    try {
      // 1. Run Automatic Payment Verification against Firestore payments collection (SMS reader records)
      const verifyResult = await verifyPaymentAutomatic({
        transactionId: cleanTrx,
        paymentMethod: channel,
        expectedAmount: payableAmount,
        invoiceId: targetAppId,
        userId: user.uid,
        userType: 'shareholder',
        contextData: {
          applicationId: targetAppId,
          fullName: applicantFullName,
          applicantName: applicantFullName,
          guardianName: application?.guardianName || '',
          address: application?.address || '',
          phone: application?.phone || payerMobile || userData?.phone || '',
          email: application?.email || user.email || '',
          sharePercent: application?.sharePercent || 1,
          shareUnits: application?.shareUnits || application?.sharePercent || 1,
          payerMobile: payerMobile || userData?.phone || '',
          createdAt: Date.now()
        }
      });

      const token = await user.getIdToken().catch(() => '');

      // Case A: Payment matches SMS reader immediately and is genuinely verified!
      if (verifyResult.status === 'verified') {
        // Sync to backend /api/shareholders/submit-payment with approved status
        await fetch('/api/shareholders/submit-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            'x-user-id': user.uid
          },
          body: JSON.stringify({
            applicationId: targetAppId,
            userId: user.uid,
            applicantName: applicantFullName,
            guardianName: application?.guardianName || '',
            address: application?.address || '',
            phone: application?.phone || payerMobile || userData?.phone || '',
            email: application?.email || user.email || '',
            sharePercent: application?.sharePercent || 1,
            paymentMethod: formattedMethod,
            transactionId: cleanTrx,
            payerMobile: payerMobile || userData?.phone || '',
            isAutoVerified: true,
            status: 'approved',
            paymentStatus: 'Approved'
          })
        }).catch(() => {});

        // Confirm completion
        await fetch('/api/payment/confirm-completion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: cleanTrx,
            invoiceId: targetAppId,
            userId: user.uid,
            userType: 'shareholder',
            sharePercent: application?.sharePercent || 1,
            applicantName: applicantFullName,
            receivedAmount: payableAmount,
            senderNumber: payerMobile || userData?.phone || ''
          })
        }).catch(() => {});

        setShowBkashModal(false);
        setShowNagadModal(false);
        setShowRocketModal(false);
        setShowUpayModal(false);
        setShowPaymentSelectionModal(false);
        setSubmitting(false);

        toast.success(
          language === 'bn'
            ? 'পেমেন্ট সফলভাবে স্বয়ংক্রিয়ভাবে যাচাই হয়েছে! শেয়ারহোল্ডার ড্যাশবোর্ডে স্বাগতম।'
            : 'Payment verified automatically! Welcome to your Shareholder Dashboard.',
          { duration: 4000 }
        );
        navigate('/shareholder/dashboard', { replace: true });
        return;
      } 
      
      // Case B: Explicit rejection (amount mismatch, wrong payment method, duplicate transaction ID)
      if (
        verifyResult.status === 'rejected' &&
        (verifyResult.rejectionReason === 'amount_mismatch' || 
         verifyResult.rejectionReason === 'method_mismatch' || 
         verifyResult.rejectionReason === 'duplicate_transaction')
      ) {
        setSubmitting(false);
        let errorMsg = verifyResult.message || 'Payment verification failed.';
        if (verifyResult.rejectionReason === 'amount_mismatch') {
          errorMsg = verifyResult.message || `পেমেন্ট এমাউন্ট সঠিক নয়! প্রত্যাশিত: ৳${payableAmount.toFixed(2)}।`;
        } else if (verifyResult.rejectionReason === 'method_mismatch') {
          errorMsg = verifyResult.message || 'পেমেন্ট মেথড সঠিক নয়! সঠিক পেমেন্ট মেথড ব্যবহার করুন।';
        } else if (verifyResult.rejectionReason === 'duplicate_transaction') {
          errorMsg = verifyResult.message || 'এই ট্রানজেকশন আইডি ইতিমধ্যে ব্যবহৃত হয়েছে!';
        }
        setPaymentErrorMessage(errorMsg);
        toast.error(errorMsg, { duration: 6000 });
        return;
      }

      // Case C: Asynchronous payment submission (SMS reader hasn't received SMS yet or admin review pending)
      // Save pending application properly without throwing false rejection
      const submitRes = await fetch('/api/shareholders/submit-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'x-user-id': user.uid
        },
        body: JSON.stringify({
          applicationId: targetAppId,
          userId: user.uid,
          applicantName: applicantFullName,
          guardianName: application?.guardianName || '',
          address: application?.address || '',
          phone: application?.phone || payerMobile || userData?.phone || '',
          email: application?.email || user.email || '',
          sharePercent: application?.sharePercent || 1,
          paymentMethod: formattedMethod,
          transactionId: cleanTrx,
          payerMobile: payerMobile || userData?.phone || '',
          status: 'pending_verification',
          paymentStatus: 'Pending Verification'
        })
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.success) {
        if (submitData.error && submitData.error.includes('Duplicate')) {
          setPaymentErrorMessage(submitData.error);
          toast.error(submitData.error, { duration: 6000 });
          setSubmitting(false);
          return;
        }
      }

      // Close modals and transition to Pending Verification View (Requirement 7)
      setShowBkashModal(false);
      setShowNagadModal(false);
      setShowRocketModal(false);
      setShowUpayModal(false);
      setShowPaymentSelectionModal(false);
      setSubmitting(false);

      setPendingPaymentInfo({
        applicationId: targetAppId,
        transactionId: cleanTrx,
        paymentMethod: formattedMethod,
        amount: payableAmount,
        payerMobile: payerMobile || userData?.phone || '',
        submittedAt: Date.now()
      });

      toast.success(
        language === 'bn' 
          ? 'পেমেন্ট তথ্য সফলভাবে গ্রহণ করা হয়েছে। যাচাই প্রক্রিয়া সম্পন্ন হলে স্বয়ংক্রিয়ভাবে সক্রিয় হবে।' 
          : 'Payment details submitted. Automatic verification is in progress.',
        { duration: 5000 }
      );

    } catch (error: any) {
      console.error('Error during shareholder payment flow:', error);
      const defaultErr = 'পেমেন্ট প্রক্রিয়াকরণে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা সাপোর্টে যোগাযোগ করুন।';
      const errNotice = error?.message || defaultErr;
      setPaymentErrorMessage(errNotice);
      toast.error(errNotice, { duration: 5000 });
      setSubmitting(false);
    }
  };

  if (authLoading || !application) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-main"></div>
        <p className="mt-3 text-xs sm:text-sm text-slate-500 font-medium">Loading Share Payment Portal...</p>
      </div>
    );
  }

  // =========================================================================
  // RENDER PENDING VERIFICATION SCREEN (REQUIREMENT 7)
  // =========================================================================
  if (pendingPaymentInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />

        <main className="flex-grow pt-4 sm:pt-6 pb-16 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-6">
            <button 
              type="button"
              onClick={() => navigate('/company-share')} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Company Share</span>
            </button>
            <span>/</span>
            <span className="text-amber-800 font-semibold">
              {language === 'bn' ? 'যাচাইকরণ প্রক্রিয়া চলমান' : 'Payment Verification In Progress'}
            </span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">
            {/* Top Status Icon & Title */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner relative">
                <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
                <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-amber-500 ring-4 ring-white animate-ping"></span>
              </div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                {language === 'bn' ? 'পেমেন্ট যাচাইকরণ চলমান' : 'Verification Under Review'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {language === 'bn' ? 'আপনার শেয়ার পেমেন্ট তথ্য সফলভাবে গৃহীত হয়েছে' : 'Share Payment Submitted Successfully'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                {language === 'bn' 
                  ? 'আপনার Transaction ID এবং পেমেন্ট বিবরণী সংরক্ষিত হয়েছে। SMS রিডার ও অ্যাডমিন সিস্টেম থেকে যাচাই হওয়া মাত্রই আপনার শেয়ার সক্রিয় হয়ে ড্যাশবোর্ডে যুক্ত হবে।' 
                  : 'Your transaction ID and payment details have been recorded. Once verified via SMS Reader or admin confirmation, your equity will be activated automatically.'}
              </p>
            </div>

            {/* Submitted Payment Summary Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary-main" />
                  <span>Submitted Details (দাখিলকৃত তথ্য)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">Ref: {pendingPaymentInfo.applicationId}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Transaction ID (TrxID)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                    {pendingPaymentInfo.transactionId}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Payment Method</span>
                  <span className="font-bold text-slate-900">
                    {pendingPaymentInfo.paymentMethod}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Payable Amount</span>
                  <span className="font-bold text-emerald-600 text-base">
                    ৳{pendingPaymentInfo.amount.toLocaleString()} BDT
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200/80">
                  <span className="text-[11px] text-slate-400 block font-medium">Equity Share</span>
                  <span className="font-bold text-primary-main">
                    {application.sharePercent || 1}% Company Share
                  </span>
                </div>
              </div>
            </div>

            {/* Live Auto-Detection Indicator */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-main/10 text-primary-main flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-4 h-4 ${checkingPendingStatus ? 'animate-spin text-primary-main' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    {language === 'bn' ? 'স্বয়ংক্রিয় যাচাই ডিটেক্টর চালু আছে' : 'Live Status Auto-Detection Active'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'যাচাই হওয়া মাত্রই ড্যাশবোর্ড স্বয়ংক্রিয়ভাবে খুলে যাবে।' : 'You will be automatically redirected the moment verification completes.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/shareholder/dashboard')}
                className="w-full sm:w-auto px-6 py-3 bg-primary-main hover:bg-sky-600 active:scale-[0.99] text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span>{language === 'bn' ? 'শেয়ারহোল্ডার ড্যাশবোর্ডে যান' : 'Go to Shareholder Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPendingPaymentInfo(null)}
                className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-all cursor-pointer"
              >
                {language === 'bn' ? 'ভিন্ন TrxID দিয়ে চেষ্টা করুন' : 'Submit Another TrxID'}
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // =========================================================================
  // STANDARD SHARE PAYMENT VIEW
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-4 sm:pt-6 pb-16 px-3 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* Breadcrumb Navigation - Responsive */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
          <button 
            type="button"
            onClick={() => navigate('/company-share')} 
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer font-medium text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Company Share</span>
          </button>
          <span>/</span>
          <Link to="/" className="hover:text-primary-main">Home</Link>
          <span>/</span>
          <Link to="/company-share" className="hover:text-primary-main">Company Share</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate max-w-[140px] sm:max-w-none">
            Share Payment
          </span>
        </div>

        {/* Header Title & Intro Banner */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-primary-main/10 text-primary-main px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>RJ WORLD BD • Shareholder Payment Portal</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {language === 'bn' ? 'কোম্পানি শেয়ার পেমেন্ট ও ভেরিফিকেশন' : 'Share Purchase Payment & Verification'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {language === 'bn' 
              ? 'বিকাশ, নগদ, রকেট অথবা উপায়ের মাধ্যমে পেমেন্ট সম্পন্ন করে TrxID যাচাই করুন। যাচাই সম্পন্ন হলে শেয়ারহোল্ডার ড্যাশবোর্ড সরাসরি সক্রিয় হবে।' 
              : 'Complete your share payment via bKash, Nagad, Rocket, or Upay and verify your TrxID. Successful verification activates your Shareholder Dashboard immediately.'}
          </p>
        </div>

        {/* 1. APPLICATION & EQUITY SUMMARY CARD */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs mb-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-main" />
              <span>Investment Summary (শেয়ার ক্রয় বিবরণী)</span>
            </h2>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Order
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
            {/* Applicant details */}
            <div className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-400 block font-medium">Applicant Investor:</span>
              <span className="font-bold text-slate-900 text-sm sm:text-base block truncate">
                {application.fullName || userData?.name || user?.displayName}
              </span>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span className="font-mono">Ref: {application.draftReference?.slice(0, 16) || application.id?.slice(0, 16)}</span>
                <button
                  type="button"
                  onClick={handleCopyAppId}
                  className="text-primary-main hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Share units */}
            <div className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80">
              <span className="text-[11px] text-slate-400 block font-medium">Allocated Equity:</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-primary-main">
                  {application.sharePercent || 1}%
                </span>
                <span className="text-xs font-semibold text-slate-600">Company Share ({application.sharePercent || 1} units)</span>
              </div>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Rate: ৳2,000 per 1% share unit
              </span>
            </div>

            {/* Total Payable Box */}
            <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white p-3.5 sm:p-4 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] text-sky-300 font-semibold uppercase block">
                  Total Payable Amount
                </span>
                <span className="text-xl sm:text-2xl font-black text-white">
                  ৳{payableAmount.toLocaleString()} BDT
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-lg text-white transition-all cursor-pointer"
                title="Copy Amount"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. AUTOMATIC PAYMENT SYSTEM (METHOD MODALS & ONE-CLICK BUTTON) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6 mb-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <div className="w-7 h-7 rounded-lg bg-primary-main text-white flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <span>{language === 'bn' ? 'স্বয়ংক্রিয় পেমেন্ট মডাল' : 'One-Click Automatic Payment Gateway'}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>SMS Reader Verified</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {language === 'bn' 
                ? 'পেমেন্ট গেটওয়ে খুলুন এবং বিকাশ, নগদ, রকেট অথবা উপায় পপআপ নির্দেশনা অনুযায়ী পেমেন্ট সম্পন্ন করে TrxID দিয়ে ১-ক্লিকে ভেরিফাই করুন।' 
                : 'Open the payment modal, select your preferred channel (bKash/Nagad/Rocket/Upay), follow the instructions, and verify with your TrxID in 1 click.'}
            </p>

            {/* PRIMARY ONE-CLICK GATEWAY LAUNCH BUTTON */}
            <button
              type="button"
              onClick={() => setShowPaymentSelectionModal(true)}
              disabled={submitting}
              className="w-full py-3.5 sm:py-4 px-4 bg-gradient-to-r from-primary-main via-sky-600 to-primary-main hover:brightness-105 active:scale-[0.99] text-white font-black rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-lg shadow-primary-main/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-5 h-5 text-white" />
              <span>
                {language === 'bn' 
                  ? `৳${payableAmount.toLocaleString()} পে করুন (স্বয়ংক্রিয় গেটওয়ে খুলুন)` 
                  : `Pay ৳${payableAmount.toLocaleString()} (Launch Instant Gateway)`}
              </span>
            </button>
          </div>

          {/* 3. DIRECT TrxID VERIFICATION FORM (On-Page Fast Track) */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-main" />
              <span>{language === 'bn' ? 'সরাসরি TrxID জমা ও যাচাইকরণ' : 'Direct TrxID Submission & Verification'}</span>
            </h3>

            <p className="text-xs text-slate-500 mb-4">
              {language === 'bn'
                ? 'আপনি যদি ইতিমধ্যে আরজে ওয়ার্ল্ডের অফিসিয়াল একাউন্টে টাকা পাঠিয়ে থাকেন, তবে নিচের ফর্মটিতে TrxID ও প্রেরক নম্বর লিখে সাবমিট করুন।'
                : 'If you have already sent money to the official RJ WORLD BD account, submit your TrxID and sender mobile number below.'}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const ch = paymentMethod.toLowerCase() as 'bkash' | 'nagad' | 'rocket' | 'upay';
                handleCompletePaymentAndRegistration(ch, transactionId);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Method selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-main font-medium"
                  >
                    <option value="bKash">bKash (বিকাশ)</option>
                    <option value="Nagad">Nagad (নগদ)</option>
                    <option value="Rocket">Rocket (রকেট)</option>
                    <option value="Upay">Upay (উপায়)</option>
                  </select>
                </div>

                {/* TrxID */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Transaction ID (TrxID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BL99XYZ123"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-main font-mono uppercase"
                  />
                </div>

                {/* Sender Mobile */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    {language === 'bn' ? 'প্রেরক মোবাইল নম্বর *' : 'Sender Mobile Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="01XXXXXXXXX"
                    value={payerMobile}
                    onChange={(e) => setPayerMobile(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-main font-mono"
                  />
                </div>
              </div>

              {paymentErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{paymentErrorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !transactionId.trim()}
                className="w-full sm:w-auto px-7 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying Payment...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'bn' ? 'TrxID সাবমিট ও যাচাই করুন' : 'Submit TrxID & Verify'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ========================================================= */}
        {/* AUTOMATIC PAYMENT MODALS (EXACT PARITY WITH RESELLER FEE) */}
        {/* ========================================================= */}

        {/* 1. Payment Method Selection Modal */}
        <PaymentMethodSelectionModal
          isOpen={showPaymentSelectionModal}
          onClose={() => setShowPaymentSelectionModal(false)}
          amount={payableAmount}
          paymentType="shareholder_capital_fee"
          invoiceId={currentInvoiceId}
          isSubmitting={submitting}
          selectedChannel={selectedPaymentChannel}
          onSelectChannel={setSelectedPaymentChannel}
          onConfirmPayment={(channel) => {
            setPaymentErrorMessage('');
            setShowPaymentSelectionModal(false);
            if (channel === 'bkash') {
              setShowBkashModal(true);
            } else if (channel === 'nagad') {
              setShowNagadModal(true);
            } else if (channel === 'rocket') {
              setShowRocketModal(true);
            } else if (channel === 'upay') {
              setShowUpayModal(true);
            }
          }}
        />

        {/* 2. bKash Payment Instruction Modal */}
        <BkashPaymentModal
          isOpen={showBkashModal}
          onClose={() => {
            setShowBkashModal(false);
            setPaymentErrorMessage('');
          }}
          onBack={() => {
            setShowBkashModal(false);
            setPaymentErrorMessage('');
            setShowPaymentSelectionModal(true);
          }}
          amount={payableAmount}
          invoiceId={currentInvoiceId}
          bkashNumber="01864670673"
          isSubmitting={submitting}
          errorMessage={paymentErrorMessage}
          onVerify={(trxId) => {
            handleCompletePaymentAndRegistration('bkash', trxId);
          }}
        />

        {/* 3. Nagad Payment Instruction Modal */}
        <NagadPaymentModal
          isOpen={showNagadModal}
          onClose={() => {
            setShowNagadModal(false);
            setPaymentErrorMessage('');
          }}
          onBack={() => {
            setShowNagadModal(false);
            setPaymentErrorMessage('');
            setShowPaymentSelectionModal(true);
          }}
          amount={payableAmount}
          invoiceId={currentInvoiceId}
          nagadNumber="01864670673"
          isSubmitting={submitting}
          errorMessage={paymentErrorMessage}
          onVerify={(trxId) => {
            handleCompletePaymentAndRegistration('nagad', trxId);
          }}
        />

        {/* 4. Rocket Payment Instruction Modal */}
        <RocketPaymentModal
          isOpen={showRocketModal}
          onClose={() => {
            setShowRocketModal(false);
            setPaymentErrorMessage('');
          }}
          onBack={() => {
            setShowRocketModal(false);
            setPaymentErrorMessage('');
            setShowPaymentSelectionModal(true);
          }}
          amount={payableAmount}
          invoiceId={currentInvoiceId}
          rocketNumber="01864670673"
          isSubmitting={submitting}
          errorMessage={paymentErrorMessage}
          onVerify={(trxId) => {
            handleCompletePaymentAndRegistration('rocket', trxId);
          }}
        />

        {/* 5. Upay Payment Instruction Modal */}
        <UpayPaymentModal
          isOpen={showUpayModal}
          onClose={() => {
            setShowUpayModal(false);
            setPaymentErrorMessage('');
          }}
          onBack={() => {
            setShowUpayModal(false);
            setPaymentErrorMessage('');
            setShowPaymentSelectionModal(true);
          }}
          amount={payableAmount}
          invoiceId={currentInvoiceId}
          upayNumber="01864670673"
          isSubmitting={submitting}
          errorMessage={paymentErrorMessage}
          onVerify={(trxId) => {
            handleCompletePaymentAndRegistration('upay', trxId);
          }}
        />

      </main>

      <Footer />
    </div>
  );
}

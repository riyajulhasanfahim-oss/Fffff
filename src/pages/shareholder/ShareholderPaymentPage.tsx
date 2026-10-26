import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import PaymentMethodSelectionModal from '../../components/checkout/PaymentMethodSelectionModal';
import BkashPaymentModal from '../../components/checkout/BkashPaymentModal';
import NagadPaymentModal from '../../components/checkout/NagadPaymentModal';
import RocketPaymentModal from '../../components/checkout/RocketPaymentModal';
import UpayPaymentModal from '../../components/checkout/UpayPaymentModal';
import { verifyPaymentAutomatic, type VerificationResult } from '../../services/automaticPaymentVerificationService';

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

  // Automatic Payment Modals States (reused exactly from Reseller Registration Fee)
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

    try {
      // Automatic Payment Verification with safety fallback (matching Reseller Registration)
      const timeoutPromise = new Promise<VerificationResult>((resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            status: 'pending',
            rejectionReason: 'transaction_not_found',
            message: 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন অথবা RJ WORLD BD Whatsapp সাপোর্টে যোগাযোগ করুন'
          });
        }, 4000);
      });

      const result = await Promise.race([
        verifyPaymentAutomatic({
          transactionId: cleanTrx,
          paymentMethod: channel,
          expectedAmount: payableAmount,
          invoiceId: currentInvoiceId,
          userId: user.uid,
          userType: 'shareholder',
          contextData: {
            applicationId: application?.id || application?.draftReference || currentInvoiceId,
            fullName: application?.fullName || userData?.name || user.displayName || 'Shareholder Investor',
            applicantName: application?.fullName || userData?.name || user.displayName || 'Shareholder Investor',
            guardianName: application?.guardianName || '',
            address: application?.address || '',
            phone: application?.phone || payerMobile || userData?.phone || '',
            email: application?.email || user.email || '',
            sharePercent: application?.sharePercent || 1,
            shareUnits: application?.shareUnits || application?.sharePercent || 1,
            payerMobile: payerMobile || userData?.phone || '',
            createdAt: Date.now()
          }
        }),
        timeoutPromise
      ]);

      if (result.status === 'verified') {
        setShowBkashModal(false);
        setShowNagadModal(false);
        setShowRocketModal(false);
        setShowUpayModal(false);
        setShowPaymentSelectionModal(false);
        setSubmitting(false);

        toast.success(
          language === 'bn'
            ? 'পেমেন্ট সফলভাবে স্বয়ংক্রিয়ভাবে যাচাই হয়েছে! শেয়ারহোল্ডার ড্যাশবোর্ডে স্বাগতম।'
            : 'Payment verified automatically! Welcome to your Shareholder Dashboard.'
        );
        navigate('/shareholder/dashboard', { replace: true });
        return;
      } else {
        setSubmitting(false);
        let errorMsg = 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন অথবা RJ WORLD BD Whatsapp সাপোর্টে যোগাযোগ করুন';
        if (result.rejectionReason === 'amount_mismatch') {
          errorMsg = result.message || `পেমেন্ট এমাউন্ট সঠিক নয়! প্রত্যাশিত: ৳${payableAmount.toFixed(2)}।`;
        } else if (result.rejectionReason === 'method_mismatch') {
          errorMsg = result.message || 'পেমেন্ট মেথড সঠিক নয়! সঠিক পেমেন্ট মেথড ব্যবহার করুন।';
        } else if (result.rejectionReason === 'duplicate_transaction') {
          errorMsg = result.message || 'এই ট্রানজেকশন আইডি ইতিমধ্যে ব্যবহৃত হয়েছে!';
        } else if (result.message && !result.message.toLowerCase().includes('timed out')) {
          errorMsg = result.message;
        }
        setPaymentErrorMessage(errorMsg);
        toast.error(errorMsg, { duration: 6000 });
      }
    } catch (error: any) {
      console.error('Error verifying shareholder payment:', error);
      const defaultErr = 'আপনার ট্রানজেকশন আইডি ভুল সঠিক ট্রানজাকশন আইডি দিয়ে আবার চেষ্টা করুন অথবা RJ WORLD BD Whatsapp সাপোর্টে যোগাযোগ করুন';
      const errNotice = (error?.message && !error.message.toLowerCase().includes('timed out')) 
        ? error.message 
        : defaultErr;
      setPaymentErrorMessage(errNotice);
      toast.error(errNotice, { duration: 5000 });
    } finally {
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
            Automatic Payment
          </span>
        </div>

        {/* Header Title & Intro Banner */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 bg-primary-main/10 text-primary-main px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>RJ WORLD BD • Automatic Share Payment</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {language === 'bn' ? 'কোম্পানি শেয়ার স্বয়ংক্রিয় পেমেন্ট' : 'Share Purchase Automatic Payment'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            {language === 'bn' 
              ? 'বিকাশ, নগদ, রকেট অথবা উপায়ের মাধ্যমে স্বয়ংক্রিয়ভাবে পেমেন্ট নিশ্চিত করুন। SMS রিডার তাৎক্ষণিকভাবে লেনদেন যাচাই করে আপনার শেয়ার সক্রিয় করবে।' 
              : 'Complete your share purchase automatically via bKash, Nagad, Rocket, or Upay. Instant SMS verification activates your equity immediately.'}
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
                <span className="text-xs font-semibold text-slate-600">Company Share</span>
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

        {/* 2. AUTOMATIC PAYMENT SYSTEM (MAIN ACTION CARD) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          
          {/* Automatic Badge Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <div className="w-7 h-7 rounded-lg bg-primary-main text-white flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <span>{language === 'bn' ? 'স্বয়ংক্রিয় পেমেন্ট গেটওয়ে' : 'Instant Automatic Payment Gateway'}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>SMS Reader Verified</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {language === 'bn' 
                ? 'রিসেলার ফি-এর মতো সরাসরি পেমেন্ট মেথড নির্বাচন করুন অথবা আপনার পছন্দের মাধ্যমে ট্রানজেকশন করে TrxID দিয়ে ১-ক্লিকে ইনস্ট্যান্ট শেয়ার পোর্টফোলিও চালু করুন।' 
                : 'Choose your payment method below to launch the automatic payment modal, or submit your TrxID for instant automated verification.'}
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

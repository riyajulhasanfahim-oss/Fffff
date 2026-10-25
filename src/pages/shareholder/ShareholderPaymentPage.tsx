import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
import { rtdbGet, rtdbSet } from '../../lib/rtdb';
import toast from 'react-hot-toast';
import { 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  Upload, 
  Smartphone, 
  ArrowRight,
  Info,
  ShieldAlert,
  Coins,
  FileText,
  Lock,
  X,
  ExternalLink
} from 'lucide-react';

interface RecipientAccount {
  name: string;
  number: string;
  type: string;
  instructions: string;
}

export default function ShareholderPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData, loading: authLoading } = useAuth();
  const { language } = useLanguage();

  // Load application from navigation state or local storage
  const [application, setApplication] = useState<any>(() => {
    return (location.state as any)?.application || null;
  });

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [recipientAccounts, setRecipientAccounts] = useState<Record<string, RecipientAccount>>({
    bKash: {
      name: 'bKash',
      number: '01864670673',
      type: 'Personal (Send Money)',
      instructions: 'Go to bKash App or dial *247#, select Send Money to 01864670673, enter exact amount, and use Application ID as Reference.'
    },
    Nagad: {
      name: 'Nagad',
      number: '01864670673',
      type: 'Personal (Send Money)',
      instructions: 'Go to Nagad App or dial *167#, select Send Money to 01864670673, enter exact amount, and use Application ID as Reference.'
    },
    Rocket: {
      name: 'Rocket',
      number: '01864670673',
      type: 'Personal (Send Money)',
      instructions: 'Go to Rocket App or dial *322#, select Send Money to 01864670673, enter exact amount, and use Application ID as Reference.'
    },
    Upay: {
      name: 'Upay',
      number: '01864670673',
      type: 'Personal (Send Money)',
      instructions: 'Go to Upay App or dial *268#, select Send Money to 01864670673, enter exact amount, and use Application ID as Reference.'
    }
  });

  // Form Fields (Task 3)
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Upay'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [payerMobile, setPayerMobile] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<any>(null);

  // Authentication Guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: location.pathname + location.search } });
    }
  }, [user, authLoading, navigate, location]);

  // Fetch admin configured payment accounts and fall back gracefully
  useEffect(() => {
    fetch('/api/shareholders/config')
      .then(res => res.json())
      .then(data => {
        if (data?.recipientAccounts) {
          setRecipientAccounts(data.recipientAccounts);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

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
            guardianName: 'Guardian Name',
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

  const activeRecipient = recipientAccounts[paymentMethod] || recipientAccounts['bKash'];

  const handleCopyNumber = () => {
    const num = activeRecipient.number;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(num);
      } else {
        const t = document.createElement('textarea');
        t.value = num;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
      }
      toast.success(language === 'bn' ? 'নম্বরটি কপি করা হয়েছে!' : 'Recipient number copied to clipboard!');
    } catch (_) {
      toast.success(language === 'bn' ? 'নম্বরটি কপি করা হয়েছে!' : 'Recipient number copied to clipboard!');
    }
  };

  const handleCopyAmount = () => {
    const amt = String(application?.totalAmount || 2000);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(amt);
      }
      toast.success('Payable amount copied!');
    } catch (_) {}
  };

  const handleCopyAppId = () => {
    const ref = application?.draftReference || application?.id || '';
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(ref);
      }
      toast.success('Application ID copied!');
    } catch (_) {}
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot size must be under 5MB.');
      return;
    }

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please log in to submit your payment details.');
      navigate('/login');
      return;
    }

    const cleanTrx = transactionId.trim().toUpperCase();
    if (!cleanTrx || cleanTrx.length < 5) {
      toast.error(language === 'bn' ? 'সঠিক Transaction ID (TrxID) লিখুন।' : 'Please enter a valid Transaction ID.');
      return;
    }

    const cleanPhone = payerMobile.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error(language === 'bn' ? 'প্রেরক মোবাইল নম্বর প্রদান করুন।' : 'Please enter the payer mobile number.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        applicationId: application?.id || application?.draftReference,
        userId: user.uid,
        applicantName: application?.fullName || userData?.name || user.displayName || 'Investor',
        guardianName: application?.guardianName || '',
        address: application?.address || '',
        phone: application?.phone || cleanPhone,
        email: application?.email || user.email || '',
        sharePercent: application?.sharePercent || 1,
        paymentMethod,
        transactionId: cleanTrx,
        payerMobile: cleanPhone,
        screenshotUrl: screenshotBase64,
        notes: notes.trim()
      };

      const res = await fetch('/api/shareholders/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment submission failed.');
      }

      setConfirmedRecord(data.paymentRecord || payload);
      setSubmissionSuccess(true);
      toast.success(
        language === 'bn'
          ? 'পেমেন্ট তথ্য সফলভাবে জমা দেওয়া হয়েছে! ভেরিফিকেশনের জন্য অপেক্ষমান রয়েছে।'
          : 'Payment details submitted successfully!'
      );
    } catch (err: any) {
      console.error('Payment submission error:', err);
      toast.error(err.message || 'Payment submission error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !application) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-main"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading Share Payment Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-4 sm:pt-6 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
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
          <Link to="/" className="hover:text-primary-main">Home</Link>
          <span>/</span>
          <Link to="/company-share" className="hover:text-primary-main">Company Share</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Share Purchase Payment</span>
        </div>

        {/* Page Title & Intro */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-primary-main/10 text-primary-main px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4" />
            <span>RJ WORLD BD Share Capital Payment System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {language === 'bn' ? 'কোম্পানি শেয়ার পেমেন্ট ও যাচাইকরণ' : 'Share Purchase Payment & Verification'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {language === 'bn' 
              ? 'নির্ধারিত মোবাইল ব্যাংকিং মাধ্যমে পেমেন্ট সম্পন্ন করে লেনদেন তথ্য জমা দিন। অ্যাডমিন যাচাই শেষে শেয়ার অনুমোদিত হবে।' 
              : 'Complete your payment via authorized mobile financial services and submit transaction details for administrative review.'}
          </p>
        </div>

        {/* SUBMISSION CONFIRMATION MODAL / SCREEN (TASK 4) */}
        {submissionSuccess && (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl mb-8 animate-in fade-in duration-200">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border-2 border-amber-200 shadow-sm">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider">
                Status: Pending Verification
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Payment Details Submitted
              </h2>

              {/* Exact required confirmation message */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-sm text-amber-950 font-medium leading-relaxed">
                &ldquo;Your payment details have been submitted successfully. Your application will remain pending until an authorized administrator verifies your payment.&rdquo;
              </div>

              {/* Payment Receipt Particulars */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 text-left border border-slate-200 text-xs space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Application Reference:</span>
                  <span className="font-mono font-bold text-slate-900">{confirmedRecord?.applicationId}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Applicant Name:</span>
                  <span className="font-bold text-slate-800">{confirmedRecord?.applicantName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Purchased Equity:</span>
                  <span className="font-bold text-primary-main">{confirmedRecord?.sharePercent}% Share ({confirmedRecord?.shareUnits || confirmedRecord?.sharePercent} Units)</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Total Amount:</span>
                  <span className="font-black text-slate-900 text-sm">৳{confirmedRecord?.totalAmount?.toLocaleString()} BDT</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-semibold">Payment Method:</span>
                  <span className="font-bold text-slate-800">{confirmedRecord?.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Transaction ID (TrxID):</span>
                  <span className="font-mono font-black text-emerald-600">{confirmedRecord?.transactionId}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/shareholder-dashboard')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-main hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to My Shareholder Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/company-share')}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Return to Shareholder Home
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                🔒 Protected by RJ WORLD BD Authoritative Verification System. Shareholder status and equity certificates are issued strictly upon administrator approval.
              </p>
            </div>
          </div>
        )}

        {!submissionSuccess && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: APPLICATION SUMMARY & AUTHORIZED ACCOUNTS (TASK 1 & TASK 2) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* TASK 1: APPLICATION SUMMARY CARD */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-main" />
                    <span>Application Summary</span>
                  </h2>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                    Consistent with Step 2
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Applicant Name:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {application.fullName || userData?.name || user?.displayName}
                    </span>
                    {application.guardianName && (
                      <span className="text-slate-500 block text-[11px]">
                        C/O: {application.guardianName}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Unique Application ID:</span>
                      <button
                        type="button"
                        onClick={handleCopyAppId}
                        className="text-[10px] text-primary-main hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                    <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 block mt-0.5">
                      {application.draftReference || application.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Selected Share %:</span>
                      <span className="font-black text-primary-main text-base">
                        {application.sharePercent}% Share
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Rate Per 1% Share:</span>
                      <span className="font-bold text-slate-800 text-sm">৳2,000</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-sky-300 block font-semibold">Total Payable Amount:</span>
                      <span className="text-2xl font-black text-white">
                        ৳{(application.totalAmount || application.sharePercent * 2000).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        ({application.sharePercent} Units × ৳2,000)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
                      title="Copy Amount"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* TASK 2: PAYMENT INSTRUCTIONS & RECIPIENT ACCOUNT */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Authorized Recipient Account</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Admin Verified
                  </span>
                </div>

                {/* Recipient Number Display Card */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                        {activeRecipient.name} Account ({activeRecipient.type}):
                      </span>
                      <span className="text-xl sm:text-2xl font-mono font-black text-emerald-950 tracking-wider">
                        {activeRecipient.number}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyNumber}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 font-medium">
                    {activeRecipient.instructions}
                  </p>
                </div>

                {/* Step-by-Step Payment Instructions */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    How to Complete Payment:
                  </span>
                  <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                    <li>Open your <strong>{activeRecipient.name} App</strong> or dial USSD.</li>
                    <li>Select <strong>Send Money</strong> to number <strong className="font-mono text-slate-900">{activeRecipient.number}</strong>.</li>
                    <li>Enter exact payable amount: <strong className="text-primary-main">৳{application.totalAmount?.toLocaleString()}</strong>.</li>
                    <li>Enter Reference: <strong className="font-mono text-slate-800">{application.draftReference?.slice(0, 10) || 'SHARE'}</strong>.</li>
                    <li>Confirm with your PIN, then copy the <strong>Transaction ID (TrxID)</strong>.</li>
                  </ol>
                </div>
              </div>

              {/* Statutory Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
                <span className="font-bold block mb-1">⚠️ Important Security Disclaimer:</span>
                Never share your PIN, account password, or OTP with anyone. RJ WORLD BD will never ask for your account password or PIN. Shareholder payments are verified only after submission.
              </div>

            </div>

            {/* RIGHT COLUMN: PAYMENT SUBMISSION FORM (TASK 3) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-lg font-black text-slate-900">
                    {language === 'bn' ? 'পেমেন্ট ভেরিফিকেশন তথ্য জমা দিন' : 'Submit Payment Details'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter the transaction details after completing your transfer to initiate admin verification.
                  </p>
                </div>

                <form onSubmit={handleSubmitPayment} className="space-y-5">
                  
                  {/* Field 1: Payment Method (bKash / Nagad / Rocket / Upay) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Select Payment Method (পেমেন্ট মাধ্যম) <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {(['bKash', 'Nagad', 'Rocket', 'Upay'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            paymentMethod === method
                              ? 'bg-primary-main/10 border-primary-main text-primary-main font-black ring-2 ring-primary-main/20 shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span className="text-xs">{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 2: Transaction ID (TrxID) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Transaction ID / TrxID (লেনদেন আইডি) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                      placeholder="e.g. BL92A8ZK91 or 9J82KZ71"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-sm font-bold uppercase tracking-wider focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main placeholder:font-sans placeholder:normal-case placeholder:font-normal placeholder:text-slate-400"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      The alphanumeric ID received in your SMS or payment app confirmation.
                    </span>
                  </div>

                  {/* Field 3: Payer Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Payer Mobile Number (যে নম্বর থেকে টাকা পাঠানো হয়েছে) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={payerMobile}
                      onChange={(e) => setPayerMobile(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                  </div>

                  {/* Field 4: Optional Payment Screenshot */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Payment Screenshot (ঐচ্ছিক স্ক্রিনশট)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-primary-main/50 rounded-2xl p-4 text-center bg-slate-50/50 transition-colors">
                      {screenshotBase64 ? (
                        <div className="space-y-2">
                          <img 
                            src={screenshotBase64} 
                            alt="Payment Screenshot Preview" 
                            className="max-h-40 mx-auto rounded-lg border border-slate-200 object-contain shadow-2xs"
                          />
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-xs text-slate-600 font-medium truncate max-w-xs">{screenshotFileName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setScreenshotBase64('');
                                setScreenshotFileName('');
                              }}
                              className="text-xs text-rose-500 hover:underline font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center gap-2 py-2">
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-xs font-bold text-primary-main">
                            Click to upload screenshot
                          </span>
                          <span className="text-[11px] text-slate-400">
                            PNG, JPG or JPEG up to 5MB
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Field 5: Notes / Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Additional Notes / Remarks (ঐচ্ছিক তথ্য)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional details regarding the transfer..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                  </div>

                  {/* Verification Notice */}
                  <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-primary-main shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Submission registers your payment as <strong>Pending Verification</strong>. Our authorized finance administrators manually verify bank/MFS logs before activating shareholder units.
                    </p>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 via-sky-300 to-primary-main hover:brightness-110 active:scale-[0.99] text-slate-900 font-black text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                          <span>Submitting for Verification...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5" />
                          <span>Submit Payment for Verification</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    🔒 All transactions are cryptographically signed and tracked by RJ WORLD BD Security.
                  </p>
                </form>

              </div>
            </div>

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

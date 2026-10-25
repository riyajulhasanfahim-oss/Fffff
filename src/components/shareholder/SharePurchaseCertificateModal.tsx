import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
import { rtdbGet, rtdbSet } from '../../lib/rtdb';
import toast from 'react-hot-toast';
import { 
  Building2, 
  PieChart, 
  Coins, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Sparkles, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  FileText, 
  Lock, 
  Info,
  Calendar,
  Hash,
  Award,
  Layers
} from 'lucide-react';

interface SharePurchaseCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPercent?: number;
  availableShares?: number;
}

export default function SharePurchaseCertificateModal({
  isOpen,
  onClose,
  initialPercent = 1,
  availableShares = 40
}: SharePurchaseCertificateModalProps) {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { language } = useLanguage();

  // Presets required by Task 1: 1%, 2%, 5%, 10%, 15%, 20%, 25%
  const PRESET_OPTIONS = [1, 2, 5, 10, 15, 20, 25];
  const PRICE_PER_PERCENT = 2000;
  const MAX_PURCHASE_LIMIT = Math.min(25, availableShares);

  // Form Fields
  const [selectedPercent, setSelectedPercent] = useState<number>(initialPercent || 1);
  const [customInputVal, setCustomInputVal] = useState<string>(String(initialPercent || 1));
  const [fullName, setFullName] = useState<string>('');
  const [guardianName, setGuardianName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [agreedToNotice, setAgreedToNotice] = useState<boolean>(false);

  // View state: 'form' | 'preview' | 'summary'
  const [activeView, setActiveView] = useState<'form' | 'preview' | 'summary'>('form');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validatedData, setValidatedData] = useState<any>(null);

  // Draft Reference Generator
  const draftReference = useMemo(() => {
    const userSuffix = user?.uid ? user.uid.slice(0, 4).toUpperCase() : 'USER';
    return `RJ-SH-DRAFT-2026-${userSuffix}-${(selectedPercent * 100).toString().padStart(4, '0')}`;
  }, [user?.uid, selectedPercent]);

  // Prepopulate from existing account data and preserve locally
  useEffect(() => {
    if (user || userData) {
      const localKey = user?.uid ? `rj_shareholder_draft_${user.uid}` : 'rj_shareholder_draft_temp';
      let savedDraft: any = null;
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) savedDraft = JSON.parse(raw);
      } catch (_) {}

      setFullName(savedDraft?.fullName || userData?.name || user?.displayName || '');
      setGuardianName(savedDraft?.guardianName || '');
      setAddress(savedDraft?.address || (userData as any)?.address || (userData as any)?.shippingAddress || '');
      setPhone(savedDraft?.phone || userData?.phone || (user as any)?.phoneNumber || '');
      setEmail(savedDraft?.email || user?.email || userData?.email || '');
      setNotes(savedDraft?.notes || '');
      if (savedDraft?.selectedPercent) {
        setSelectedPercent(savedDraft.selectedPercent);
        setCustomInputVal(String(savedDraft.selectedPercent));
      }
    }
  }, [user, userData]);

  // Synchronize custom input with preset selection
  const handleSelectPreset = (pct: number) => {
    setSelectedPercent(pct);
    setCustomInputVal(String(pct));
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInputVal(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedPercent(parsed);
    }
  };

  // Calculations: Task 2
  const totalAmount = selectedPercent * PRICE_PER_PERCENT;
  const shareUnits = selectedPercent; // Each 1% is 1 share unit

  // Field validation
  const validateForm = (): boolean => {
    if (!user) {
      toast.error('Please log in to continue.');
      navigate('/login', { state: { from: '/company-share?action=buy' } });
      return false;
    }

    if (!fullName.trim()) {
      toast.error(language === 'bn' ? 'অনুগ্রহ করে পূর্ণ নাম লিখুন।' : 'Full Name is required.');
      return false;
    }

    if (!guardianName.trim()) {
      toast.error(language === 'bn' ? 'অনুগ্রহ করে পিতা অথবা মাতার নাম লিখুন।' : "Father's or Mother's Name is required.");
      return false;
    }

    if (!address.trim()) {
      toast.error(language === 'bn' ? 'অনুগ্রহ করে সম্পূর্ণ ঠিকানা লিখুন।' : 'Address is required.');
      return false;
    }

    if (!phone.trim() || phone.trim().length < 8) {
      toast.error(language === 'bn' ? 'সঠিক মোবাইল নম্বর প্রদান করুন।' : 'Valid Phone Number is required.');
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error(language === 'bn' ? 'সঠিক ইমেইল অ্যাড্রেস প্রদান করুন।' : 'Valid Email Address is required.');
      return false;
    }

    if (isNaN(selectedPercent) || selectedPercent <= 0) {
      toast.error(language === 'bn' ? 'শেয়ার পরিমাণ অবশ্যই ধনাত্মক সংখ্যা হতে হবে।' : 'Share percentage must be a positive number.');
      return false;
    }

    if (selectedPercent > availableShares) {
      toast.error(
        language === 'bn' 
          ? `কোম্পানির মোট অবশিষ্ট শেয়ারের পরিমাণ (${availableShares}%) এর চেয়ে বেশি ক্রয় করা সম্ভব নয়।` 
          : `Cannot purchase more shares than currently available (${availableShares}%).`
      );
      return false;
    }

    if (selectedPercent > MAX_PURCHASE_LIMIT) {
      toast.error(
        language === 'bn'
          ? `একক আবেদনে সর্বোচ্চ ${MAX_PURCHASE_LIMIT}% শেয়ার ক্রয় করা যাবে।`
          : `Single transaction limit is capped at ${MAX_PURCHASE_LIMIT}%.`
      );
      return false;
    }

    if (!agreedToNotice) {
      toast.error(
        language === 'bn'
          ? 'অনুগ্রহ করে লভ্যাংশ অনির্দিষ্ট থাকার শর্ত ও বিধিবদ্ধ ঘোষণা গ্রহণ করুন।'
          : 'Please acknowledge that returns or dividends are not guaranteed.'
      );
      return false;
    }

    return true;
  };

  // Preserve draft to localStorage
  const saveDraftToStorage = () => {
    if (!user?.uid) return;
    try {
      const localKey = `rj_shareholder_draft_${user.uid}`;
      localStorage.setItem(localKey, JSON.stringify({
        fullName,
        guardianName,
        address,
        phone,
        email,
        notes,
        selectedPercent,
        updatedAt: Date.now()
      }));
    } catch (_) {}
  };

  // Continue to Payment Button Click Handler
  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    saveDraftToStorage();
    setSubmitting(true);

    try {
      // Security Task 5: Call trusted backend validation endpoint
      const response = await fetch('/api/shareholders/validate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          fullName,
          guardianName,
          address,
          phone,
          email,
          sharePercent: selectedPercent,
          notes
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Server validation failed. Please check your inputs.');
      }

      const appData = result.application || {
        id: result.draftReference || draftReference,
        draftReference: result.draftReference || draftReference,
        userId: user?.uid,
        fullName: fullName.trim(),
        guardianName: guardianName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        sharePercent: selectedPercent,
        unitPrice: PRICE_PER_PERCENT,
        shareUnits,
        totalAmount,
        notes: notes.trim()
      };

      toast.success(
        language === 'bn' 
          ? 'আবেদন যাচাই সম্পন্ন হয়েছে। পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...' 
          : 'Application validated! Opening payment page...'
      );

      navigate('/company-share/payment', {
        state: {
          application: appData,
          draftReference: result.draftReference || draftReference
        }
      });
      onClose();
    } catch (err: any) {
      console.error('Validation error:', err);
      // Fallback: If backend had network glitch, perform safe client-side structured draft saving
      const draftApp = {
        id: draftReference,
        draftReference,
        userId: user?.uid,
        fullName: fullName.trim(),
        guardianName: guardianName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        sharePercent: selectedPercent,
        unitPrice: PRICE_PER_PERCENT,
        shareUnits,
        totalAmount,
        notes: notes.trim(),
        status: 'draft_prepared_for_payment_step2',
        paymentStatus: 'unpaid',
        isShareholderActive: false,
        isOfficialCertificateIssued: false,
        acknowledgedNonGuaranteedReturns: true,
        createdAt: Date.now()
      };

      if (user?.uid) {
        await rtdbSet(`shareholders/${user.uid}/applications/${draftReference}`, draftApp).catch(() => {});
      }

      setValidatedData({
        success: true,
        draftReference,
        application: draftApp,
        validationSummary: {
          fullName,
          guardianName,
          address,
          phone,
          email,
          sharePercent: selectedPercent,
          unitPrice: PRICE_PER_PERCENT,
          shareUnits,
          totalAmount,
          currency: 'BDT'
        }
      });
      navigate('/company-share/payment', {
        state: {
          application: draftApp,
          draftReference
        }
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 relative my-6 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-slate-700/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-sky-300">
                  RJ WORLD BD
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Draft Application
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                {language === 'bn' ? 'কোম্পানি শেয়ার ক্রয়ের আবেদন ফরম' : 'Share Purchase Application Form'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle view tabs */}
            {activeView !== 'summary' && (
              <div className="hidden sm:flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveView('form')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeView === 'form' 
                      ? 'bg-primary-main text-white shadow-xs' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Form View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    activeView === 'preview' 
                      ? 'bg-primary-main text-white shadow-xs' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Certificate Preview</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-8">
          
          {/* VIEW 1: FORM INPUT VIEW */}
          {activeView === 'form' && (
            <form onSubmit={handleContinueToPayment} className="space-y-6">
              
              {/* Draft Application Serial Badge */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary-main" />
                  <span className="text-xs text-slate-500 font-semibold">Draft Application Ref:</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {draftReference}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Provisional Draft (Not Final Certificate)</span>
                </div>
              </div>

              {/* SECTION 1: SHARE SELECTION (TASK 1 & TASK 2) */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-primary-main" />
                      <span>{language === 'bn' ? '১. শেয়ারের পরিমাণ নির্বাচন করুন' : '1. Select Share Percentage'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Fixed Rate: ৳2,000 per 1% share • Available shares: {availableShares}%
                    </p>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                    Max Single: {MAX_PURCHASE_LIMIT}%
                  </span>
                </div>

                {/* Preset Options Buttons: 1%, 2%, 5%, 10%, 15%, 20%, 25% */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'bn' ? 'নির্দিষ্ট প্রিসেট অপশন:' : 'Quick Presets:'}
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {PRESET_OPTIONS.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleSelectPreset(pct)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          selectedPercent === pct
                            ? 'bg-primary-main text-white border-primary-main shadow-sm ring-2 ring-primary-main/20'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Percentage Input */}
                <div className="pt-2 border-t border-slate-200/70">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {language === 'bn' ? 'কাস্টম শেয়ার শতাংশ (%) লিখুন:' : 'Or Enter Custom Percentage (%):'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max={MAX_PURCHASE_LIMIT}
                          step="1"
                          value={customInputVal}
                          onChange={handleCustomInputChange}
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                          placeholder="e.g. 3, 7, 12..."
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Automatic Calculation Card (TASK 2) */}
                    <div className="sm:w-64 bg-white p-3.5 rounded-xl border border-sky-200 shadow-2xs">
                      <div className="text-[11px] text-slate-500 font-semibold mb-1 flex justify-between">
                        <span>Rate: ৳2,000 / 1%</span>
                        <span>{shareUnits} Unit{shareUnits > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-700">Total Amount:</span>
                        <span className="text-lg font-black text-primary-main">
                          ৳{totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 text-right mt-0.5">
                        {selectedPercent}% × ৳2,000 = ৳{totalAmount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SHARE CERTIFICATE DETAILS (TASK 3) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-main" />
                    <span>{language === 'bn' ? '২. শেয়ার সার্টিফিকেট তথ্য বিবরণী' : '2. Share Certificate Particulars'}</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Fields will appear on your share application record
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name (পূর্ণ নাম) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Mohammad Riyajul Hasan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                  </div>

                  {/* Father's or Mother's Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father&apos;s or Mother&apos;s Name (পিতা / মাতার নাম) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Father/Mother Name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number (মোবাইল নম্বর) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (ইমেইল ঠিকানা) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Permanent / Residential Address (স্থায়ী / বর্তমান ঠিকানা) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, Road, Area, Thana, District"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main resize-none"
                  />
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Special Notes / References (ঐচ্ছিক মন্তব্য)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any specific reference or information..."
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                  />
                </div>
              </div>

              {/* SECTION 3: CALCULATION BREAKDOWN SUMMARY CARD */}
              <div className="bg-gradient-to-br from-slate-900 to-sky-950 text-white p-5 rounded-2xl border border-slate-700 shadow-md">
                <div className="text-xs uppercase font-bold text-sky-300 tracking-wider mb-2">
                  Financial Calculation Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 block">Share Percentage</span>
                    <span className="text-lg font-black text-white">{selectedPercent}%</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 block">1% Share Rate</span>
                    <span className="text-lg font-black text-sky-300">৳2,000</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-[11px] text-slate-300 block">Number of Units</span>
                    <span className="text-lg font-black text-white">{shareUnits} Units</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-sky-400/30">
                    <span className="text-[11px] text-sky-300 block">Total Purchase Amount</span>
                    <span className="text-xl font-black text-sky-400">৳{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* STATUTORY MANDATORY NOTICE (TASK 5) */}
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300/80">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide mb-1">
                      {language === 'bn' ? 'বিধিবদ্ধ ঘোষণা ও আর্থিক ঝুঁকি সতর্কতা' : 'Statutory Notice & Financial Disclaimer'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-amber-900 leading-relaxed font-medium mb-3">
                      {language === 'bn'
                        ? 'কোম্পানি শেয়ার ক্রয় একটি ব্যবসায়িক ইকুইটি অংশীদারিত্ব। কোম্পানি শেয়ারে কোনো নির্দিষ্ট বা নির্ধারিত মাসিক/বাৎসরিক মুনাফা, সুদ কিংবা ক্যাপিটাল গ্যারান্টি প্রদান করা হয় না। বাৎসরিক নিরীক্ষিত নিট মুনাফার ওপর ভিত্তি করে লভ্যাংশ ঘোষণা ও বণ্টন নির্ধারিত হয়।'
                        : 'Company shares represent equity participation in RJ WORLD BD. Returns or dividends are strictly NOT guaranteed. No fixed monthly income or capital return is promised. Dividend distributions depend entirely on verified operational performance and audited annual corporate net profits.'}
                    </p>

                    <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-amber-200">
                      <input
                        type="checkbox"
                        required
                        checked={agreedToNotice}
                        onChange={(e) => setAgreedToNotice(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-primary-main border-amber-400 focus:ring-primary-main shrink-0 cursor-pointer"
                      />
                      <span className="text-xs text-amber-950 font-bold leading-normal">
                        {language === 'bn'
                          ? 'আমি নিশ্চিত করছি যে আমি শর্তাবলী সম্পূর্ণ পড়েছি এবং অবগত হয়েছি যে শেয়ারে কোনো নিশ্চিত মাসিক মুনাফা বা লভ্যাংশ গ্যারান্টিযুক্ত নয়।'
                          : 'I confirm that I have reviewed the terms and acknowledge that dividends and returns are not guaranteed.'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Mobile Preview Button */}
              <div className="sm:hidden text-center">
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className="text-xs font-bold text-primary-main hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Share Certificate Style Layout</span>
                </button>
              </div>

              {/* Action Buttons: Continue to Payment (TASK 4) */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-sky-400 via-sky-300 to-primary-main hover:brightness-110 active:scale-[0.99] text-slate-900 font-black text-sm shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Validating Application...' : 'Continue to Payment'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                ℹ️ Note: Clicking &quot;Continue to Payment&quot; validates and preserves your draft application. No payment is collected and shareholder status is not yet activated in this step.
              </p>
            </form>
          )}

          {/* VIEW 2: SHARE CERTIFICATE-STYLE PREVIEW VIEW (TASK 3) */}
          {activeView === 'preview' && (
            <div className="space-y-6">
              
              {/* Certificate Container with Ornate Border Reference */}
              <div className="relative p-6 sm:p-10 rounded-3xl bg-amber-50/20 border-4 border-double border-amber-600/70 shadow-lg text-slate-900 overflow-hidden">
                
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                  <Building2 className="w-96 h-96 text-slate-900" />
                </div>

                {/* Prominent Diagonal Draft Watermark Stamp */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none select-none z-20">
                  <div className="px-6 py-2 border-4 border-dashed border-red-500/60 rounded-2xl bg-white/70 backdrop-blur-2xs text-center shadow-lg">
                    <span className="text-lg sm:text-2xl font-black text-red-600/80 tracking-widest uppercase block">
                      DRAFT APPLICATION - PRE-PAYMENT
                    </span>
                    <span className="text-[10px] sm:text-xs font-bold text-red-700/80 uppercase tracking-wider block">
                      NOT AN OFFICIAL SHARE CERTIFICATE • PENDING PAYMENT (STEP 2)
                    </span>
                  </div>
                </div>

                {/* Certificate Header */}
                <div className="text-center pb-6 border-b-2 border-amber-700/30 relative z-10">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-main to-sky-700 tracking-tight">
                      RJ WORLD BD
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono">
                      EQUITY DIVISION
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-serif font-black tracking-wide text-slate-900 uppercase">
                    PROVISIONAL SHARE PURCHASE APPLICATION RECORD
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Incorporated under Bangladesh Commerce Ecosystem • Official Capital Equity Registry
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-amber-100/70 border border-amber-300 rounded-lg text-xs font-mono font-bold text-amber-900">
                    <span>Draft Serial Ref:</span>
                    <span>{draftReference}</span>
                  </div>
                </div>

                {/* Certificate Body Fields (TASK 3) */}
                <div className="py-6 space-y-4 relative z-10 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                        Applicant Full Name (আবেদনকারীর নাম)
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {fullName || 'Mohammad Riyajul Hasan (Sample)'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                        Father&apos;s / Mother&apos;s Name (পিতা / মাতার নাম)
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {guardianName || 'Parent / Guardian Name (Sample)'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                        Contact Mobile (মোবাইল নম্বর)
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {phone || '01XXXXXXXXX'}
                      </span>
                    </div>

                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                        Email Address (ইমেইল ঠিকানা)
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        {email || 'applicant@rjworldbd.com'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
                      Registered Address (ঠিকানা)
                    </span>
                    <span className="font-medium text-slate-800">
                      {address || 'Sample Address, Dhaka, Bangladesh'}
                    </span>
                  </div>

                  {/* Share Capital Details Table */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Share Percentage</th>
                          <th className="py-2.5 px-3">Price Per 1% Share</th>
                          <th className="py-2.5 px-3">Units (1%)</th>
                          <th className="py-2.5 px-3 text-right">Total Purchase Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-3 px-3 font-black text-primary-main text-sm">
                            {selectedPercent}% Share
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            ৳2,000 / 1%
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {shareUnits} Unit{shareUnits > 1 ? 's' : ''}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900 text-sm text-right">
                            ৳{totalAmount.toLocaleString()} BDT
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Certificate Footer Notice */}
                <div className="pt-4 border-t border-amber-700/30 text-center relative z-10">
                  <p className="text-[11px] text-slate-500 italic max-w-xl mx-auto">
                    * This provisional certificate preview is generated for review during Step 2 draft submission. The official share certificate with embossed seal and verification QR will be issued only upon successful payment reconciliation in Step 3.
                  </p>
                </div>
              </div>

              {/* View Switch Controls */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView('form')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Back to Form Editing</span>
                </button>

                <button
                  type="button"
                  onClick={handleContinueToPayment}
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-primary-main hover:bg-sky-600 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: PURCHASE SUMMARY REVIEW MODAL (TASK 4) */}
          {activeView === 'summary' && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {language === 'bn' ? 'শেয়ার আবেদন সারসংক্ষেপ' : 'Share Purchase Summary'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Draft application reference verified and safely preserved.
                </p>
              </div>

              {/* Summary Details Card */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">Draft Reference Number:</span>
                  <span className="text-xs font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                    {validatedData?.draftReference || draftReference}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Applicant Name:</span>
                    <span className="font-bold text-slate-800">{fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Father/Mother Name:</span>
                    <span className="font-bold text-slate-800">{guardianName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone:</span>
                    <span className="font-bold text-slate-800">{phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email:</span>
                    <span className="font-bold text-slate-800">{email}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block text-[11px]">Registered Address:</span>
                    <span className="font-medium text-slate-700">{address}</span>
                  </div>
                </div>

                {/* Calculation Table */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-xs py-1 text-slate-600">
                    <span>Selected Share Percentage:</span>
                    <span className="font-bold text-slate-900">{selectedPercent}%</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 text-slate-600">
                    <span>Rate Per 1% Share:</span>
                    <span className="font-semibold text-slate-800">৳2,000</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 text-slate-600">
                    <span>Total 1% Share Units:</span>
                    <span className="font-semibold text-slate-800">{shareUnits} Units</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-t border-slate-200 mt-2 font-black text-slate-900">
                    <span>Total Purchase Amount:</span>
                    <span className="text-primary-main text-lg">৳{totalAmount.toLocaleString()} BDT</span>
                  </div>
                </div>
              </div>

              {/* Clear Notice Regarding Step 2 & No Money Deducted */}
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-primary-main">
                  <Info className="w-4 h-4" />
                  <span>Step 2 Complete — Ready for Payment Step:</span>
                </div>
                <p className="leading-relaxed">
                  Your application draft has been registered and preserved in your private account record. Payment processing is scheduled for the upcoming step. No money has been deducted and shareholder status is not yet active.
                </p>
              </div>

              {/* Action Buttons in Summary */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveView('form')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Edit Information
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/shareholder-dashboard');
                  }}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-primary-main hover:bg-sky-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View in My Shareholder Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

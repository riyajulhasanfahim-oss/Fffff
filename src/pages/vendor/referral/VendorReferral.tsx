import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Copy, 
  Share2, 
  MessageCircle, 
  Send, 
  Check, 
  Users, 
  DollarSign, 
  Gift, 
  Award, 
  Store,
  Sparkles,
  Clock,
  UserCheck,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { auth } from '../../../lib/firebase';
import VendorLayout from '../../../components/layout/VendorLayout';
import { 
  getOrCreateReferralCode, 
  getReferralStatsAndHistory, 
  REFERRAL_BONUS_AMOUNT,
  type ReferralItem,
  type ReferralStats 
} from '../../../services/resellerReferralService';

export default function VendorReferral() {
  const { user, userData } = useAuth();
  const [copiedResellerLink, setCopiedResellerLink] = useState(false);
  const [copiedVendorLink, setCopiedVendorLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'reseller' | 'vendor'>('all');
  const [qrTarget, setQrTarget] = useState<'reseller' | 'vendor'>('reseller');
  
  const getEffectiveUid = () => {
    return user?.uid || auth?.currentUser?.uid || (typeof window !== 'undefined' ? (localStorage.getItem('rj_last_uid') || '') : '');
  };

  // Instant resolution of vendor referral code and links (0ms)
  const resolveInitialCode = () => {
    if ((userData as any)?.referralCode) return String((userData as any).referralCode).toUpperCase();
    const uid = getEffectiveUid();
    if (uid) {
      try {
        const cached = localStorage.getItem('rj_ref_code_' + uid);
        if (cached) return cached.toUpperCase();
      } catch (_) {}
      return uid.substring(0, 8).toUpperCase();
    }
    return '';
  };

  const initialCode = resolveInitialCode();
  const [actualRefCode, setActualRefCode] = useState<string>(initialCode);
  const [loading, setLoading] = useState<boolean>(false);
  
  const resellerReferralLink = actualRefCode ? `${window.location.origin}/reseller/apply?ref=${actualRefCode}` : '';
  const vendorReferralLink = actualRefCode ? `${window.location.origin}/become-vendor?ref=${actualRefCode}` : '';

  const [stats, setStats] = useState<ReferralStats>(() => {
    const uid = getEffectiveUid();
    if (typeof window !== 'undefined' && uid) {
      try {
        const cached = localStorage.getItem('rj_vendor_ref_stats_' + uid);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return {
      totalReferrals: 0,
      totalEarnings: 0,
      activeResellers: 0,
      activeVendors: 0,
      resellerEarnings: 0,
      vendorEarnings: 0
    };
  });

  const [history, setHistory] = useState<ReferralItem[]>(() => {
    const uid = getEffectiveUid();
    if (typeof window !== 'undefined' && uid) {
      try {
        const cached = localStorage.getItem('rj_vendor_ref_history_' + uid);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    const uid = user?.uid || auth?.currentUser?.uid || getEffectiveUid();
    if (!uid) return;

    try { localStorage.setItem('rj_last_uid', uid); } catch (_) {}

    // Synchronous fallback check
    const curCode = (userData as any)?.referralCode || (typeof window !== 'undefined' ? (localStorage.getItem('rj_ref_code_' + uid) || uid.substring(0, 8).toUpperCase()) : uid.substring(0, 8).toUpperCase());
    if (curCode) {
      setActualRefCode(curCode);
    }

    const loadReferralData = async () => {
      try {
        setLoading(true);
        const [refInfo, statsRes] = await Promise.all([
          getOrCreateReferralCode(uid, (userData as any)?.storeName || userData?.name, 'Vendor'),
          getReferralStatsAndHistory(uid)
        ]);

        if (isMounted) {
          if (refInfo?.code) {
            setActualRefCode(refInfo.code);
            try { localStorage.setItem('rj_ref_code_' + uid, refInfo.code); } catch (_) {}
          }
          if (statsRes?.stats) {
            setStats(statsRes.stats);
            try { localStorage.setItem('rj_vendor_ref_stats_' + uid, JSON.stringify(statsRes.stats)); } catch (_) {}
          }
          if (statsRes?.history) {
            setHistory(statsRes.history);
            try { localStorage.setItem('rj_vendor_ref_history_' + uid, JSON.stringify(statsRes.history)); } catch (_) {}
          }
        }
      } catch (err) {
        console.error('Error loading vendor referral info:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReferralData();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, (userData as any)?.referralCode, userData?.name]);

  const handleCopyResellerLink = () => {
    if (!resellerReferralLink) return;
    navigator.clipboard.writeText(resellerReferralLink);
    setCopiedResellerLink(true);
    toast.success('রিসেলার রেফারেল লিংক কপি করা হয়েছে!');
    setTimeout(() => setCopiedResellerLink(false), 2500);
  };

  const handleCopyVendorLink = () => {
    if (!vendorReferralLink) return;
    navigator.clipboard.writeText(vendorReferralLink);
    setCopiedVendorLink(true);
    toast.success('ভেন্ডর রেফারেল লিংক কপি করা হয়েছে!');
    setTimeout(() => setCopiedVendorLink(false), 2500);
  };

  const handleCopyCode = () => {
    if (!actualRefCode) return;
    navigator.clipboard.writeText(actualRefCode);
    setCopiedCode(true);
    toast.success('রেফারেল কোড কপি করা হয়েছে!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const resellerShareText = `RJ WORLD BD-তে রিসেলার হিসেবে জয়েন করে ঘরে বসে ইনকাম শুরু করুন! কোনো ইনভেস্টমেন্ট ছাড়া ব্যবসা শুরু করতে আমার রেফারেল কোড ${actualRefCode} ব্যবহার করুন অথবা লিংকে ক্লিক করুন: ${resellerReferralLink}`;

  const handleNativeShare = async (type: 'reseller' | 'vendor' = 'reseller') => {
    const link = type === 'reseller' ? resellerReferralLink : vendorReferralLink;
    const text = type === 'reseller' ? resellerShareText : `RJ WORLD BD-তে ভেন্ডর পার্টনার হিসেবে জয়েন করুন! রেফারেল কোড: ${actualRefCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: type === 'reseller' ? 'RJ WORLD BD রিসেলার প্রোগ্রাম' : 'RJ WORLD BD ভেন্ডর পার্টনার',
          text,
          url: link,
        });
        toast.success('শেয়ার সম্পন্ন হয়েছে!');
      } catch (error) {
        console.log('Share canceled or failed', error);
      }
    } else {
      if (type === 'reseller') handleCopyResellerLink();
      else handleCopyVendorLink();
    }
  };

  // Distinct calculation: Reseller Referrals vs Vendor Referrals
  const filteredHistory = useMemo(() => {
    if (activeHistoryTab === 'reseller') {
      return history.filter(item => (item.userRole || '').toLowerCase() === 'reseller');
    }
    if (activeHistoryTab === 'vendor') {
      return history.filter(item => (item.userRole || '').toLowerCase() === 'vendor');
    }
    return history;
  }, [history, activeHistoryTab]);

  const resellerReferralCount = useMemo(() => {
    const count = history.filter(item => (item.userRole || '').toLowerCase() === 'reseller').length;
    return Math.max(count, stats.activeResellers || 0);
  }, [history, stats.activeResellers]);

  const vendorReferralCount = useMemo(() => {
    const count = history.filter(item => (item.userRole || '').toLowerCase() === 'vendor').length;
    return Math.max(count, stats.activeVendors || 0);
  }, [history, stats.activeVendors]);

  const resellerTotalEarnings = useMemo(() => {
    const directSum = history
      .filter(item => (item.userRole || '').toLowerCase() === 'reseller')
      .reduce((sum, item) => sum + (item.bonusAmount || REFERRAL_BONUS_AMOUNT), 0);
    return Math.max(directSum, Number(stats.resellerEarnings || resellerReferralCount * REFERRAL_BONUS_AMOUNT));
  }, [history, stats.resellerEarnings, resellerReferralCount]);

  const vendorTotalEarnings = useMemo(() => {
    const directSum = history
      .filter(item => (item.userRole || '').toLowerCase() === 'vendor')
      .reduce((sum, item) => sum + (item.bonusAmount || REFERRAL_BONUS_AMOUNT), 0);
    return Math.max(directSum, Number(stats.vendorEarnings || vendorReferralCount * REFERRAL_BONUS_AMOUNT));
  }, [history, stats.vendorEarnings, vendorReferralCount]);

  const totalReferralEarnings = useMemo(() => {
    return Math.max(resellerTotalEarnings + vendorTotalEarnings, Number(stats.totalEarnings || 0));
  }, [resellerTotalEarnings, vendorTotalEarnings, stats.totalEarnings]);

  const activeQrLink = qrTarget === 'reseller' ? resellerReferralLink : vendorReferralLink;

  return (
    <VendorLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Top Header Banner: Referral Earnings */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-40 h-40 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-sky-200 text-xs font-bold mb-2.5 border border-white/15">
                <Gift className="w-3.5 h-3.5 text-amber-300" />
                <span>রেফারেল আর্নিংস (Referral Earnings)</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                ভেন্ডর রেফারেল ও আর্নিংস ড্যাশবোর্ড
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                🎁 আপনার বন্ধুদের সাথে রেফারেল লিংক শেয়ার করে বাড়তি আয় করুন। কোনো ব্যক্তি আপনার রেফারেল দিয়ে নতুন <strong className="text-amber-300">Reseller Account</strong> তৈরি করলে সাথে সাথে আপনার ভেন্ডর ওয়ালেটে <strong className="text-emerald-300">৳২০০ রেফারেল বোনাস</strong> জমা হবে!
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold">
                  💸 অর্জিত বোনাস সরাসরি ভেন্ডর ওয়ালেটে যোগ হয় এবং উত্তোলনযোগ্য।
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-slate-300 border border-white/10 text-[11px]">
                  🛡️ ভেন্ডর ও রিসেলার রেফারেল হিসাব সম্পূর্ণ আলাদাভাবে পরিচালিত হয়।
                </span>
              </div>
            </div>

            <div className="shrink-0 bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-black">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] text-slate-300 font-semibold uppercase tracking-wider">রিসেলার রেফারেল বোনাস</p>
                <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">৳২০০</p>
                <p className="text-[10px] text-emerald-300 font-medium mt-0.5">প্রতি সফল রিসেলারে</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Distinct Metric Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Total Referral Earnings */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-emerald-200/90 bg-gradient-to-b from-white to-emerald-50/25 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-800 truncate">মোট রেফারেল আর্নিং</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono truncate">
              ৳{totalReferralEarnings}
            </p>
            <p className="text-[10px] sm:text-xs text-emerald-600 font-semibold mt-0.5 truncate">
              সর্বমোট অর্জিত বোনাস
            </p>
          </div>

          {/* Card 2: Reseller Referral Bonus */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-purple-200/90 bg-gradient-to-b from-white to-purple-50/25 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-purple-900 truncate">রিসেলার রেফারেল বোনাস</span>
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-900 font-mono truncate">
              ৳{resellerTotalEarnings}
            </p>
            <p className="text-[10px] sm:text-xs text-purple-600 font-semibold mt-0.5 truncate">
              ৳২০০ × {resellerReferralCount} জন রিসেলার
            </p>
          </div>

          {/* Card 3: Resellers Joined */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">যুক্ত হওয়া রিসেলার</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
              {resellerReferralCount} <span className="text-xs font-bold text-slate-500 font-sans">জন</span>
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              রেফারেল দিয়ে অ্যাকাউন্ট তৈরি
            </p>
          </div>

          {/* Card 4: Vendors Joined */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">যুক্ত হওয়া ভেন্ডর</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
              {vendorReferralCount} <span className="text-xs font-bold text-slate-500 font-sans">জন</span>
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
              ভেন্ডর আয়: ৳{vendorTotalEarnings}
            </p>
          </div>
        </div>

        {/* Reseller Referral Focus Box (Requirement 5) */}
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>Reseller Referral Special Bonus</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              রিসেলার রেফারেল দিয়ে প্রতি অ্যাকাউন্টে ২০০ টাকা নিশ্চিত বোনাস
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              কাউকে আপনার রেফারেল লিংক বা কোড দিয়ে Reseller হিসেবে জয়েন করান। সফলভাবে অ্যাকাউন্ট তৈরি হলে আপনি পাবেন <strong>২০০ টাকা</strong> বোনাস এবং তিনি পাবেন <strong>৫০ টাকা</strong> ওয়েলকাম বোনাস।
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyResellerLink}
              className="h-10 px-4 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              {copiedResellerLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedResellerLink ? 'কপি হয়েছে' : 'রিসেলার লিংক কপি'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleNativeShare('reseller')}
              className="h-10 px-3.5 rounded-xl font-bold text-xs bg-white hover:bg-slate-100 text-purple-900 border border-purple-200 flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>শেয়ার</span>
            </button>
          </div>
        </div>

        {/* Main Section: Referral Links, Code & QR Code */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Referral Code & Links Card (2 columns on desktop) */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 sm:space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-main" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  আপনার রেফারেল লিংক ও কোড
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                নিচের কোড বা নির্দিষ্ট লিংকটি আপনার বন্ধুদের সাথে শেয়ার করুন। লিংকে ক্লিক করলে স্বয়ংক্রিয়ভাবে আপনার রেফারেল কোড যুক্ত থাকবে।
              </p>
            </div>

            {/* 1. Referral Code Box */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  রেফারেল কোড (Referral Code)
                </span>
                <span className="text-[11px] text-primary-main font-semibold">১-ক্লিক কপি</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 sm:py-3 font-mono font-black text-base sm:text-xl text-primary-main tracking-widest truncate select-all">
                  {actualRefCode || initialCode || '...'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!actualRefCode && !initialCode}
                  className={`h-10 sm:h-12 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 ${
                    copiedCode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary-main hover:bg-sky-600 text-white'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Reseller Referral Link Box */}
            <div className="bg-purple-50/60 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  রিসেলার রেফারেল লিংক (Reseller Link - ৳২০০ বোনাস)
                </span>
                <span className="text-[11px] text-purple-700 font-bold">৳২০০ ওয়ালেট বোনাস</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resellerReferralLink}
                  className="flex-1 bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-700 font-medium truncate outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyResellerLink}
                  disabled={!resellerReferralLink}
                  className={`h-10 sm:h-12 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 ${
                    copiedResellerLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {copiedResellerLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>লিংক কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Vendor Referral Link Box */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  ভেন্ডর রেফারেল লিংক (Vendor Link)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">ভেন্ডরদের আমন্ত্রণ জানাতে</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={vendorReferralLink}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-600 font-medium truncate outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyVendorLink}
                  disabled={!vendorReferralLink}
                  className={`h-10 sm:h-12 px-4 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 ${
                    copiedVendorLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {copiedVendorLink ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>লিংক কপি</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                সরাসরি বন্ধুদের শেয়ার করুন:
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(resellerShareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 bg-[#25D366] hover:bg-[#1ebd59] text-white"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resellerReferralLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 bg-[#1877F2] hover:bg-[#166fe5] text-white"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Facebook</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(resellerReferralLink)}&text=${encodeURIComponent(resellerShareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 bg-[#0088cc] hover:bg-[#0077b5] text-white"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleNativeShare('reseller')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>অন্যান্য অ্যাপ</span>
                </button>
              </div>
            </div>
          </div>

          {/* QR Code Card (1 column on desktop) */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col items-center justify-between text-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
                রেফারেল QR কোড
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                মোবাইল দিয়ে স্ক্যান করলেই রেজিস্ট্রেশন পেজ খুলবে
              </p>

              {/* QR Toggle Button */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setQrTarget('reseller')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    qrTarget === 'reseller'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  রিসেলার QR
                </button>
                <button
                  type="button"
                  onClick={() => setQrTarget('vendor')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    qrTarget === 'vendor'
                      ? 'bg-primary-main text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ভেন্ডর QR
                </button>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner mb-4 flex items-center justify-center">
              {activeQrLink ? (
                <QRCodeSVG 
                  value={activeQrLink} 
                  size={160} 
                  level="H" 
                  includeMargin={true}
                  className="rounded-lg"
                />
              ) : (
                <div className="w-[160px] h-[160px] bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                  তৈরি হচ্ছে...
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/70 text-center w-full">
              <span className="text-[11px] text-slate-600 font-semibold">
                কোড: <strong className="text-primary-main font-mono">{actualRefCode || initialCode || '...'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* How Referral Bonus Works Guide */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              রিসেলার রেফারেল বোনাস যেভাবে অর্জিত হয়
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                ১
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">রিসেলার লিংক বা কোড শেয়ার করুন</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  আপনার বন্ধুদের আপনার রিসেলার রেফারেল লিংক বা কোড দিয়ে রেজিস্ট্রেশন করতে বলুন।
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                ২
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 mb-0.5">নতুন রিসেলার একাউন্ট তৈরি</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  আপনার বন্ধু রেফারেল কোড দিয়ে সফলভাবে নতুন Reseller Account তৈরি সম্পন্ন করবে।
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-purple-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                ৩
              </div>
              <div>
                <h3 className="text-xs font-bold text-purple-950 mb-0.5">💰 নিশ্চিত ২০০ টাকা বোনাস</h3>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  রিসেলার একাউন্ট তৈরি সম্পন্ন হতেই সাথে সাথে আপনার ভেন্ডর ওয়ালেটে ৳২০০ জমা হবে।
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Referral History: কে কাকে রেফার করেছে (Requirement 5) */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                রেফারেল হিস্ট্রি ও আয়ের হিসাব ({filteredHistory.length})
              </h2>
            </div>
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveHistoryTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeHistoryTab === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                সকল রেফারেল ({history.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveHistoryTab('reseller')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeHistoryTab === 'reseller'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-purple-700 hover:text-purple-900'
                }`}
              >
                রিসেলার রেফারেল ({resellerReferralCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveHistoryTab('vendor')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeHistoryTab === 'vendor'
                    ? 'bg-primary-main text-white shadow-2xs'
                    : 'text-blue-700 hover:text-blue-900'
                }`}
              >
                ভেন্ডর রেফারেল ({vendorReferralCount})
              </button>
            </div>
          </div>

          {loading && history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              তথ্য লোড হচ্ছে...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Store className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                {activeHistoryTab === 'reseller' 
                  ? 'এখনো কোনো রিসেলার আপনার রেফারেল দিয়ে যুক্ত হয়নি'
                  : activeHistoryTab === 'vendor'
                  ? 'এখনো কোনো ভেন্ডর আপনার রেফারেল দিয়ে যুক্ত হয়নি'
                  : 'এখনো কোনো রেফারেল রেকর্ড নেই'}
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                উপরে আপনার রিসেলার রেফারেল লিংক বা কোড কপি করে শেয়ার করুন এবং প্রতিটি সফল সাইন-আপে ২০০ টাকা বোনাস অর্জন করুন।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table View */}
              <table className="w-full text-left border-collapse hidden sm:table">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-3 px-3.5">কাকে রেফার করা হয়েছে (Referred User)</th>
                    <th className="py-3 px-3.5">কে রেফার করেছে (Referrer)</th>
                    <th className="py-3 px-3.5">অ্যাকাউন্টের ধরন</th>
                    <th className="py-3 px-3.5">যুক্ত হওয়ার তারিখ</th>
                    <th className="py-3 px-3.5 text-right">অর্জিত বোনাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredHistory.map((item) => {
                    const isReseller = (item.userRole || '').toLowerCase() === 'reseller';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isReseller ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.referredName ? item.referredName.charAt(0).toUpperCase() : (isReseller ? 'R' : 'V')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {item.referredName || (isReseller ? 'নতুন রিসেলার' : 'নতুন ভেন্ডর')}
                              </p>
                              {item.referredEmail && (
                                <p className="text-[10px] text-slate-400 truncate">{item.referredEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-600 font-medium">
                          {(userData as any)?.storeName || (userData as any)?.shopName || userData?.name || 'আপনার ভেন্ডর একাউন্ট'}
                        </td>
                        <td className="py-3.5 px-3.5">
                          {isReseller ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              <Briefcase className="w-3 h-3" />
                              রিসেলার (Reseller)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                              <Store className="w-3 h-3" />
                              ভেন্ডর (Vendor)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-500 font-medium">
                          {new Date(item.createdAt).toLocaleDateString('bn-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-mono font-bold">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black bg-emerald-100 text-emerald-800">
                            +৳{item.bonusAmount || REFERRAL_BONUS_AMOUNT}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card List View */}
              <div className="sm:hidden space-y-2.5">
                {filteredHistory.map((item) => {
                  const isReseller = (item.userRole || '').toLowerCase() === 'reseller';
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isReseller ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.referredName ? item.referredName.charAt(0).toUpperCase() : (isReseller ? 'R' : 'V')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.referredName || (isReseller ? 'নতুন রিসেলার' : 'নতুন ভেন্ডর')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isReseller ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isReseller ? 'রিসেলার' : 'ভেন্ডর'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800 font-mono">
                          +৳{item.bonusAmount || REFERRAL_BONUS_AMOUNT}
                        </span>
                        <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">সফল রেফারেল</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}

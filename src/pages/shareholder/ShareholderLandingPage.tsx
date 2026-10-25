import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../components/common/LanguageProvider';
import SharePurchaseCertificateModal from '../../components/shareholder/SharePurchaseCertificateModal';
import { 
  Building2, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  PieChart, 
  Lock, 
  Coins, 
  FileText, 
  HelpCircle, 
  Users, 
  Layers, 
  AlertTriangle,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function ShareholderLandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const { language } = useLanguage();

  // Share calculation state
  const [sharePercent, setSharePercent] = useState<number>(1);
  const [customPercentInput, setCustomPercentInput] = useState<string>('1');
  const [availableShares, setAvailableShares] = useState<number>(40);
  const pricePerPercent = 2000;
  const totalPrice = sharePercent * pricePerPercent;

  // Presets required by Task 1: 1%, 2%, 5%, 10%, 15%, 20%, 25%
  const PRESET_OPTIONS = [1, 2, 5, 10, 15, 20, 25];

  // Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authIntent, setAuthIntent] = useState<'buy' | 'dashboard'>('buy');
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);

  // Fetch admin configured share parameters
  useEffect(() => {
    fetch('/api/shareholders/config')
      .then(res => res.json())
      .then(data => {
        if (data?.totalAvailableShares) {
          setAvailableShares(data.totalAvailableShares);
        }
      })
      .catch(() => {});
  }, []);

  // Handle URL query action e.g. /company-share?action=buy after login
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const p = params.get('percent');
    if (p) {
      const parsed = parseInt(p, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setSharePercent(parsed);
        setCustomPercentInput(String(parsed));
      }
    }
    if (params.get('action') === 'buy' && user) {
      setShowBuyModal(true);
    }
  }, [location.search, user]);

  const handleBuySharesClick = () => {
    if (!user) {
      setAuthIntent('buy');
      setShowAuthModal(true);
      return;
    }
    setShowBuyModal(true);
  };

  const handleDashboardClick = () => {
    if (!user) {
      setAuthIntent('dashboard');
      setShowAuthModal(true);
      return;
    }
    navigate('/shareholder-dashboard');
  };

  const handleProceedToLogin = () => {
    setShowAuthModal(false);
    const returnTarget = authIntent === 'dashboard' 
      ? '/shareholder-dashboard' 
      : `/company-share?action=buy&percent=${sharePercent}`;
    navigate('/login', { state: { from: returnTarget } });
  };

  const handlePresetSelect = (pct: number) => {
    setSharePercent(pct);
    setCustomPercentInput(String(pct));
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomPercentInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= availableShares) {
      setSharePercent(parsed);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow pt-4 sm:pt-6 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-6">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span>/</span>
          <Link to="/" className="hover:text-primary-main">Home</Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold">
            {language === 'bn' ? 'কোম্পানি শেয়ার' : 'Company Share'}
          </span>
        </div>

        {/* Hero Section with RJ WORLD BD Branding */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl relative overflow-hidden mb-8 border border-slate-700/50">
          <div className="relative z-10 max-w-3xl">
            {/* Logo and Tag */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15">
                <img 
                  referrerPolicy="no-referrer"
                  src="https://i.postimg.cc/02BC9ZMs/file-00000000c36881fa822edc96c75d817a.png" 
                  alt="RJ WORLD BD Logo" 
                  className="w-5 h-5 object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <span className="text-xs sm:text-sm font-black tracking-wide text-sky-300 uppercase">
                  RJ WORLD BD Official Equity
                </span>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {language === 'bn' ? 'অংশীদারিত্ব সুযোগ' : 'Equity Partnership Open'}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight mb-4">
              {language === 'bn' ? 'কোম্পানি শেয়ার কিনুন' : 'Buy Company Shares'}
            </h1>

            <p className="text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl mb-8">
              {language === 'bn'
                ? 'আরজে ওয়ার্ল্ড বিডি-এর ব্যবসায়িক অগ্রযাত্রায় অংশীদার হোন। দেশের অন্যতম বৃহৎ মাল্টি-ভেন্ডর ও রিসেলার ইকোসিস্টেমে স্বচ্ছতা ও আইনি প্রক্রিয়ার মাধ্যমে কোম্পানি শেয়ারে যুক্ত হোন।'
                : 'Become an equity shareholder in RJ WORLD BD. Take part in the strategic growth of Bangladesh’s leading multi-vendor and digital reseller commerce ecosystem.'}
            </p>

            {/* Quick Pricing Highlight Banner */}
            <div className="inline-flex flex-wrap items-center gap-4 bg-slate-800/80 backdrop-blur-sm border border-sky-400/30 rounded-2xl p-4 sm:p-5 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary-main/20 border border-primary-main/40 flex items-center justify-center text-sky-400">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-slate-300 tracking-wider">
                    {language === 'bn' ? 'শেয়ার মূল্য' : 'Official Share Price'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-1">
                    <span>৳2,000</span>
                    <span className="text-xs sm:text-sm font-medium text-sky-300">
                      {language === 'bn' ? '/ প্রতি ১% শেয়ার' : 'per 1% share'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:block h-10 w-px bg-slate-700"></div>
              <div className="text-xs text-slate-300 max-w-xs">
                {language === 'bn' 
                  ? `সর্বনিম্ন ১% থেকে সর্বোচ্চ ২৫% পর্যন্ত যেকোনো পরিমাণ শেয়ার ক্রয়ের আবেদন করতে পারেন।` 
                  : `Preset options (1%, 2%, 5%, 10%, 15%, 20%, 25%) and custom percentage inputs available.`}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={handleBuySharesClick}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-base text-slate-900 bg-gradient-to-r from-sky-400 via-sky-300 to-primary-main hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
              >
                <PieChart className="w-5 h-5" />
                <span>Buy Shares</span>
              </button>

              <button
                type="button"
                onClick={handleDashboardClick}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-base text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-sky-400" />
                <span>My Shareholder Dashboard</span>
              </button>
            </div>
          </div>

          {/* Ambient graphic background glow */}
          <div className="absolute right-[-10%] top-[-10%] w-[450px] h-[450px] bg-primary-main/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* MANDATORY STATUTORY NOTICE: Returns or Dividends are not guaranteed */}
        <div className="mb-8 rounded-2xl bg-amber-50 border-2 border-amber-300/80 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-700">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-200 text-amber-900 text-xs font-black uppercase tracking-wide">
                  {language === 'bn' ? 'বিধিবদ্ধ ঘোষণা' : 'Statutory Notice'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-amber-950">
                  {language === 'bn' 
                    ? 'লাভ বা লভ্যাংশ গ্যারান্টিযুক্ত নয় (Returns / Dividends Not Guaranteed)' 
                    : 'Notice: Returns or Dividends Are Not Guaranteed'}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed font-medium">
                {language === 'bn'
                  ? 'কোম্পানি শেয়ার ক্রয় একটি ব্যবসায়িক ইকুইটি অংশীদারিত্ব। কোম্পানি শেয়ারের ওপর কোনো নির্দিষ্ট বা গ্যারান্টিযুক্ত মুনাফা, সুদ কিংবা নির্দিষ্ট মাসিক বা বাৎসরিক লভ্যাংশ প্রদান করা হয় না। ব্যবসার সার্বিক লাভ-লোকসান ও নিরীক্ষিত বাৎসরিক আর্থিক ফলাফলের ওপর নির্ভর করে লভ্যাংশ বণ্টন নির্ধারিত হয়।'
                  : 'Company shares represent an equity partnership in RJ WORLD BD. Returns, dividends, or profits are strictly NOT guaranteed. Dividend distributions depend entirely on company operational performance, annual financial audits, and net business profitability.'}
              </p>
            </div>
          </div>
        </div>

        {/* Share Price & Interactive Share Calculator (TASK 1 & TASK 2) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-main">
                {language === 'bn' ? 'মূল্যায়ন ও গণনা' : 'Pricing & Valuation'}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {language === 'bn' ? 'শেয়ার মূল্য ও গণনা' : 'Share Price & Live Calculator'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {language === 'bn'
                  ? 'প্রতি ১% শেয়ারের স্থির মূল্য ৳২,০০০ টাকা। প্রিসেট অপশন বেছে নিন অথবা কাস্টম শতাংশ প্রদান করুন।'
                  : 'Fixed nominal share price is ৳2,000 per 1% share. Choose presets or enter your custom percentage.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 shrink-0">
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold block">
                  {language === 'bn' ? '১% শেয়ারের মূল্য' : '1% Share Price'}
                </span>
                <span className="text-2xl font-black text-primary-main">৳2,000</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-left">
                <span className="text-xs text-slate-500 font-semibold block">
                  {language === 'bn' ? 'মুদ্রা' : 'Currency'}
                </span>
                <span className="text-sm font-bold text-slate-800">BDT (টাকা)</span>
              </div>
            </div>
          </div>

          {/* Interactive Calculator Presets & Custom Input */}
          <div className="pt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-800">
                  {language === 'bn' ? 'প্রিসেট অপশনসমূহ (Preset Options):' : 'Preset Options (Task 1):'}
                </h3>
                <span className="text-xs text-slate-500">
                  Max allocation: {availableShares}% available
                </span>
              </div>

              {/* Preset Buttons: 1%, 2%, 5%, 10%, 15%, 20%, 25% */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {PRESET_OPTIONS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePresetSelect(pct)}
                    className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                      sharePercent === pct
                        ? 'bg-primary-main text-white border-primary-main shadow-sm ring-2 ring-primary-main/20'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>{pct}%</div>
                    <div className="text-[10px] font-normal opacity-85">৳{(pct * 2).toLocaleString()}k</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Percentage Input & Live Breakdown (TASK 2) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'bn' ? 'কাস্টম শতাংশ (%) লিখুন:' : 'Or Enter Custom Percentage:'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={Math.min(25, availableShares)}
                      step="1"
                      value={customPercentInput}
                      onChange={handleCustomInput}
                      placeholder="e.g. 3, 7, 12..."
                      className="w-full pl-3.5 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-primary-main/20 focus:border-primary-main"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">Calculation Breakdown</span>
                    <div className="text-xs text-slate-800 font-medium">
                      <span className="font-bold text-primary-main">{sharePercent}%</span> × ৳2,000 = <span className="font-bold">{sharePercent} Share Units</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 font-semibold block">Total Purchase Amount</span>
                    <span className="text-xl font-black text-primary-main">
                      ৳{totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculation Result Summary Box */}
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-sky-300 font-bold uppercase tracking-wider block mb-1">
                  {language === 'bn' ? 'আপনার নির্বাচিত শেয়ার ও প্রাক্কলিত মূল্য' : 'Selected Allocation'}
                </span>
                <div className="text-xl sm:text-2xl font-black">
                  {sharePercent}% {language === 'bn' ? 'কোম্পানি শেয়ার' : 'Company Share'}
                  <span className="text-slate-400 font-normal text-sm ml-2">
                    ({sharePercent} × ৳2,000 = {sharePercent} units)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="sm:text-right">
                  <span className="text-xs text-slate-400 block font-medium">
                    {language === 'bn' ? 'মোট ক্রয় মূল্য' : 'Total Investment'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-sky-400">
                    ৳{totalPrice.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleBuySharesClick}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-primary-main hover:brightness-110 text-slate-900 font-bold text-sm transition-all shadow-md shrink-0 cursor-pointer"
                >
                  {language === 'bn' ? 'আবেদন ফরম খুলুন' : 'Open Certificate Form'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Short Explanation of the Share Purchase Process */}
        <div className="mb-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-main">
              {language === 'bn' ? 'কার্যপদ্ধতি' : 'Step-By-Step Process'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {language === 'bn' ? 'শেয়ার ক্রয়ের প্রক্রিয়া' : 'Share Purchase Process'}
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              {language === 'bn'
                ? 'সহজ ও সুনির্দিষ্ট ৪টি ধাপের মাধ্যমে আপনি আরজে ওয়ার্ল্ড বিডি-এর শেয়ারহোল্ডার হিসেবে যুক্ত হতে পারবেন।'
                : 'A transparent 4-step workflow to acquire and manage your company equity.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs relative flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 text-primary-main flex items-center justify-center font-black text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {language === 'bn' ? 'শেয়ার পরিমাণ নির্বাচন' : '1. Select Shares'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-grow">
                {language === 'bn'
                  ? 'আপনার বাজেট অনুযায়ী প্রতি ১% এর মূল্য ২,০০০ টাকা হারে কাক্সিক্ষত শেয়ার পরিমাণ নির্ধারণ করুন।'
                  : 'Choose the percentage of company equity you wish to purchase at ৳2,000 per 1% share.'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-primary-main flex items-center gap-1">
                <span>৳2,000 / 1%</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs relative flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {language === 'bn' ? 'সার্টিফিকেট-স্টাইল ফরম' : '2. Certificate Form'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-grow">
                {language === 'bn'
                  ? 'আবেদনকারীর নাম, পিতা/মাতার নাম, ঠিকানা ও যোগাযোগের তথ্য দিয়ে ড্রাফট আবেদন প্রস্তুত করুন।'
                  : 'Fill the certificate-style application form with applicant, parent, and address details.'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <span>Draft Application Ref</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs relative flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {language === 'bn' ? 'শর্তাবলী ও সম্মতি' : '3. Terms & Agreement'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-grow">
                {language === 'bn'
                  ? 'কোম্পানির শেয়ারহোল্ডার চুক্তিপত্র এবং লভ্যাংশ অনির্দিষ্ট থাকার আইনি শর্তসমূহ পড়ুন ও সম্মতি দিন।'
                  : 'Review shareholder documentation and formally accept that company dividends are non-guaranteed.'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1">
                <span>Statutory Compliance</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs relative flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-black text-lg mb-4">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {language === 'bn' ? 'ড্যাশবোর্ড ও রেকর্ড' : '4. Dashboard & Certificate'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed flex-grow">
                {language === 'bn'
                  ? 'শেয়ার আবেদন অনুমোদনের পর নিজস্ব শেয়ারহোল্ডার ড্যাশবোর্ডে পোর্টফোলিও ও শেয়ার আইডি পর্যবেক্ষণ করুন।'
                  : 'Track your official equity percentage, certificate status, and portfolio from your private dashboard.'}
              </p>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <span>Digital Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits & Transparency */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-10">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-main" />
            <span>
              {language === 'bn' ? 'শেয়ারহোল্ডার হিসেবে সুবিধাসমূহ' : 'Shareholder Rights & Transparency'}
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-primary-main font-bold text-sm mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'bn' ? 'ব্যক্তিগত শেয়ারহোল্ডার পোর্টাল' : 'Private Dashboard'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'আপনার নামে নিবন্ধিত শেয়ার সংখ্যা ও শেয়ার সার্টিফিকেট সার্বক্ষণিক পর্যবেক্ষণের নিজস্ব ড্যাশবোর্ড।'
                  : 'Monitor your registered equity holdings and verification records inside your secure account.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-primary-main font-bold text-sm mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'bn' ? 'বাৎসরিক আর্থিক বিবরণী' : 'Audited Performance'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'কোম্পানির বার্ষিক ব্যবসায়িক পারফরম্যান্স ও নিট মুনাফার ওপর ভিত্তি করে লভ্যাংশ ঘোষণা।'
                  : 'Dividend declarations follow annual financial reconciliation and business net profitability.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-primary-main font-bold text-sm mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'bn' ? 'স্বচ্ছ মালিকানা রেকর্ড' : 'Secure Ownership Record'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'bn'
                  ? 'আপনার পরিচয় ও ইউজার আইডি ভিত্তিক নিরাপদ ডাটাবেজে শেয়ারহোল্ডার রেকর্ড সংরক্ষিত থাকে।'
                  : 'User-scoped cryptographic authentication ensures your equity records remain strictly private.'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA Block */}
        <div className="bg-gradient-to-r from-sky-600 to-primary-main text-white rounded-3xl p-6 sm:p-10 shadow-lg text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h3 className="text-2xl sm:text-3xl font-black mb-3">
              {language === 'bn' ? 'আজই শেয়ারহোল্ডার হিসেবে যুক্ত হোন' : 'Ready to Become a Shareholder?'}
            </h3>
            <p className="text-sky-100 text-xs sm:text-sm mb-6 max-w-lg mx-auto">
              {language === 'bn'
                ? 'মাত্র ৳২,০০০ টাকায় ১% শেয়ার নিয়ে আরজে ওয়ার্ল্ড বিডি-এর অগ্রযাত্রায় অংশ নিন।'
                : 'Begin your partnership journey today starting at ৳2,000 per 1% share.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleBuySharesClick}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all shadow-md cursor-pointer"
              >
                Buy Shares
              </button>
              <button
                type="button"
                onClick={handleDashboardClick}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-700/60 hover:bg-sky-700 text-white font-bold border border-white/20 transition-all cursor-pointer"
              >
                My Shareholder Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ACCESS CONTROL / LOGIN REQUIRED MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-sky-50 text-primary-main flex items-center justify-center mx-auto mb-4 border border-sky-100">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-slate-900 text-center mb-2">
              {language === 'bn' ? 'লগইন প্রয়োজন' : 'Login Required'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 text-center leading-relaxed mb-6">
              {authIntent === 'dashboard'
                ? (language === 'bn' 
                    ? 'আপনার শেয়ারহোল্ডার ড্যাশবোর্ড ও ব্যক্তিগত পোর্টফোলিও দেখার জন্য অনুগ্রহ করে প্রথমে লগইন করুন।' 
                    : 'Please log in to your RJ WORLD BD account to access your personal shareholder dashboard.')
                : (language === 'bn'
                    ? 'কোম্পানি শেয়ার ক্রয়ের প্রক্রিয়া শুরু করার আগে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।'
                    : 'Please log in with your RJ WORLD BD account before continuing with your share purchase.')}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleProceedToLogin}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-primary-main hover:bg-sky-600 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{language === 'bn' ? 'লগইন করতে এগিয়ে যান' : 'Log In to Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  navigate('/register');
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors text-sm cursor-pointer"
              >
                {language === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create New Account'}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'লগইনের পর আপনি সরাসরি শেয়ার ক্রয় প্রক্রিয়ায় ফিরে আসবেন।'
                  : 'After login, you will automatically return to the shareholder process.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PROFESSIONAL SHARE CERTIFICATE-STYLE PURCHASE MODAL */}
      <SharePurchaseCertificateModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        initialPercent={sharePercent}
        availableShares={availableShares}
      />

      <Footer />
    </div>
  );
}

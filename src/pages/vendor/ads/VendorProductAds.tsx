import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { rtdbList, rtdbGet, rtdbSubscribe } from '../../../lib/rtdb';
import VendorLayout from '../../../components/layout/VendorLayout';
import { 
  Megaphone, 
  Plus, 
  Eye, 
  MousePointerClick, 
  Clock, 
  CheckCircle2, 
  Package, 
  Image as ImageIcon,
  DollarSign,
  Play,
  Pause,
  Wallet,
  CreditCard,
  Copy,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  AdCampaignRecord, 
  AdCampaignType, 
  submitAdCampaign, 
  toggleAdPause, 
  isAdActive 
} from '../../../services/adCampaignService';

export default function VendorProductAds() {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdCampaignRecord[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Ad Form State
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignType, setCampaignType] = useState<AdCampaignType>('Banner Ad');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [budget, setBudget] = useState('500');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bkash' | 'nagad' | 'rocket' | 'upay'>('wallet');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadAdsAndProducts();

    const unsubAds = rtdbSubscribe('vendor_ads', () => {
      loadAdsAndProducts();
    });
    const unsubProds = rtdbSubscribe('products', () => {
      loadAdsAndProducts();
    });
    const unsubWallet = rtdbSubscribe(`vendor_wallet/${user.uid}`, (data) => {
      if (data) {
        setWalletBalance(Number(data.balance || data.availableBalance || 0));
      }
    });

    return () => {
      unsubAds();
      unsubProds();
      unsubWallet();
    };
  }, [user?.uid]);

  const loadAdsAndProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [adsSnap, prodsSnap, walletSnap] = await Promise.all([
        rtdbList<AdCampaignRecord>('vendor_ads', (ad) => ad.vendorId === user.uid),
        rtdbList<any>('products', (p) => p.vendorId === user.uid || p.storeId === user.uid),
        rtdbGet<any>(`vendor_wallet/${user.uid}`).catch(() => ({}))
      ]);

      setAds(adsSnap.map(a => ({ id: a.id, ...a.data })));
      const prodList = prodsSnap.map(p => ({ id: p.id, ...p.data }));
      setProducts(prodList);
      if (prodList.length > 0 && !selectedProductId) {
        setSelectedProductId(prodList[0].id);
      }
      setWalletBalance(Number(walletSnap?.balance || walletSnap?.availableBalance || 0));
    } catch (err) {
      console.error('Failed to load vendor ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    toast.success('নম্বর কপি হয়েছে!');
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!campaignTitle.trim()) {
      toast.error('ক্যাম্পেইনের শিরোনাম লিখুন');
      return;
    }

    const budgetNum = Number(budget);
    if (isNaN(budgetNum) || budgetNum < 100) {
      toast.error('সর্বনিম্ন বাজেট ৳১০০ হতে হবে');
      return;
    }

    if (paymentMethod !== 'wallet') {
      if (!senderPhone.trim()) {
        toast.error('প্রেরক মোবাইল নম্বর লিখুন');
        return;
      }
      if (!transactionId.trim()) {
        toast.error('Transaction ID (TrxID) লিখুন');
        return;
      }
    }

    setSubmitting(true);
    try {
      const targetProd = products.find(p => p.id === selectedProductId);
      const result = await submitAdCampaign({
        vendorId: user.uid,
        vendorName: targetProd?.vendor?.storeName || targetProd?.vendor?.name || 'Vendor',
        title: campaignTitle.trim(),
        type: campaignType,
        productId: selectedProductId || '',
        productName: targetProd?.name || '',
        productImage: targetProd?.featuredImage || targetProd?.image || (targetProd?.images && targetProd.images[0]) || '',
        bannerUrl: bannerUrl.trim() || targetProd?.featuredImage || targetProd?.image || '',
        durationDays: Number(durationDays),
        budget: budgetNum,
        paymentMethod,
        transactionId: transactionId.trim().toUpperCase(),
        senderPhone: senderPhone.trim()
      });

      if (result.success) {
        toast.success(result.message);
        setShowCreateModal(false);
        setCampaignTitle('');
        setBannerUrl('');
        setTransactionId('');
        setSenderPhone('');
        loadAdsAndProducts();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('Failed to create ad:', err);
      toast.error('ক্যাম্পেইন তৈরি ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePause = async (ad: AdCampaignRecord) => {
    try {
      const nextStatus = await toggleAdPause(ad.id, ad.status);
      toast.success(nextStatus === 'active' ? 'ক্যাম্পেইন চালু করা হয়েছে' : 'ক্যাম্পেইন স্থগিত করা হয়েছে');
      loadAdsAndProducts();
    } catch (err) {
      toast.error('স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    }
  };

  const totalImpressions = ads.reduce((acc, a) => acc + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.clicks || 0), 0);
  const activeCount = ads.filter(a => isAdActive(a)).length;

  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-purple-600" />
              Product Ads & Campaigns (বিজ্ঞাপন ক্যাম্পেইন)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              মার্কেটপ্লেসের ব্যানার, স্লাইডার এবং সার্চ স্পটলাইটে টার্গেটেড বিজ্ঞাপন চালিয়ে ক্রেতা আকর্ষণ করুন
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> নতুন বিজ্ঞাপন তৈরি করুন
          </button>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">চলমান ক্যাম্পেইন</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900">
              {activeCount}
            </h3>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">মোট প্রদর্শন (Impressions)</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900">
              {totalImpressions.toLocaleString()}
            </h3>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500">মোট ক্লিক (Clicks)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MousePointerClick className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900">
              {totalClicks.toLocaleString()}
            </h3>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-2xs">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-4">
            ক্যাম্পেইন তালিকা ({ads.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ads.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">এখনো কোনো বিজ্ঞাপন ক্যাম্পেইন চালু করেননি</p>
              <p className="text-xs text-gray-500 mb-4">পণ্য দ্রুত বিক্রি করতে প্রমোশনাল অ্যাড চালু করুন।</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> ক্যাম্পেইন শুরু করুন
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {ads.map(ad => {
                const isActive = isAdActive(ad);
                const isExpired = ad.expiresAt && Date.now() >= ad.expiresAt;

                return (
                  <div key={ad.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {ad.bannerUrl ? (
                          <img src={ad.bannerUrl} alt={ad.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{ad.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                            {ad.type}
                          </span>
                          <span>•</span>
                          <span>বাজেট: ৳{ad.budget}</span>
                          <span>•</span>
                          <span>{ad.durationDays} দিন</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                          <span>পণ্য: {ad.productName || 'General'}</span>
                          {ad.expiresAt && (
                            <>
                              <span>•</span>
                              <span>মেয়াদ: {new Date(ad.expiresAt).toLocaleDateString('bn-BD')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-900 block">{ad.impressions || 0} ভিউ</span>
                        <span className="text-[11px] text-gray-500">{ad.clicks || 0} ক্লিক</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          ad.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : isExpired
                              ? 'bg-gray-100 text-gray-600'
                              : ad.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : ad.status === 'paused'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-rose-50 text-rose-700'
                        }`}>
                          {ad.status === 'pending_approval'
                            ? '🟡 অনুমোদন অপেক্ষমাণ'
                            : isExpired
                              ? '⚪ মেয়াদোত্তীর্ণ'
                              : ad.status === 'active'
                                ? '🟢 লাইভ'
                                : ad.status === 'paused'
                                  ? '⏸️ স্থগিত'
                                  : '🔴 বাতিল'}
                        </span>

                        {(ad.status === 'active' || ad.status === 'paused') && !isExpired && (
                          <button
                            onClick={() => handleTogglePause(ad)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 cursor-pointer"
                            title={ad.status === 'active' ? 'স্থগিত করুন' : 'চালু করুন'}
                          >
                            {ad.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Ad Modal with Payment */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-600" />
                নতুন বিজ্ঞাপন ক্যাম্পেইন চালু করুন
              </h3>

              <form onSubmit={handleCreateAd} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ক্যাম্পেইনের শিরোনাম *</label>
                  <input
                    type="text"
                    placeholder="e.g. ঈদ মেগা সেল প্রিমিয়াম ব্যানার"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">বিজ্ঞাপনের ধরণ</label>
                    <select
                      value={campaignType}
                      onChange={(e) => setCampaignType(e.target.value as AdCampaignType)}
                      className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="Banner Ad">Banner Ad (ব্যানার অ্যাড)</option>
                      <option value="Featured Slider">Featured Slider (হোম স্লাইডার)</option>
                      <option value="Search Spotlight">Search Spotlight (সার্চ স্পটলাইট)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">ক্যাম্পেইনের মেয়াদ</label>
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value={3}>৩ দিন</option>
                      <option value={7}>৭ দিন (জনপ্রিয়)</option>
                      <option value={15}>১৫ দিন</option>
                      <option value={30}>৩০ দিন</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">বিজ্ঞাপিত প্রোডাক্ট *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600 cursor-pointer"
                  >
                    <option value="">-- প্রোডাক্ট নির্বাচন করুন --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">ব্যানার ছবির লিংক (ঐচ্ছিক)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                  />
                  <span className="text-[10px] text-gray-400">খালি রাখলে স্বয়ংক্রিয়ভাবে প্রোডাক্টের মূল ছবি ব্যবহৃত হবে</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">বাজেট (৳) *</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-600"
                    required
                  />
                </div>

                {/* Payment Selection Box */}
                <div className="border border-purple-200 rounded-2xl p-4 bg-purple-50/40 space-y-3">
                  <label className="block text-xs font-bold text-gray-800">
                    পেমেন্ট পদ্ধতি নির্বাচন করুন (প্রদেয়: ৳{budget})
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer bg-white ${
                      paymentMethod === 'wallet' ? 'border-purple-600 ring-1 ring-purple-600' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="adPayment"
                        value="wallet"
                        checked={paymentMethod === 'wallet'}
                        onChange={() => setPaymentMethod('wallet')}
                      />
                      <div className="text-xs">
                        <span className="font-bold block">Vendor Wallet</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">ব্যালেন্স: ৳{walletBalance}</span>
                      </div>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer bg-white ${
                      paymentMethod !== 'wallet' ? 'border-purple-600 ring-1 ring-purple-600' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="adPayment"
                        value="bkash"
                        checked={paymentMethod !== 'wallet'}
                        onChange={() => setPaymentMethod('bkash')}
                      />
                      <div className="text-xs">
                        <span className="font-bold block">মোবাইল ব্যাংকিং</span>
                        <span className="text-[10px] text-gray-500">bKash / Nagad / Rocket</span>
                      </div>
                    </label>
                  </div>

                  {paymentMethod !== 'wallet' && (
                    <div className="bg-white p-3 rounded-xl border border-purple-200 space-y-2.5">
                      <div className="flex items-center gap-1.5">
                        {(['bkash', 'nagad', 'rocket', 'upay'] as const).map(ch => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setPaymentMethod(ch)}
                            className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg cursor-pointer ${
                              paymentMethod === ch ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>

                      <div className="p-2 bg-purple-50 rounded-lg flex items-center justify-between text-xs text-purple-900">
                        <span>{paymentMethod.toUpperCase()} Personal: <strong className="font-mono">01831818165</strong></span>
                        <button
                          type="button"
                          onClick={() => handleCopyNumber('01831818165')}
                          className="px-2 py-0.5 bg-white border border-purple-300 rounded text-[10px] font-bold text-purple-700 cursor-pointer"
                        >
                          {copiedNumber === '01831818165' ? 'কপি হয়েছে' : 'কপি'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">প্রেরক নম্বর *</label>
                          <input
                            type="text"
                            placeholder="017xxxxxxxx"
                            value={senderPhone}
                            onChange={(e) => setSenderPhone(e.target.value)}
                            className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-0.5">TrxID *</label>
                          <input
                            type="text"
                            placeholder="TrxID..."
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full text-xs p-2 border border-gray-200 rounded-lg bg-gray-50 uppercase font-mono"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-semibold cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || (paymentMethod === 'wallet' && walletBalance < Number(budget))}
                    className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? 'সাবমিট হচ্ছে...' : 'ক্যাম্পেইন সাবমিট করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}

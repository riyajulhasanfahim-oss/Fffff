import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { rtdbList, rtdbGet, rtdbSubscribe } from '../../../lib/rtdb';
import VendorLayout from '../../../components/layout/VendorLayout';
import { 
  Rocket, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Package, 
  Search,
  Zap,
  Flame,
  Wallet,
  CreditCard,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  BOOST_PLANS, 
  ProductBoostRecord, 
  submitProductBoostRequest, 
  isBoostActive 
} from '../../../services/productBoostService';

export default function VendorProductBoost() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [boosts, setBoosts] = useState<ProductBoostRecord[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [boosting, setBoosting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bkash' | 'nagad' | 'rocket' | 'upay'>('wallet');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const selectedPlan = BOOST_PLANS.find(p => p.days === selectedDays) || BOOST_PLANS[1];

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();

    const unsubProds = rtdbSubscribe('products', () => {
      loadData();
    });
    const unsubBoosts = rtdbSubscribe('product_boosts', () => {
      loadData();
    });
    const unsubWallet = rtdbSubscribe(`vendor_wallet/${user.uid}`, (data) => {
      if (data) {
        setWalletBalance(Number(data.balance || data.availableBalance || 0));
      }
    });

    return () => {
      unsubProds();
      unsubBoosts();
      unsubWallet();
    };
  }, [user?.uid]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [prodsSnap, boostsSnap, walletSnap] = await Promise.all([
        rtdbList<any>('products', (p) => p.vendorId === user.uid || p.storeId === user.uid || p.userId === user.uid),
        rtdbList<ProductBoostRecord>('product_boosts', (b) => b.vendorId === user.uid),
        rtdbGet<any>(`vendor_wallet/${user.uid}`).catch(() => ({}))
      ]);

      const pList = prodsSnap.map(p => ({ id: p.id, ...p.data }));
      setProducts(pList);
      if (pList.length > 0 && !selectedProductId) {
        setSelectedProductId(pList[0].id);
      }

      setBoosts(boostsSnap.map(b => ({ id: b.id, ...b.data })));
      setWalletBalance(Number(walletSnap?.balance || walletSnap?.availableBalance || 0));
    } catch (err) {
      console.error('Error loading boost data:', err);
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

  const handleBoost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProductId) {
      toast.error('প্রোডাক্ট সিলেক্ট করুন');
      return;
    }

    const targetProduct = products.find(p => p.id === selectedProductId);
    if (!targetProduct) return;

    if (paymentMethod !== 'wallet') {
      if (!senderPhone.trim()) {
        toast.error('যে নম্বর থেকে টাকা পাঠিয়েছেন তা লিখুন');
        return;
      }
      if (!transactionId.trim()) {
        toast.error('Transaction ID (TrxID) লিখুন');
        return;
      }
    }

    setBoosting(true);
    try {
      const result = await submitProductBoostRequest({
        vendorId: user.uid,
        vendorName: targetProduct.vendor?.storeName || targetProduct.vendor?.name || 'Vendor',
        productId: selectedProductId,
        productName: targetProduct.name,
        productImage: targetProduct.featuredImage || targetProduct.image || (targetProduct.images && targetProduct.images[0]) || '',
        planDays: selectedDays,
        paymentMethod,
        transactionId: transactionId.trim().toUpperCase(),
        senderPhone: senderPhone.trim()
      });

      if (result.success) {
        toast.success(result.message);
        setTransactionId('');
        setSenderPhone('');
        loadData();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('Failed to boost product:', err);
      toast.error('বুস্ট রিকোয়েস্ট ব্যর্থ হয়েছে');
    } finally {
      setBoosting(false);
    }
  };

  const activeBoosts = boosts.filter(b => isBoostActive(b));
  const pendingBoosts = boosts.filter(b => b.status === 'pending');
  const pastBoosts = boosts.filter(b => b.status === 'expired' || b.status === 'rejected');

  const filteredUnboosted = products.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Rocket className="w-6 h-6 text-pink-600" />
            Product Boost Promotion (প্রোডাক্ট বুস্ট)
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            আপনার পণ্য বুস্ট করে মার্কেটপ্লেসের সবার শীর্ষে এবং সার্চ ফলাফলের প্রাইম স্থানে নিয়ে আসুন
          </p>
        </div>

        {/* Benefits Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200/80 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-pink-500 text-white flex items-center justify-center mb-2 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">৩ গুণ বেশি ইম্প্রেশন</h3>
            <p className="text-xs text-gray-600 leading-relaxed">বুস্টেড পণ্যসমূহ সার্চ ও ক্যাটাগরি পেজে স্বাভাবিক পণ্যের চেয়ে ৩ গুণ বেশি প্রদর্শিত হয়।</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">স্পেশাল 'Featured' ব্যাজ</h3>
            <p className="text-xs text-gray-600 leading-relaxed">প্রোডাক্ট কার্ডে রকেট এবং হাই-কনভার্টিং স্পেশাল ফিচার্ড ব্যাজ যুক্ত থাকে।</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center mb-2 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">দ্রুত বিক্রয় বৃদ্ধি</h3>
            <p className="text-xs text-gray-600 leading-relaxed">সরাসরি আগ্রহী ক্রেতাদের কাছে পৌঁছে বেশি পরিমাণ সফল অর্ডার অর্জন করুন।</p>
          </div>
        </div>

        {/* Current Active & Pending Boosts Section */}
        {(activeBoosts.length > 0 || pendingBoosts.length > 0) && (
          <div className="bg-white rounded-2xl border border-pink-200 p-4 sm:p-6 shadow-2xs mb-8">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-pink-600" />
              বর্তমান বুস্ট স্ট্যাটাস ({activeBoosts.length + pendingBoosts.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeBoosts.map(b => (
                <div key={b.id} className="p-3 bg-pink-50/60 rounded-xl border border-pink-300 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg border border-pink-200 flex items-center justify-center overflow-hidden shrink-0">
                    {b.productImage ? (
                      <img src={b.productImage} alt={b.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                        🟢 সক্রিয় (Live)
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-xs truncate">{b.productName}</h4>
                    <span className="text-[11px] text-pink-700 font-bold block">{b.planDays} দিন • ৳{b.price}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                      <Clock className="w-3 h-3 text-pink-500" />
                      মেয়াদ শেষ: {b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('bn-BD') : 'Active'}
                    </span>
                  </div>
                </div>
              ))}

              {pendingBoosts.map(b => (
                <div key={b.id} className="p-3 bg-amber-50/70 rounded-xl border border-amber-300 flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg border border-amber-200 flex items-center justify-center overflow-hidden shrink-0">
                    {b.productImage ? (
                      <img src={b.productImage} alt={b.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[9px] font-bold rounded inline-block mb-0.5">
                      🟡 পেন্ডিং ভেরিফিকেশন
                    </span>
                    <h4 className="font-bold text-gray-900 text-xs truncate">{b.productName}</h4>
                    <span className="text-[11px] text-amber-800 font-bold block">{b.planDays} দিন • ৳{b.price}</span>
                    <span className="text-[10px] text-gray-500 block">
                      TxID: {b.transactionId || 'Waiting'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Boost Launch Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-2xs">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Rocket className="w-5 h-5 text-pink-600" />
            নতুন প্রোডাক্ট বুস্ট চালু করুন
          </h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-600 font-medium">আপনার স্টোরে এখনো কোনো প্রোডাক্ট নেই।</p>
              <p className="text-xs text-gray-400">বুস্ট করার পূর্বে স্টোরে প্রোডাক্ট যোগ করুন।</p>
            </div>
          ) : (
            <form onSubmit={handleBoost} className="space-y-6">
              {/* 1. Select Product */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  ১. বুস্ট করার জন্য প্রোডাক্ট নির্বাচন করুন
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="প্রোডাক্ট খুঁজুন..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {filteredUnboosted.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">কোনো প্রোডাক্ট পাওয়া যায়নি</div>
                  ) : (
                    filteredUnboosted.map(prod => (
                      <label 
                        key={prod.id} 
                        className={`flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedProductId === prod.id ? 'bg-pink-50/70' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="boostProduct"
                          value={prod.id}
                          checked={selectedProductId === prod.id}
                          onChange={() => setSelectedProductId(prod.id)}
                          className="w-4 h-4 text-pink-600"
                        />
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                          {prod.image || prod.featuredImage ? (
                            <img src={prod.featuredImage || prod.image} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{prod.name}</p>
                          <span className="text-[11px] text-gray-500">মূল্য: ৳{prod.price || prod.salePrice} • স্টক: {prod.stock ?? 10}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Select Plan & Duration */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  ২. বুস্টের মেয়াদ ও প্যাকেজ নির্বাচন করুন
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BOOST_PLANS.map(plan => (
                    <button
                      key={plan.days}
                      type="button"
                      onClick={() => setSelectedDays(plan.days)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedDays === plan.days
                          ? 'border-pink-500 bg-pink-50/80 text-pink-900 font-bold shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold">{plan.label}</span>
                        {plan.badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-pink-200 text-pink-800 rounded">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-black text-pink-600 block">৳{plan.price}</span>
                      <span className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{plan.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Payment Method */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-slate-50/70">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  ৩. পেমেন্ট পদ্ধতি নির্বাচন করুন (প্রয়োজনীয়: ৳{selectedPlan.price})
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {/* Option A: Vendor Wallet */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod === 'wallet'
                        ? 'border-pink-500 bg-white shadow-2xs ring-1 ring-pink-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="wallet"
                      checked={paymentMethod === 'wallet'}
                      onChange={() => setPaymentMethod('wallet')}
                      className="w-4 h-4 text-pink-600 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                        <Wallet className="w-4 h-4 text-violet-600" />
                        <span>Vendor Wallet ব্যালেন্স</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        বর্তমান ব্যালেন্স: <strong className="text-emerald-600 font-bold">৳{walletBalance}</strong>
                      </p>
                      {walletBalance < selectedPlan.price && (
                        <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                          (পর্যাপ্ত ব্যালেন্স নেই)
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Option B: Mobile Banking */}
                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      paymentMethod !== 'wallet'
                        ? 'border-pink-500 bg-white shadow-2xs ring-1 ring-pink-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="bkash"
                      checked={paymentMethod !== 'wallet'}
                      onChange={() => setPaymentMethod('bkash')}
                      className="w-4 h-4 text-pink-600 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                        <CreditCard className="w-4 h-4 text-pink-600" />
                        <span>মোবাইল ব্যাংকিং (bKash / Nagad / Rocket)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        সেন্ড মানি করে TrxID দিয়ে নিশ্চিত করুন
                      </p>
                    </div>
                  </label>
                </div>

                {/* Mobile Banking Sub-options & Instruction */}
                {paymentMethod !== 'wallet' && (
                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center gap-2">
                      {(['bkash', 'nagad', 'rocket', 'upay'] as const).map(channel => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => setPaymentMethod(channel)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                            paymentMethod === channel
                              ? 'bg-pink-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {channel}
                        </button>
                      ))}
                    </div>

                    <div className="p-3 bg-pink-50/70 rounded-xl border border-pink-200 text-xs text-pink-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold block">
                          {paymentMethod.toUpperCase()} Personal (Send Money):
                        </span>
                        <span className="font-mono font-black text-sm text-pink-700 tracking-wider">
                          01831818165
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber('01831818165')}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-pink-300 rounded-lg text-[11px] font-bold text-pink-700 hover:bg-pink-100 transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        {copiedNumber === '01831818165' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNumber === '01831818165' ? 'কপি হয়েছে' : 'নম্বর কপি করুন'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          প্রেরক মোবাইল নম্বর *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 01712345678"
                          value={senderPhone}
                          onChange={(e) => setSenderPhone(e.target.value)}
                          required
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 bg-gray-50"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                          Transaction ID (TrxID) *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 9J283KS02P"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          required
                          className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-pink-500 bg-gray-50 uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  মোট প্রদেয়: <strong className="text-pink-600 font-extrabold text-sm">৳{selectedPlan.price}</strong>
                </div>

                <button
                  type="submit"
                  disabled={boosting || !selectedProductId || (paymentMethod === 'wallet' && walletBalance < selectedPlan.price)}
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  {boosting
                    ? 'প্রক্রিয়াধীন...'
                    : paymentMethod === 'wallet'
                      ? `ওয়ালেট দিয়ে বুস্ট চালু করুন (${selectedPlan.label})`
                      : `পেমেন্ট সাবমিট করুন (${selectedPlan.label})`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </VendorLayout>
  );
}

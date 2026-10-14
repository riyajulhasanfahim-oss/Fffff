import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { rtdbList, rtdbSubscribe } from '../../../lib/rtdb';
import VendorLayout from '../../../components/layout/VendorLayout';
import { 
  Flame, 
  Plus, 
  Search, 
  Clock, 
  Package, 
  Zap, 
  Trash2, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  X,
  Play,
  Pause
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  FlashSaleItem, 
  saveFlashSale, 
  updateFlashSaleStatus, 
  deleteFlashSale, 
  isFlashSaleActive 
} from '../../../services/flashSaleService';

export default function VendorFlashSale() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [flashSales, setFlashSales] = useState<FlashSaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [flashPrice, setFlashPrice] = useState<string>('');
  const [flashStock, setFlashStock] = useState<string>('10');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();

    const unsubFs = rtdbSubscribe('flashSales', () => {
      loadData();
    });
    const unsubProds = rtdbSubscribe('products', () => {
      loadData();
    });

    return () => {
      unsubFs();
      unsubProds();
    };
  }, [user?.uid]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [prodsSnap, fsSnap] = await Promise.all([
        rtdbList<any>('products', (p) => p.vendorId === user.uid || p.storeId === user.uid || p.userId === user.uid),
        rtdbList<FlashSaleItem>('flashSales', (fs) => fs.vendorId === user.uid)
      ]);

      const pList = prodsSnap.map(p => ({ id: p.id, ...p.data }));
      setProducts(pList);
      if (pList.length > 0 && !selectedProductId) {
        setSelectedProductId(pList[0].id);
      }

      setFlashSales(fsSnap.map(f => ({ id: f.id, ...f.data })));
    } catch (err) {
      console.error('Failed to load flash sales for vendor:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleLaunchFlashSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) {
      toast.error('প্রোডাক্ট সিলেক্ট করুন');
      return;
    }

    const regularPrice = Number(selectedProduct.price) || 0;
    const fPrice = parseFloat(flashPrice);
    if (isNaN(fPrice) || fPrice <= 0) {
      toast.error('সঠিক ফ্ল্যাশ সেল মূল্য লিখুন');
      return;
    }

    if (fPrice >= regularPrice) {
      toast.error(`ফ্ল্যাশ সেল মূল্য রেগুলার মূল্যের (৳${regularPrice}) চেয়ে কম হতে হবে`);
      return;
    }

    const stockNum = parseInt(flashStock, 10);
    if (isNaN(stockNum) || stockNum <= 0) {
      toast.error('স্টকের পরিমাণ কমপক্ষে ১ হতে হবে');
      return;
    }

    setSubmitting(true);
    try {
      const now = Date.now();
      const endTime = now + (durationHours * 60 * 60 * 1000);
      const discountPercent = Math.round(((regularPrice - fPrice) / regularPrice) * 100);

      await saveFlashSale({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        vendorId: user.uid,
        vendorName: selectedProduct.vendor?.storeName || selectedProduct.vendor?.name || 'Vendor',
        productImage: selectedProduct.featuredImage || selectedProduct.image || (selectedProduct.images && selectedProduct.images[0]) || '',
        regularPrice,
        flashPrice: fPrice,
        discountPercent,
        stock: stockNum,
        startTime: now,
        endTime,
        status: 'active',
        isApproved: true
      });

      toast.success(`"${selectedProduct.name}" সফলভাবে ফ্ল্যাশ সেলে যুক্ত হয়েছে!`);
      setShowModal(false);
      setFlashPrice('');
      loadData();
    } catch (err) {
      console.error('Error saving flash sale:', err);
      toast.error('ফ্ল্যাশ সেল সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (fs: FlashSaleItem) => {
    const nextStatus = fs.status === 'active' ? 'ended' : 'active';
    try {
      await updateFlashSaleStatus(fs.id, fs.productId, nextStatus);
      toast.success(nextStatus === 'active' ? 'ফ্ল্যাশ সেল চালু করা হয়েছে' : 'ফ্ল্যাশ সেল বন্ধ করা হয়েছে');
      loadData();
    } catch (err) {
      toast.error('স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে');
    }
  };

  const handleDelete = async (fs: FlashSaleItem) => {
    if (window.confirm('আপনি কি এই ফ্ল্যাশ সেল অফারটি মুছে ফেলতে চান?')) {
      try {
        await deleteFlashSale(fs.id, fs.productId);
        toast.success('ফ্ল্যাশ সেল মুছে ফেলা হয়েছে');
        loadData();
      } catch (err) {
        toast.error('মুছে ফেলতে সমস্যা হয়েছে');
      }
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <VendorLayout>
      <div className="max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Flame className="w-6 h-6 text-amber-500 fill-amber-500" />
              Flash Sale Promotion (ফ্ল্যাশ সেল)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              হোমপেজের আকর্ষণীয় ফ্ল্যাশ সেল সেকশনে আপনার সেরা পণ্য স্পেশাল ছাড়ে অফার করুন
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 text-white font-bold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> নতুন ফ্ল্যাশ সেল যোগ করুন
          </button>
        </div>

        {/* Benefits Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/80 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2 shadow-xs">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">হোমপেজ প্রাইম ডিসপ্লে</h3>
            <p className="text-xs text-gray-600 leading-relaxed">অ্যাক্টিভ ফ্ল্যাশ সেলের পণ্য হোমপেজের সবার শীর্ষে বড় ব্যানারে প্রদর্শিত হয়।</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200/80 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">লাইভ কাউন্টডাউন টাইমার</h3>
            <p className="text-xs text-gray-600 leading-relaxed">সময় নির্ধারণ অনুযায়ী অটোমেটিক শুরু ও বন্ধ হয়, কাস্টমারদের দ্রুত অর্ডার করতে উৎসাহিত করে।</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs">
              <TrendingDown className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">স্টক অটো-ম্যানেজমেন্ট</h3>
            <p className="text-xs text-gray-600 leading-relaxed">নির্ধারিত স্টক শেষ হলে অটোমেটিকভাবে ফ্ল্যাশ সেল থেকে প্রোডাক্টটি হাইড হয়ে যায়।</p>
          </div>
        </div>

        {/* Active & Listed Flash Sales Table */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-2xs">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            আপনার ফ্ল্যাশ সেল পণ্য তালিকা ({flashSales.length})
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : flashSales.length === 0 ? (
            <div className="text-center py-12">
              <Flame className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">কোনো ফ্ল্যাশ সেল অফার যোগ করা হয়নি</p>
              <p className="text-xs text-gray-500 mb-4">আপনার পণ্য দ্রুত বিক্রি করতে আকর্ষণীয় মূল্যে ফ্ল্যাশ সেল চালু করুন।</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> প্রথম ফ্ল্যাশ সেল তৈরি করুন
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {flashSales.map(fs => {
                const isActive = isFlashSaleActive(fs);
                const isExpired = fs.endTime && Date.now() >= fs.endTime;

                return (
                  <div key={fs.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {fs.productImage ? (
                          <img src={fs.productImage} alt={fs.productName} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{fs.productName}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="text-red-600 font-extrabold text-sm">৳{fs.flashPrice}</span>
                          <span className="line-through text-gray-400">৳{fs.regularPrice}</span>
                          <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded text-[10px]">
                            -{fs.discountPercent}% ছাড়
                          </span>
                          <span>•</span>
                          <span>স্টক: {fs.stock} টি</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>
                            মেয়াদ: {fs.endTime ? new Date(fs.endTime).toLocaleString('bn-BD') : 'চলমান'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        isExpired
                          ? 'bg-gray-100 text-gray-600'
                          : isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isExpired ? 'মেয়াদোত্তীর্ণ' : isActive ? '🟢 সক্রিয় (Live)' : '⏸️ স্থগিত'}
                      </span>

                      {!isExpired && (
                        <button
                          onClick={() => handleToggleStatus(fs)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          title={fs.status === 'active' ? 'স্থগিত করুন' : 'চালু করুন'}
                        >
                          {fs.status === 'active' ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(fs)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Flash Sale Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
                নতুন ফ্ল্যাশ সেল চালু করুন
              </h3>

              <form onSubmit={handleLaunchFlashSale} className="space-y-4">
                {/* Product Search & Select */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ১. প্রোডাক্ট নির্বাচন করুন *
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="প্রোডাক্ট খুঁজুন..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {filteredProducts.map(prod => (
                      <label 
                        key={prod.id} 
                        className={`flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer ${
                          selectedProductId === prod.id ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="flashProduct"
                          value={prod.id}
                          checked={selectedProductId === prod.id}
                          onChange={() => setSelectedProductId(prod.id)}
                          className="w-4 h-4 text-amber-600"
                        />
                        <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                          {prod.image || prod.featuredImage ? (
                            <img src={prod.featuredImage || prod.image} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-gray-400 m-auto mt-2" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 truncate">{prod.name}</p>
                          <span className="text-[11px] text-gray-500">বর্তমান মূল্য: ৳{prod.price}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price and Stock Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      ফ্ল্যাশ সেল মূল্য (৳) *
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 450"
                      value={flashPrice}
                      onChange={(e) => setFlashPrice(e.target.value)}
                      required
                      min="1"
                      className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                    {selectedProduct && flashPrice && Number(flashPrice) < Number(selectedProduct.price) && (
                      <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                        ছাড়: {Math.round(((Number(selectedProduct.price) - Number(flashPrice)) / Number(selectedProduct.price)) * 100)}%
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      স্টক সংখ্যা *
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={flashStock}
                      onChange={(e) => setFlashStock(e.target.value)}
                      required
                      min="1"
                      className="w-full text-xs sm:text-sm p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    অফারের সময়কাল *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { hours: 12, label: '১২ ঘণ্টা' },
                      { hours: 24, label: '২৪ ঘণ্টা' },
                      { hours: 48, label: '২ দিন' },
                      { hours: 72, label: '৩ দিন' },
                    ].map(d => (
                      <button
                        key={d.hours}
                        type="button"
                        onClick={() => setDurationHours(d.hours)}
                        className={`py-2 text-xs font-bold rounded-lg border text-center transition-all ${
                          durationHours === d.hours
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-semibold cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? 'যুক্ত হচ্ছে...' : 'ফ্ল্যাশ সেল চালু করুন'}
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

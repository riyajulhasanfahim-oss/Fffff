import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Flame, 
  Clock, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  ShoppingBag, 
  SlidersHorizontal, 
  Zap, 
  ShieldCheck, 
  Check, 
  Package, 
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Product } from '../components/ui/ProductCard';
import { subscribeToActiveFlashSaleProducts, fetchActiveFlashSaleProducts } from '../services/flashSaleService';
import { formatDirectImageUrl, handleProductImageError, PLACEHOLDER_PRODUCT_IMAGE } from '../utils/imageUrl';
import { getProductPath } from '../utils/seo';

function FlashSaleCountdownCard({ endTime }: { endTime?: number }) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    if (!endTime) return;
    const updateTime = () => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setTimeLeft({ hours, minutes, seconds });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
      <span>বাকি:</span>
      <span className="font-mono font-black text-slate-900">
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
}

export default function FlashSalePage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('discount');

  // Overall Global Flash Countdown (based on earliest ending flash sale or fallback 6h 59m)
  const [globalTimeLeft, setGlobalTimeLeft] = useState({
    hours: 6,
    minutes: 59,
    seconds: 9
  });

  useEffect(() => {
    const unsub = subscribeToActiveFlashSaleProducts((list) => {
      setProducts(list);
      setLoading(false);

      if (list.length > 0) {
        // Find earliest ending active flash sale
        const endTimes = list.map(p => p.flashSale?.endTime).filter(Boolean) as number[];
        if (endTimes.length > 0) {
          const earliest = Math.min(...endTimes);
          const diff = Math.max(0, earliest - Date.now());
          const totalSec = Math.floor(diff / 1000);
          setGlobalTimeLeft({
            hours: Math.floor(totalSec / 3600),
            minutes: Math.floor((totalSec % 3600) / 60),
            seconds: totalSec % 60
          });
        }
      }
    });

    const timer = setInterval(() => {
      setGlobalTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  // Filter Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered & Sorted Products
  const displayedProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category === selectedCategory);
    }

    if (sortBy === 'discount') {
      list.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    } else if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return list;
  }, [products, selectedCategory, sortBy]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-grow pb-12 sm:pb-16">
        {/* Top Banner Section */}
        <section className="bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-white shadow-md relative overflow-hidden py-6 sm:py-10">
          <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-black/10 rounded-full blur-xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Title & Tagline */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/30 backdrop-blur-xs rounded-full text-xs font-bold text-amber-200 mb-2 border border-white/20">
                  <Flame className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>সীমিত সময়ের স্পেশাল অফার</span>
                </div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-sm flex items-center gap-3">
                  <span>ফ্ল্যাশ সেল</span>
                  <span className="text-xs sm:text-sm font-bold bg-white text-red-600 px-3 py-1 rounded-xl shadow-xs">
                    লাইভ ডিল
                  </span>
                </h1>
                <p className="text-xs sm:text-base text-white/90 font-medium mt-1.5 max-w-xl">
                  সেরা ব্র্যান্ডের আসল পণ্যসমূহ ৫০% পর্যন্ত ডিসকাউন্টে! সময় এবং স্টক শেষ হওয়ার আগেই অর্ডার নিশ্চিত করুন।
                </p>
              </div>

              {/* Master Global Countdown Widget */}
              <div className="bg-slate-950/85 backdrop-blur-md rounded-2xl p-4 sm:p-5 border-2 border-amber-300/80 shadow-xl flex flex-col items-center sm:items-end shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold mb-2">
                  <Clock className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>অফারের সময় বাকি:</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <span className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-b from-slate-900 to-black text-amber-300 rounded-xl border border-amber-400/40 flex items-center justify-center font-mono font-black text-xl sm:text-2xl shadow-inner">
                      {pad(globalTimeLeft.hours)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1">ঘণ্টা</span>
                  </div>
                  <span className="text-amber-400 font-black text-xl pb-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-b from-slate-900 to-black text-amber-300 rounded-xl border border-amber-400/40 flex items-center justify-center font-mono font-black text-xl sm:text-2xl shadow-inner">
                      {pad(globalTimeLeft.minutes)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1">মিনিট</span>
                  </div>
                  <span className="text-amber-400 font-black text-xl pb-3">:</span>
                  <div className="flex flex-col items-center">
                    <span className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-b from-slate-900 to-black text-amber-300 rounded-xl border border-amber-400/40 flex items-center justify-center font-mono font-black text-xl sm:text-2xl shadow-inner animate-pulse">
                      {pad(globalTimeLeft.seconds)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold mt-1">সেকেন্ড</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Filters and Controls */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 mb-6">
            
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-grow">
              <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">ক্যাটাগরি:</span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'সকল ক্যাটাগরি' : cat}
                </button>
              ))}
            </div>

            {/* Sort Dropdown & Product Counter */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-slate-600">
                মোট <strong className="text-red-600 font-black">{displayedProducts.length}</strong> টি লাইভ অফার
              </span>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort flash sale products"
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="discount">সর্বোচ্চ ছাড়</option>
                <option value="price_asc">মূল্য: কম থেকে বেশি</option>
                <option value="price_desc">মূল্য: বেশি থেকে কম</option>
              </select>
            </div>

          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-3 animate-pulse space-y-3">
                  <div className="aspect-square bg-slate-100 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-8 bg-slate-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-14 text-center max-w-xl mx-auto shadow-sm my-6">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Flame className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                বর্তমানে কোনো সক্রিয় ফ্ল্যাশ সেল নেই
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
                নতুন ফ্ল্যাশ সেল অফার খুব শীঘ্রই যুক্ত করা হবে। আমাদের নিয়মিত বাজারের দারুণ সব ডিল দেখতে নিচে ক্লিক করুন।
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                <span>হোমপেজে ফিরে যান</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {displayedProducts.map((prod, index) => {
                const fs = prod.flashSale;
                const regPrice = prod.originalPrice || prod.regularPrice || prod.price;
                const flashPrice = prod.price;
                const discount = prod.discount || (regPrice > flashPrice ? Math.round(((regPrice - flashPrice) / regPrice) * 100) : 0);
                const stockRemaining = prod.stock || 10;

                return (
                  <motion.div
                    key={prod.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.2) }}
                    className="bg-white rounded-2xl border border-amber-200/80 hover:border-red-400 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Image & Discount Badge */}
                      <div className="relative aspect-square overflow-hidden bg-slate-50">
                        <Link to={getProductPath(prod)} state={{ product: prod }} className="block w-full h-full">
                          <img
                            referrerPolicy="no-referrer"
                            src={formatDirectImageUrl(prod.featuredImage || prod.image || (prod.images && prod.images[0]) || '') || PLACEHOLDER_PRODUCT_IMAGE}
                            alt={prod.name}
                            onError={(e) => handleProductImageError(e)}
                            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                          />
                        </Link>

                        {/* Top-Left Discount Badge */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
                          <span className="px-2.5 py-1 text-[11px] sm:text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg shadow-md flex items-center gap-1 animate-pulse">
                            <Flame className="w-3 h-3 fill-white" />
                            <span>-{discount}%</span>
                          </span>
                        </div>

                        {/* Flash Stock Indicator Tag */}
                        <div className="absolute bottom-2 left-2 right-2 z-10 pointer-events-none">
                          <div className="bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center justify-between">
                            <span className="text-amber-300">স্টক বাকি:</span>
                            <span className="font-mono">{stockRemaining} টি</span>
                          </div>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-3 sm:p-4 space-y-2">
                        {/* Countdown Timer */}
                        {fs?.endTime && (
                          <FlashSaleCountdownCard endTime={fs.endTime} />
                        )}

                        {/* Category */}
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                          {prod.category || 'Special Deal'}
                        </p>

                        {/* Title */}
                        <Link to={getProductPath(prod)} state={{ product: prod }} className="block">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-snug">
                            {prod.name}
                          </h3>
                        </Link>

                        {/* Price Details */}
                        <div className="pt-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-base sm:text-xl font-black text-red-600 tracking-tight">
                              ৳{flashPrice.toLocaleString('bn-BD')}
                            </span>
                            {regPrice > flashPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                ৳{regPrice.toLocaleString('bn-BD')}
                              </span>
                            )}
                          </div>
                          {regPrice > flashPrice && (
                            <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                              বাঁচবে ৳{(regPrice - flashPrice).toLocaleString('bn-BD')}
                            </span>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Bottom CTA Button */}
                    <div className="p-3 pt-0">
                      <Link
                        to={getProductPath(prod)}
                        state={{ product: prod }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-98"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>এখনই কিনুন</span>
                      </Link>
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

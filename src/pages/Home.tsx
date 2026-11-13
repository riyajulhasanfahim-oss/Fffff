import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import CoverFlashBanner from '../components/home/CoverFlashBanner';
import Categories from '../components/home/Categories';
import BrandList from '../components/home/BrandList';
import AllProductsFeed from '../components/home/AllProductsFeed';
import ProductCard, { Product } from '../components/ui/ProductCard';
import { fetchAllMarketplaceProducts, subscribeToMarketplaceProducts, getCachedMarketplaceProducts, sortRealProductsFirst, preloadProductImages, isFoodOrEdibleProduct, deduplicateProducts } from '../services/productService';
import { ALL_DEMO_PRODUCTS } from '../data/demoProducts';
import { subscribeToActiveFlashSaleProducts } from '../services/flashSaleService';
import { subscribeToActiveAds, recordAdImpression, recordAdClick, AdCampaignRecord } from '../services/adCampaignService';
import { 
  ArrowRight, Flame, Clock, ChevronDown, ChevronUp, Megaphone
} from 'lucide-react';

function FlashSaleCountdown({ earliestEndTime }: { earliestEndTime?: number }) {
  const computeRemaining = (endTime?: number) => {
    if (!endTime) return { hours: 6, minutes: 34, seconds: 20 };
    const diff = Math.max(0, endTime - Date.now());
    const totalSec = Math.floor(diff / 1000);
    return {
      hours: Math.floor(totalSec / 3600),
      minutes: Math.floor((totalSec % 3600) / 60),
      seconds: totalSec % 60
    };
  };

  const [timeLeft, setTimeLeft] = useState(() => computeRemaining(earliestEndTime));

  useEffect(() => {
    if (earliestEndTime) {
      setTimeLeft(computeRemaining(earliestEndTime));
    }
  }, [earliestEndTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 8, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 text-xs sm:text-sm font-bold shadow-xs border border-slate-900">
      <Clock className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
      <span className="text-slate-300 text-[11px] hidden xs:inline">বাকি:</span>
      <span className="font-mono font-black text-amber-300 tracking-wider">
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [allProducts, setAllProducts] = useState<Product[]>(() => getCachedMarketplaceProducts());
  const [, setLoading] = useState<boolean>(() => allProducts.length === 0);
  const [isFlashExpanded, setIsFlashExpanded] = useState<boolean>(false);
  const [activeFlashProducts, setActiveFlashProducts] = useState<Product[]>([]);
  const [activeAdBanners, setActiveAdBanners] = useState<AdCampaignRecord[]>([]);

  useEffect(() => {
    document.title = "RJ WORLD BD - E-commerce & Reseller Marketplace";
    
    // Smooth scroll if navigated to #top-products
    if (window.location.hash === '#top-products') {
      const scrollTimer = setTimeout(() => {
        const el = document.getElementById('top-products');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 350);
      return () => clearTimeout(scrollTimer);
    }
  }, []);

  // Subscribe to real active Flash Sale products
  useEffect(() => {
    const unsub = subscribeToActiveFlashSaleProducts((list) => {
      setActiveFlashProducts(list);
    });
    return () => unsub();
  }, []);

  const earliestFlashEndTime = useMemo(() => {
    const endTimes = activeFlashProducts.map(p => p.flashSale?.endTime).filter(Boolean) as number[];
    return endTimes.length > 0 ? Math.min(...endTimes) : undefined;
  }, [activeFlashProducts]);

  // Subscribe to active Ads (Banners, Sliders, Spotlights)
  useEffect(() => {
    const unsub = subscribeToActiveAds(undefined, (ads) => {
      setActiveAdBanners(ads);
      // Record impressions for newly viewed ads
      ads.forEach(ad => {
        recordAdImpression(ad.id).catch(() => {});
      });
    });
    return () => unsub();
  }, []);

  // Fetch all products across all vendors and set up real-time live sync
  useEffect(() => {
    let isMounted = true;

    // 1. Initial robust fetch from RTDB + Firestore
    fetchAllMarketplaceProducts()
      .then((items) => {
        if (isMounted) {
          if (items && items.length > 0) {
            setAllProducts(items);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Initial marketplace products fetch notice:', err);
        if (isMounted) setLoading(false);
      });

    // 2. Real-time subscription to RTDB products node for live vendor updates
    const unsubscribe = subscribeToMarketplaceProducts((liveProducts) => {
      if (isMounted && liveProducts) {
        setAllProducts(liveProducts);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Include real products + demo Gadget Pulse & Fashion products strictly once (no duplicates, no food items)
  const homepageProducts = useMemo(() => {
    const combined: Product[] = [];

    for (const p of allProducts) {
      if (!p || !p.id || isFoodOrEdibleProduct(p)) continue;
      combined.push(p);
    }

    for (const demoProd of ALL_DEMO_PRODUCTS) {
      if (!demoProd || !demoProd.id || isFoodOrEdibleProduct(demoProd)) continue;
      combined.push(demoProd as unknown as Product);
    }

    const deduped = deduplicateProducts(combined);
    return sortRealProductsFirst(deduped);
  }, [allProducts]);

  // Preload homepage product thumbnails immediately so scrolling shows pre-cached images
  useEffect(() => {
    if (homepageProducts.length > 0) {
      preloadProductImages(homepageProducts);
    }
  }, [homepageProducts]);

  // Derived: Strictly Active Flash Sale Products (Approved, within start/end time, stock > 0, no food items)
  const flashSaleProducts = useMemo(() => {
    return sortRealProductsFirst(deduplicateProducts(activeFlashProducts.filter(p => !isFoodOrEdibleProduct(p))));
  }, [activeFlashProducts]);

  // Exclude active flash sale IDs from the single main list so no product appears twice on the page
  const singleFeedProducts = useMemo(() => {
    if (flashSaleProducts.length === 0) return homepageProducts;
    const flashIds = new Set(flashSaleProducts.map(p => String(p.id).trim().toLowerCase()));
    return homepageProducts.filter(p => !flashIds.has(String(p.id).trim().toLowerCase()));
  }, [homepageProducts, flashSaleProducts]);

  const displayedFlashSale = isFlashExpanded 
    ? flashSaleProducts 
    : flashSaleProducts.slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow pb-10 sm:pb-16 space-y-1.5 sm:space-y-3">
        
        {/* 1. Flash Sale Top Cover Photo Banner */}
        <CoverFlashBanner />

        {/* 2. Official Brands List */}
        <BrandList />

        {/* 3. Popular Categories */}
        <Categories />

        {/* 5. FLASH SALE (হলুদ ও আকর্ষণীয় ফ্ল্যাশ সেল) */}
        {flashSaleProducts.length > 0 && (
          <section className="py-2.5 sm:py-5 bg-gradient-to-b from-amber-50/50 to-slate-50">
            <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
              
              {/* Attractive, Yellow-Themed, Compact Flash Sale Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-2xl p-3 sm:p-4 border-2 border-yellow-300 shadow-md mb-2.5 sm:mb-4">
                {/* Subtle ambient light reflections */}
                <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/35 rounded-full blur-xl pointer-events-none" />
                <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-amber-500/20 rounded-full blur-lg pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  
                  {/* Left: Big Bold Title + Countdown + Mega Discount Tag */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="p-1 sm:p-1.5 rounded-xl bg-slate-950 text-amber-400 shadow-xs flex items-center justify-center">
                        <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-400 text-amber-400 animate-pulse" />
                      </span>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
                        ফ্ল্যাশ সেল
                      </h2>
                    </div>

                    {/* Live Countdown Timer in High-Contrast Black & Yellow */}
                    <FlashSaleCountdown earliestEndTime={earliestFlashEndTime} />

                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-950 text-amber-300 shadow-2xs">
                      ৫০% পর্যন্ত ছাড়!
                    </span>
                  </div>

                  {/* Right: Compelling Click Button */}
                  <Link
                    to="/flash-sale"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 sm:px-5 sm:py-2 bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-black rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap self-start sm:self-auto cursor-pointer group"
                  >
                    <span>সব ডিল দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
                {displayedFlashSale.map((product) => (
                  <div key={product.id}>
                    <ProductCard product={product} badgeText="ফ্ল্যাশ ডিল" />
                  </div>
                ))}
              </div>

              {/* Flash Sale Expand / Show More Toggle */}
              {flashSaleProducts.length > 8 && (
                <div className="mt-3 sm:mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setIsFlashExpanded(!isFlashExpanded)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-white hover:bg-amber-100/70 text-slate-900 text-xs sm:text-sm font-black rounded-full border border-amber-300 shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    {isFlashExpanded ? (
                      <>
                        <span>কম দেখুন</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>আরও {flashSaleProducts.length - 8}টি ফ্ল্যাশ ডিল দেখুন</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

            </div>
          </section>
        )}

        {/* Dynamic Vendor Ad Campaigns (Active Approved Banners) */}
        {activeAdBanners.length > 0 && (
          <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2">
            {activeAdBanners.slice(0, 2).map((ad) => (
              <div 
                key={ad.id}
                onClick={() => {
                  recordAdClick(ad.id).catch(() => {});
                  if (ad.productId) {
                    navigate(`/product/${ad.productId}`);
                  }
                }}
                className="relative rounded-2xl overflow-hidden shadow-sm border border-purple-200 cursor-pointer group mb-3 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4">
                  <div className="space-y-1.5 text-center sm:text-left z-10">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500 text-white">
                      <Megaphone className="w-3 h-3" /> স্পন্সরড বিজ্ঞাপন
                    </span>
                    <h3 className="text-base sm:text-2xl font-black text-white">{ad.title}</h3>
                    <p className="text-xs sm:text-sm text-purple-200">
                      ভেন্ডর: {ad.vendorName || 'Verified Vendor'} • {ad.productName}
                    </p>
                  </div>
                  {ad.bannerUrl && (
                    <div className="w-full sm:w-60 h-28 sm:h-32 rounded-xl overflow-hidden border border-white/20 shrink-0">
                      <img src={ad.bannerUrl} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. ALL VENDOR PRODUCTS SINGLE UNIFIED LIST (প্রতিটি প্রোডাক্ট একবারই দেখানো হয়েছে) */}
        <div id="top-products" className="scroll-mt-20">
          <AllProductsFeed products={singleFeedProducts} />
        </div>

      </main>

      <Footer />
    </div>
  );
}

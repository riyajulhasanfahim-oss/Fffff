import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rtdbGet, rtdbSubscribe } from '../lib/rtdb';

export interface ProductMetrics {
  soldCount: number;
  rating: number;
  reviewsCount: number;
}

const LOCAL_STORAGE_METRICS_KEY = 'rj_cached_product_metrics_v2';
const inMemoryMetricsCache = new Map<string, ProductMetrics>();
let cacheLastFetched = 0;
const CACHE_TTL_MS = 20 * 1000; // 20 second freshness
let isMetricsInitialLoaded = false;
let inflightMetricsPromise: Promise<Map<string, ProductMetrics>> | null = null;
const metricsListeners = new Set<(metricsMap: Map<string, ProductMetrics>) => void>();
let ordersUnsubscribe: (() => void) | null = null;
let reviewsUnsubscribe: (() => void) | null = null;
let rtdbReviewsUnsubscribe: (() => void) | null = null;

// Track active reviews in memory across RTDB & Firestore
const cachedReviewsMap = new Map<string, any>();

// Synchronously bootstrap metrics from localStorage on module load (0ms frame-0 availability)
try {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_METRICS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        for (const [k, v] of Object.entries(parsed)) {
          if (v && typeof v === 'object') {
            inMemoryMetricsCache.set(k, v as ProductMetrics);
          }
        }
        if (inMemoryMetricsCache.size > 0) {
          isMetricsInitialLoaded = true;
        }
      }
    }
  }
} catch (_) {}

/**
 * Directly updates review metrics for a product in memory, notifies subscribers,
 * and persists to localStorage immediately (0ms delay).
 */
export function updateProductReviewMetricsInMemory(
  productId: string,
  rating: number,
  reviewsCount: number
): void {
  if (!productId) return;
  const pId = String(productId).trim();
  const existing = inMemoryMetricsCache.get(pId) || { soldCount: 0, rating: 0, reviewsCount: 0 };
  
  const updated: ProductMetrics = {
    soldCount: existing.soldCount,
    rating: Number(rating) || 0,
    reviewsCount: Math.max(0, Number(reviewsCount) || 0)
  };

  inMemoryMetricsCache.set(pId, updated);
  persistMetricsToLocalStorage();
  notifyMetricsSubscribers();
}

/**
 * Returns whether initial metrics have been loaded from cache or Firestore
 */
export function isMetricsLoaded(): boolean {
  return isMetricsInitialLoaded;
}

/**
 * Subscribes to real-time metrics updates across the application
 */
export function subscribeToProductMetrics(callback: (metricsMap: Map<string, ProductMetrics>) => void): () => void {
  metricsListeners.add(callback);
  if (inMemoryMetricsCache.size > 0) {
    try { callback(inMemoryMetricsCache); } catch (_) {}
  }
  return () => {
    metricsListeners.delete(callback);
  };
}

function notifyMetricsSubscribers(): void {
  metricsListeners.forEach(cb => {
    try { cb(inMemoryMetricsCache); } catch (_) {}
  });
}

function persistMetricsToLocalStorage(): void {
  try {
    if (typeof window !== 'undefined' && inMemoryMetricsCache.size > 0) {
      const obj: Record<string, ProductMetrics> = {};
      for (const [k, v] of inMemoryMetricsCache.entries()) {
        obj[k] = v;
      }
      localStorage.setItem(LOCAL_STORAGE_METRICS_KEY, JSON.stringify(obj));
    }
  } catch (_) {}
}

/**
 * Reads product metrics from in-memory cache if available
 */
export function getCachedProductMetrics(productId: string): ProductMetrics | null {
  if (!productId) return null;
  return inMemoryMetricsCache.get(productId) || null;
}

/**
 * Processes snapshots from Firestore / RTDB into the metrics map
 */
function processMetricsData(
  ordersData: any[],
  productsData: any[],
  reviewsData: any[],
  orderItemsData?: Record<string, any>
): Map<string, ProductMetrics> {
  const salesMap = new Map<string, number>();
  const ratingsMap = new Map<string, { totalStars: number; count: number }>();

  // 1. Tally confirmed sales from orders
  if (Array.isArray(ordersData)) {
    for (const ord of ordersData) {
      if (!ord || typeof ord !== 'object') continue;
      const status = String(ord.status || '').toLowerCase();
      // Disregard cancelled or rejected orders
      if (status.includes('cancel') || status.includes('reject') || status.includes('refund')) {
        continue;
      }

      if (Array.isArray(ord.items)) {
        for (const item of ord.items) {
          if (!item) continue;
          const pId = item.productId || item.id;
          const qty = Number(item.quantity) || 1;
          if (pId) {
            salesMap.set(pId, (salesMap.get(pId) || 0) + qty);
          }
        }
      }
    }
  }

  // 2. Incorporate sales from orderItems if available (take higher of tally to avoid double-counting)
  if (orderItemsData && typeof orderItemsData === 'object') {
    for (const [oiKey, oiVal] of Object.entries(orderItemsData)) {
      if (!oiVal || typeof oiVal !== 'object') continue;
      const data = (oiVal as any).data || oiVal;
      const pId = data.productId || data.id || oiKey.split('_')[0];
      const qty = Number(data.quantity) || 1;
      if (pId) {
        const currentTally = salesMap.get(pId) || 0;
        if (currentTally < qty) {
          salesMap.set(pId, qty);
        }
      }
    }
  }

  // 3. Incorporate Firestore product documents' own confirmed sales fields
  if (Array.isArray(productsData)) {
    for (const p of productsData) {
      if (!p || typeof p !== 'object') continue;
      const pId = p.id;
      const docSold = Number(p.soldCount || p.salesCount || p.totalSold || p.soldQuantity || p.sales || 0);
      if (pId && docSold > 0) {
        const currentTally = salesMap.get(pId) || 0;
        if (docSold > currentTally) {
          salesMap.set(pId, docSold);
        }
      }
      // Link reseller/clone products with originalProductId
      if (p.originalProductId && docSold > 0) {
        const origTally = salesMap.get(p.originalProductId) || 0;
        if (docSold > origTally) {
          salesMap.set(p.originalProductId, docSold);
        }
      }
    }
  }

  // 4. Tally reviews
  if (Array.isArray(reviewsData)) {
    for (const rev of reviewsData) {
      if (!rev || typeof rev !== 'object') continue;
      const pId = rev.productId;
      const r = Number(rev.rating) || 5;
      if (pId) {
        const existing = ratingsMap.get(pId) || { totalStars: 0, count: 0 };
        ratingsMap.set(pId, {
          totalStars: existing.totalStars + r,
          count: existing.count + 1
        });
      }
    }
  }

  // Combine into inMemoryMetricsCache
  const allProductIds = new Set<string>([...salesMap.keys(), ...ratingsMap.keys(), ...inMemoryMetricsCache.keys()]);
  for (const pId of allProductIds) {
    const sold = salesMap.get(pId) || (inMemoryMetricsCache.get(pId)?.soldCount ?? 0);
    const reviewInfo = ratingsMap.get(pId);
    
    let reviewsCount = reviewInfo ? reviewInfo.count : 0;
    let rating = reviewInfo && reviewInfo.count > 0 
      ? Number((reviewInfo.totalStars / reviewInfo.count).toFixed(1)) 
      : 0;

    // Fallback: If not in ratingsMap for this batch, preserve existing cached review count or product doc review count
    if (reviewsCount === 0) {
      const existing = inMemoryMetricsCache.get(pId);
      if (existing && existing.reviewsCount > 0) {
        reviewsCount = existing.reviewsCount;
        rating = existing.rating;
      } else {
        const prodDoc = Array.isArray(productsData) ? productsData.find(p => p && p.id === pId) : null;
        const docCount = Number(prodDoc?.reviewsCount ?? prodDoc?.reviews ?? 0);
        if (docCount > 0) {
          reviewsCount = docCount;
          rating = Number(prodDoc?.rating || 0);
        }
      }
    }

    inMemoryMetricsCache.set(pId, {
      soldCount: sold,
      rating,
      reviewsCount
    });
  }

  cacheLastFetched = Date.now();
  isMetricsInitialLoaded = true;
  persistMetricsToLocalStorage();
  notifyMetricsSubscribers();

  return inMemoryMetricsCache;
}

/**
 * Calculates confirmed sales and verified reviews strictly from Cloud Firestore and Realtime Database
 * with shared in-flight deduplication and local persistence.
 */
export async function fetchAllProductsMetricsFromRTDB(forceRefresh = false): Promise<Map<string, ProductMetrics>> {
  const now = Date.now();
  if (!forceRefresh && inMemoryMetricsCache.size > 0 && (now - cacheLastFetched < CACHE_TTL_MS)) {
    return inMemoryMetricsCache;
  }

  if (inflightMetricsPromise && !forceRefresh) {
    return inflightMetricsPromise;
  }

  inflightMetricsPromise = (async () => {
    try {
      // Fetch directly from Cloud Firestore and RTDB collections (orders, products, reviews)
      const [fsOrdersSnap, fsProductsSnap, fsReviewsSnap, rtdbOrders, rtdbOrderItems, rtdbReviews] = await Promise.all([
        getDocs(collection(db, 'orders')).catch(() => null),
        getDocs(collection(db, 'products')).catch(() => null),
        getDocs(collection(db, 'reviews')).catch(() => null),
        rtdbGet<Record<string, any>>('orders', 2500).catch(() => null),
        rtdbGet<Record<string, any>>('orderItems', 2500).catch(() => null),
        rtdbGet<Record<string, any>>('reviews', 2500).catch(() => null)
      ]);

      const ordersList: any[] = [];
      if (fsOrdersSnap && !fsOrdersSnap.empty) {
        fsOrdersSnap.forEach(docSnap => {
          ordersList.push({ id: docSnap.id, ...docSnap.data() });
        });
      } else if (rtdbOrders && typeof rtdbOrders === 'object') {
        ordersList.push(...Object.values(rtdbOrders));
      }

      const productsList: any[] = [];
      if (fsProductsSnap && !fsProductsSnap.empty) {
        fsProductsSnap.forEach(docSnap => {
          productsList.push({ id: docSnap.id, ...docSnap.data() });
        });
      }

      if (rtdbReviews && typeof rtdbReviews === 'object') {
        Object.entries(rtdbReviews).forEach(([k, v]) => {
          if (v && typeof v === 'object' && (v as any).productId) {
            cachedReviewsMap.set(k, { id: k, ...(v as any) });
          }
        });
      }

      if (fsReviewsSnap && !fsReviewsSnap.empty) {
        fsReviewsSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.productId) {
            cachedReviewsMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        });
      }

      const reviewsList = Array.from(cachedReviewsMap.values());

      processMetricsData(ordersList, productsList, reviewsList, rtdbOrderItems || undefined);

      // Ensure real-time Firestore & RTDB listeners for immediate live sync
      initProductMetricsRealtimeListener();

      return inMemoryMetricsCache;
    } catch (err) {
      console.warn('[productMetricsService fetch error]:', err);
      isMetricsInitialLoaded = true;
      return inMemoryMetricsCache;
    } finally {
      inflightMetricsPromise = null;
    }
  })();

  return inflightMetricsPromise;
}

/**
 * Initializes real-time listeners on 'orders' and 'reviews'
 * without creating redundant listeners or polling storms.
 */
export function initProductMetricsRealtimeListener(): void {
  if (typeof window === 'undefined') return;

  // 1. RTDB Reviews real-time listener
  if (!rtdbReviewsUnsubscribe) {
    try {
      rtdbReviewsUnsubscribe = rtdbSubscribe<Record<string, any>>('reviews', (data) => {
        if (data && typeof data === 'object') {
          Object.entries(data).forEach(([k, v]) => {
            if (v && typeof v === 'object' && v.productId) {
              cachedReviewsMap.set(k, { id: k, ...v });
            }
          });
          const currentProducts = Array.from(inMemoryMetricsCache.keys()).map(id => ({ id }));
          processMetricsData([], currentProducts, Array.from(cachedReviewsMap.values()));
        }
      });
    } catch (e) {
      console.warn('[RTDB reviews subscribe exception]:', e);
    }
  }

  // 2. Firestore Reviews onSnapshot
  if (!reviewsUnsubscribe) {
    try {
      reviewsUnsubscribe = onSnapshot(
        collection(db, 'reviews'),
        (snap) => {
          if (!snap || snap.empty) return;
          snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data && data.productId) {
              cachedReviewsMap.set(docSnap.id, { id: docSnap.id, ...data });
            }
          });
          const currentProducts = Array.from(inMemoryMetricsCache.keys()).map(id => ({ id }));
          processMetricsData([], currentProducts, Array.from(cachedReviewsMap.values()));
        },
        (err) => {
          console.warn('[Firestore reviews onSnapshot notice]:', err?.message);
        }
      );
    } catch (e) {
      console.warn('[Firestore reviews onSnapshot exception]:', e);
    }
  }

  // 3. Firestore Orders onSnapshot
  if (!ordersUnsubscribe) {
    try {
      ordersUnsubscribe = onSnapshot(
        collection(db, 'orders'),
        (snap) => {
          if (!snap || snap.empty) return;
          const ordersList: any[] = [];
          snap.forEach(docSnap => {
            ordersList.push({ id: docSnap.id, ...docSnap.data() });
          });

          // Re-compute with cached products and cached reviews (never empty!)
          const currentProducts = Array.from(inMemoryMetricsCache.keys()).map(id => ({ id }));
          processMetricsData(ordersList, currentProducts, Array.from(cachedReviewsMap.values()));
        },
        (err) => {
          console.warn('[Firestore orders onSnapshot notice]:', err?.message);
        }
      );
    } catch (e) {
      console.warn('[initProductMetricsRealtimeListener exception]:', e);
    }
  }
}

/**
 * Immediately triggers metric loading on website startup
 */
if (typeof window !== 'undefined') {
  // Execute non-blocking initial fetch on app start
  setTimeout(() => {
    fetchAllProductsMetricsFromRTDB().catch(() => {});
  }, 10);
}

/**
 * Retrieves real metrics for a single product
 */
export async function fetchProductMetricsFromRTDB(productId: string): Promise<ProductMetrics> {
  if (!productId) {
    return { soldCount: 0, rating: 0, reviewsCount: 0 };
  }

  const cached = inMemoryMetricsCache.get(productId);
  if (cached) return cached;

  const metricsMap = await fetchAllProductsMetricsFromRTDB();
  return metricsMap.get(productId) || { soldCount: 0, rating: 0, reviewsCount: 0 };
}

/**
 * Enriches a list of products with authentic sales & review counts.
 */
export async function enrichProductsWithRealMetrics(products: any[]): Promise<any[]> {
  if (!Array.isArray(products) || products.length === 0) return products;

  try {
    const metricsMap = await fetchAllProductsMetricsFromRTDB();

    return products.map(product => {
      if (!product || typeof product !== 'object') return product;
      const pId = product.id;
      const rtdbMetric = metricsMap.get(pId) || (product.originalProductId ? metricsMap.get(product.originalProductId) : undefined);

      const realSold = rtdbMetric?.soldCount 
        ?? Number(product.salesCount ?? product.soldCount ?? product.totalSold ?? product.soldQuantity ?? product.sales ?? 0);

      const realReviewsCount = rtdbMetric?.reviewsCount 
        ?? Number(product.reviewsCount ?? product.reviews ?? 0);

      const realRating = rtdbMetric?.rating 
        ?? (realReviewsCount > 0 ? Number(product.rating || 0) : 0);

      return {
        ...product,
        soldCount: realSold,
        salesCount: realSold,
        totalSold: realSold,
        reviews: realReviewsCount,
        reviewsCount: realReviewsCount,
        rating: realRating
      };
    });
  } catch (e) {
    console.warn('Notice enriching products with real metrics:', e);
    return products;
  }
}

import { rtdbList, rtdbSubscribe, rtdbGet } from '../lib/rtdb';
import { Product } from '../components/ui/ProductCard';
import { enrichProductsWithRealMetrics } from './productMetricsService';
import { isStoreDeletedFromCache } from './storeCache';
import { formatDirectImageUrl } from '../utils/imageUrl';
import { generateProductSlug } from '../utils/seo';

/**
 * Normalizes any raw product from RTDB into standard Product interface
 */
export function normalizeProduct(raw: any, id?: string): Product {
  const prodId = String(id || raw.id || raw.productId || '').trim();
  const rawFeatImg = raw.featuredImage || raw.image || raw.imageUrl || (Array.isArray(raw.images) && raw.images.length > 0 ? raw.images[0] : '') || '';
  const featImg = formatDirectImageUrl(rawFeatImg);
  
  // Format all images array
  let processedImages: string[] = [];
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    processedImages = raw.images.map((img: any) => typeof img === 'string' ? formatDirectImageUrl(img) : '').filter(Boolean);
  } else if (featImg) {
    processedImages = [featImg];
  }

  // Ensure featImg is in images list if not already
  if (featImg && !processedImages.includes(featImg)) {
    processedImages.unshift(featImg);
  }
  
  const regPrice = raw.regularPrice !== undefined && raw.regularPrice !== null
    ? Number(raw.regularPrice)
    : (raw.originalPrice ? Number(raw.originalPrice) : Number(raw.price) || 0);
    
  const curPrice = Number(raw.price) || 0;
  const hasSale = raw.salePrice !== undefined && raw.salePrice !== null && Number(raw.salePrice) > 0 && Number(raw.salePrice) < regPrice;
  const effectivePrice = hasSale ? Number(raw.salePrice) : (curPrice > 0 ? curPrice : regPrice);
  
  const discountVal = raw.discount !== undefined && raw.discount !== null
    ? Number(raw.discount)
    : (hasSale && regPrice > effectivePrice 
        ? Math.round(((regPrice - effectivePrice) / regPrice) * 100)
        : (regPrice > curPrice ? Math.round(((regPrice - curPrice) / regPrice) * 100) : undefined));

  const tagsArr = Array.isArray(raw.tags) 
    ? raw.tags 
    : (typeof raw.tags === 'string' ? raw.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []);

  const rawVendor = raw.vendor || {};
  const vendorId = raw.vendorId || raw.storeId || rawVendor.id || rawVendor.storeId || '';
  const vendorName = rawVendor.storeName || rawVendor.name || raw.storeName || raw.vendorName || (vendorId ? 'Vendor Shop' : 'Official Store');

  const brandName = raw.brand || raw.brandName || raw.brandTitle || (raw.specifications && (raw.specifications.Brand || raw.specifications['ব্র্যান্ড'])) || '';

  return {
    id: prodId,
    name: raw.name || raw.productName || raw.title || 'Product',
    price: effectivePrice,
    originalPrice: (hasSale || regPrice > effectivePrice) ? regPrice : undefined,
    discount: discountVal && discountVal > 0 ? discountVal : undefined,
    image: featImg,
    featuredImage: featImg,
    images: processedImages,
    category: raw.category || 'General',
    categorySlug: raw.categorySlug || (raw.category ? raw.category.toLowerCase().replace(/[\s&]+/g, '-') : 'general'),
    brand: brandName,
    tags: tagsArr,
    inStock: raw.inStock !== undefined ? !!raw.inStock : ((Number(raw.stock) || Number(raw.stockCount) || 1) > 0),
    stock: raw.stock !== undefined ? Number(raw.stock) : (raw.stockCount !== undefined ? Number(raw.stockCount) : 10),
    rating: Number(raw.rating) || 0,
    reviews: Number(raw.reviewsCount || raw.reviews || 0),
    reviewsCount: Number(raw.reviewsCount || raw.reviews || 0),
    soldCount: Number(raw.soldCount || raw.salesCount || raw.totalSold || 0),
    salesCount: Number(raw.soldCount || raw.salesCount || raw.totalSold || 0),
    totalSold: Number(raw.soldCount || raw.salesCount || raw.totalSold || 0),
    isNew: !!raw.isNew,
    vendorId: vendorId,
    vendor: {
      id: vendorId,
      name: vendorName,
      storeName: vendorName,
      rating: Number(rawVendor.rating) || 5,
      joined: rawVendor.joined || '2026'
    },
    specifications: raw.specifications || undefined,
    description: (raw.description || raw.desc || raw.productDescription || raw.details || '').trim(),
    resellerPrice: raw.resellerPrice ? Number(raw.resellerPrice) : undefined,
    resellerProfit: raw.resellerProfit ? Number(raw.resellerProfit) : undefined,
    status: raw.status || 'Published',
    slug: raw.slug || prodId,
    createdAt: Number(raw.createdAt) || 0,
    updatedAt: Number(raw.updatedAt) || 0
  } as Product;
}

// ============================================================================
// Centralized In-Memory Product State & Multiplexed RTDB Subscription
// Ensures zero-blank, zero-flicker, and zero product vanishing across navigation
// ============================================================================
const CACHED_PRODUCTS_KEY = 'rj_cached_marketplace_products_v2';
const CACHED_VENDORS_KEY = 'rj_cached_vendors_map_v2';

let globalMarketplaceProducts: Product[] | null = (() => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHED_PRODUCTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (_) {}
  return null;
})();

let globalVendorsMap: Record<string, any> = (() => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHED_VENDORS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    }
  } catch (_) {}
  return {};
})();

const subscribers = new Set<(products: Product[]) => void>();
let globalRTDBUnsubscribe: (() => void) | null = null;
let lastFetchTime = 0;
let inflightMarketplaceFetch: Promise<Product[]> | null = null;

/**
 * Returns products currently cached in memory.
 * Can be called synchronously by any component to guarantee instant rendering on mount.
 */
export function getCachedMarketplaceProducts(): Product[] {
  if (globalMarketplaceProducts && globalMarketplaceProducts.length > 0) {
    return [...globalMarketplaceProducts];
  }
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(CACHED_PRODUCTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          globalMarketplaceProducts = parsed;
          return [...parsed];
        }
      }
    }
  } catch (_) {}
  return [];
}

/**
 * Helper to enrich products with real vendor details from vendors map
 */
function enrichWithVendors(products: Product[], vendors: Record<string, any>): Product[] {
  return products.map(prod => {
    const vId = prod.vendorId || prod.vendor?.id;
    if (vId && vendors[vId]) {
      const vData = vendors[vId];
      const realStoreName = vData.storeName || vData.shopName || vData.name;
      if (realStoreName) {
        return {
          ...prod,
          vendor: {
            ...(prod.vendor || {}),
            id: vId,
            name: realStoreName,
            storeName: realStoreName,
            rating: Number(vData.rating) || 5,
            joined: vData.joined || '2026'
          }
        };
      }
    }
    return prod;
  });
}

/**
 * Parses raw RTDB products node into normalized products list
 */
function parseRTDBProducts(rtdbData: Record<string, any>, vendors: Record<string, any>): Product[] {
  if (!rtdbData || typeof rtdbData !== 'object') return [];

  const combinedMap = new Map<string, Product>();

  for (const [key, val] of Object.entries(rtdbData)) {
    if (val && typeof val === 'object') {
      const statusLower = String(val.status || '').toLowerCase();
      // Only skip products that are explicitly archived, inactive or deleted
      if (statusLower === 'archived' || statusLower === 'inactive' || statusLower === 'deleted') {
        continue;
      }
      // Strictly skip placeholder, blank, dummy, or corrupt items without a real product name
      const candidateName = String(val.name || val.productName || val.title || '').trim();
      const lowerName = candidateName.toLowerCase();
      if (
        !candidateName ||
        lowerName === 'product' ||
        lowerName === 'demo' ||
        lowerName === 'dummy' ||
        lowerName === 'placeholder' ||
        lowerName === 'sample product' ||
        lowerName === 'test product'
      ) {
        continue;
      }
      const norm = normalizeProduct(val, key);
      const vId = norm.vendorId || val.storeId;
      if (vId) {
        const vStore = vendors[vId];
        const isActivelyRegistered = vStore && (vStore.status === 'active' || vStore.status === 'approved' || vStore.isVerified);
        if (!isActivelyRegistered && isStoreDeletedFromCache(vId)) {
          continue;
        }
      }
      if (norm.id) {
        combinedMap.set(norm.id, norm);
      }
    }
  }

  const list = Array.from(combinedMap.values());
  const enriched = enrichWithVendors(list, vendors);
  // Sort newest first
  enriched.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return enriched;
}

/**
 * Starts the single global RTDB listener on the 'products' node if not already running
 */
function ensureGlobalRTDBListener(): void {
  if (globalRTDBUnsubscribe) return;

  globalRTDBUnsubscribe = rtdbSubscribe<Record<string, any>>('products', async (rtdbData) => {
    // If RTDB data is null (connection glitch or handshake), keep existing in-memory data
    if (!rtdbData && globalMarketplaceProducts && globalMarketplaceProducts.length > 0) {
      return;
    }

    try {
      if (Object.keys(globalVendorsMap).length === 0) {
        const [rawStores, rawVendors] = await Promise.all([
          rtdbGet<Record<string, any>>('stores', 5000).catch(() => null),
          rtdbGet<Record<string, any>>('vendors', 5000).catch(() => null)
        ]);
        const safeStores = rawStores && typeof rawStores === 'object' && !('error' in rawStores) ? rawStores : {};
        const safeVendors = rawVendors && typeof rawVendors === 'object' && !('error' in rawVendors) ? rawVendors : {};
        globalVendorsMap = { ...safeStores, ...safeVendors };
      }
    } catch (_) {}

    // Wholesome product merge: RTDB live snapshot + Server-persisted products + Browser local products
    let serverProds: Record<string, any> = {};
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 2000);
      const res = await fetch('/api/products', { signal: c.signal });
      clearTimeout(t);
      if (res.ok) serverProds = await res.json();
    } catch (_) {}

    let localProds: Record<string, any> = {};
    try {
      if (typeof window !== 'undefined') {
        localProds = JSON.parse(localStorage.getItem('rj_local_products') || '{}');
      }
    } catch (_) {}

    const mergedProducts: Record<string, any> = {
      ...(rtdbData && typeof rtdbData === 'object' ? rtdbData : {}),
      ...(serverProds && typeof serverProds === 'object' ? serverProds : {}),
      ...(localProds && typeof localProds === 'object' ? localProds : {})
    };

    const parsed = parseRTDBProducts(mergedProducts, globalVendorsMap);
    
    // Protect against spurious empty overwrites if we already have loaded products
    if (parsed.length === 0 && globalMarketplaceProducts && globalMarketplaceProducts.length > 0 && !rtdbData && Object.keys(serverProds).length === 0) {
      return;
    }

    globalMarketplaceProducts = parsed;
    lastFetchTime = Date.now();

    // Persist to localStorage for 0ms next load
    try {
      if (typeof window !== 'undefined' && parsed.length > 0) {
        localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(parsed));
        if (Object.keys(globalVendorsMap).length > 0) {
          localStorage.setItem(CACHED_VENDORS_KEY, JSON.stringify(globalVendorsMap));
        }
      }
    } catch (_) {}

    // Signal app readiness once live products are updated
    if (typeof window !== 'undefined' && typeof (window as any).markAppReady === 'function') {
      (window as any).markAppReady();
    }

    // Broadcast to all active page/component subscribers
    subscribers.forEach(cb => {
      try {
        cb([...parsed]);
      } catch (err) {
        console.warn('[subscribeToMarketplaceProducts callback error]:', err);
      }
    });

    // Background metric enrichment
    enrichProductsWithRealMetrics(parsed).catch(() => {});
  });
}

/**
 * Notifies the in-memory marketplace state that a product was added or updated.
 * Guarantees 0ms immediate rendering on the Homepage, Shop, and all product grids.
 */
export function notifyMarketplaceProductChange(rawProduct: any, id?: string): void {
  const candidateName = String(rawProduct?.name || rawProduct?.productName || rawProduct?.title || '').trim();
  const lowerName = candidateName.toLowerCase();
  if (
    !candidateName ||
    lowerName === 'product' ||
    lowerName === 'demo' ||
    lowerName === 'dummy' ||
    lowerName === 'placeholder' ||
    lowerName === 'sample product' ||
    lowerName === 'test product'
  ) {
    return;
  }
  const norm = normalizeProduct(rawProduct, id || rawProduct.id || rawProduct.productId);
  if (!norm || !norm.id) return;

  const current = globalMarketplaceProducts ? [...globalMarketplaceProducts] : [];
  const idx = current.findIndex(p => p.id === norm.id);
  if (idx >= 0) {
    current[idx] = norm;
  } else {
    current.unshift(norm);
  }
  globalMarketplaceProducts = current;
  subscribers.forEach(cb => {
    try { cb([...current]); } catch (_) {}
  });
}

/**
 * Notifies the in-memory marketplace state that a product was deleted.
 * Guarantees immediate removal from the Homepage and all product grids.
 */
export function notifyMarketplaceProductRemoved(productId: string): void {
  if (!productId) return;
  const current = globalMarketplaceProducts ? [...globalMarketplaceProducts] : [];
  const filtered = current.filter(p => p.id !== productId);
  globalMarketplaceProducts = filtered;
  subscribers.forEach(cb => {
    try { cb([...filtered]); } catch (_) {}
  });
}

/**
 * Fetches all products across all vendors strictly from Firebase Realtime Database
 */
export async function fetchAllMarketplaceProducts(forceRefresh = false): Promise<Product[]> {
  ensureGlobalRTDBListener();

  // If in-memory products exist and forceRefresh is false, return instantly (0ms latency)
  // The real-time WebSocket listener (ensureGlobalRTDBListener) will automatically keep this up to date
  if (!forceRefresh && globalMarketplaceProducts !== null && globalMarketplaceProducts.length > 0) {
    if (typeof window !== 'undefined' && typeof (window as any).markAppReady === 'function') {
      (window as any).markAppReady();
    }
    return [...globalMarketplaceProducts];
  }

  // Deduplicate in-flight fetch so all concurrent requests share the exact same background promise
  if (!forceRefresh && inflightMarketplaceFetch) {
    return inflightMarketplaceFetch;
  }

  const fetchPromise = (async () => {
    try {
      const [rawProducts, rawStores, rawVendors, serverProds] = await Promise.all([
        rtdbGet<Record<string, any>>('products', 4000),
        rtdbGet<Record<string, any>>('stores', 4000),
        rtdbGet<Record<string, any>>('vendors', 2500).catch(() => null),
        (async () => {
          try {
            // First check if early background preloader from index.html resolved
            if (typeof window !== 'undefined' && (window as any).__RJ_PREFETCHED_PRODUCTS_PROMISE__) {
              const pre = await (window as any).__RJ_PREFETCHED_PRODUCTS_PROMISE__;
              if (pre && typeof pre === 'object') return pre;
            }
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 2000);
            const r = await fetch('/api/products', { signal: c.signal });
            clearTimeout(t);
            return r.ok ? await r.json() : null;
          } catch { return null; }
        })()
      ]);

      const safeStores = rawStores && typeof rawStores === 'object' && !('error' in rawStores) ? rawStores : {};
      const safeVendors = rawVendors && typeof rawVendors === 'object' && !('error' in rawVendors) ? rawVendors : {};
      globalVendorsMap = { ...safeStores, ...safeVendors, ...globalVendorsMap };

      const mergedProducts: Record<string, any> = {
        ...(rawProducts && typeof rawProducts === 'object' ? rawProducts : {}),
        ...(serverProds && typeof serverProds === 'object' ? serverProds : {})
      };

      // Also include any browser local products backup
      try {
        if (typeof window !== 'undefined') {
          const local = JSON.parse(localStorage.getItem('rj_local_products') || '{}');
          Object.assign(mergedProducts, local);
        }
      } catch (_) {}

      const parsed = parseRTDBProducts(mergedProducts, globalVendorsMap);

      // If fetch returned data, update in-memory cache and localStorage
      if (parsed.length > 0 || !globalMarketplaceProducts) {
        globalMarketplaceProducts = parsed;
        lastFetchTime = Date.now();
        try {
          if (typeof window !== 'undefined' && parsed.length > 0) {
            localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(parsed));
            if (Object.keys(globalVendorsMap).length > 0) {
              localStorage.setItem(CACHED_VENDORS_KEY, JSON.stringify(globalVendorsMap));
            }
          }
        } catch (_) {}
      }

      // Signal hardware-accelerated opening animation that product data is ready
      if (typeof window !== 'undefined' && typeof (window as any).markAppReady === 'function') {
        (window as any).markAppReady();
      }

      // Background metric enrichment
      enrichProductsWithRealMetrics(globalMarketplaceProducts || []).catch(() => {});

      return globalMarketplaceProducts ? [...globalMarketplaceProducts] : [];
    } catch (err) {
      console.warn('[fetchAllMarketplaceProducts RTDB fetch notice]:', err);
      // Fallback to in-memory cached products if network fails
      if (typeof window !== 'undefined' && typeof (window as any).markAppReady === 'function') {
        (window as any).markAppReady();
      }
      return globalMarketplaceProducts ? [...globalMarketplaceProducts] : [];
    } finally {
      inflightMarketplaceFetch = null;
    }
  })();

  inflightMarketplaceFetch = fetchPromise;
  return fetchPromise;
}

/**
 * Subscribes to real-time changes in RTDB products node.
 * Immediately invokes callback with in-memory products if already available.
 */
export function subscribeToMarketplaceProducts(
  onUpdate: (products: Product[]) => void
): () => void {
  // 1. If we already have products in memory, deliver immediately
  if (globalMarketplaceProducts && globalMarketplaceProducts.length > 0) {
    try {
      onUpdate([...globalMarketplaceProducts]);
    } catch (_) {}
  }

  // 2. Register subscriber
  subscribers.add(onUpdate);

  // 3. Ensure the underlying RTDB listener is running
  ensureGlobalRTDBListener();

  // 4. Return cleanup function
  return () => {
    subscribers.delete(onUpdate);
  };
}

/**
 * Finds a single product by ID, slug, or generated slug directly from RTDB products
 */
export async function fetchProductById(identifier: string): Promise<Product | null> {
  if (!identifier) return null;
  const cleanId = String(identifier).trim().toLowerCase();

  // 1. Check in-memory marketplace cache
  if (globalMarketplaceProducts && globalMarketplaceProducts.length > 0) {
    const found = globalMarketplaceProducts.find(p => {
      const pId = String(p.id).toLowerCase();
      const pSlug = String(p.slug || '').toLowerCase();
      const genSlug = generateProductSlug(p.name, p.id).toLowerCase();
      return pId === cleanId || pSlug === cleanId || genSlug === cleanId;
    });
    if (found) return found;
  }

  // 2. Fetch fresh from RTDB products node
  const all = await fetchAllMarketplaceProducts(true);
  const foundInFresh = all.find(p => {
    const pId = String(p.id).toLowerCase();
    const pSlug = String(p.slug || '').toLowerCase();
    const genSlug = generateProductSlug(p.name, p.id).toLowerCase();
    return pId === cleanId || pSlug === cleanId || genSlug === cleanId;
  });
  if (foundInFresh) return foundInFresh;

  // 3. Direct RTDB node lookup (if identifier matches RTDB key directly)
  try {
    const direct = await rtdbGet<any>(`products/${identifier}`);
    if (direct && typeof direct === 'object') {
      return normalizeProduct(direct, identifier);
    }
  } catch (_) {}

  // 4. Server API lookup
  try {
    const res = await fetch(`/api/products/${identifier}`);
    if (res.ok) {
      const serverProd = await res.json();
      if (serverProd && typeof serverProd === 'object') {
        return normalizeProduct(serverProd, identifier);
      }
    }
  } catch (_) {}

  return null;
}


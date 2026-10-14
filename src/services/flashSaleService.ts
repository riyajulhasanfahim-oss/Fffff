import { rtdbList, rtdbGet, rtdbSet, rtdbUpdate, rtdbRemove, rtdbPush, rtdbSubscribe } from '../lib/rtdb';
import { Product } from '../components/ui/ProductCard';
import { normalizeProduct } from './productService';

export interface FlashSaleItem {
  id: string;
  productId: string;
  productName: string;
  vendorId: string;
  vendorName?: string;
  productImage?: string;
  regularPrice: number;
  flashPrice: number;
  discountPercent: number;
  stock: number;         // Allocated flash sale stock limit
  soldCount?: number;    // Count sold during this flash sale
  startTime: number;     // Milliseconds timestamp
  endTime: number;       // Milliseconds timestamp
  status: 'active' | 'pending' | 'ended' | 'rejected';
  isApproved?: boolean;  // Admin approval flag
  createdAt: number;
  updatedAt?: number;
}

/**
 * Validates whether a flash sale is strictly active right now.
 * Criteria:
 * 1. Admin-approved or active status
 * 2. Current time between startTime and endTime
 * 3. Flash sale stock > 0
 */
export function isFlashSaleActive(fs: FlashSaleItem | any): boolean {
  if (!fs) return false;
  const now = Date.now();

  const isApproved = fs.isApproved !== false && fs.status !== 'rejected' && fs.status !== 'ended';
  const isStatusActive = fs.status === 'active' || fs.status === 'approved' || fs.isApproved === true || fs.active === true;
  if (!isApproved || !isStatusActive) return false;

  const start = Number(fs.startTime) || 0;
  const end = Number(fs.endTime) || 0;

  // If start is in the future, it's not active yet
  if (start > 0 && now < start) return false;

  // If end is in the past, it has expired
  if (end > 0 && now >= end) return false;

  // If flash sale stock is depleted, it's no longer active
  const stock = Number(fs.stock);
  if (!isNaN(stock) && stock <= 0) return false;

  return true;
}

/**
 * Fetches all raw flash sale records from RTDB
 */
export async function fetchAllFlashSales(): Promise<FlashSaleItem[]> {
  try {
    const list = await rtdbList<FlashSaleItem>('flashSales');
    return list.map(item => ({ id: item.id, ...item.data }));
  } catch (err) {
    console.error('Error fetching flashSales:', err);
    return [];
  }
}

/**
 * Fetches all products currently active in Flash Sale.
 * Merges flash sale pricing, discount, and countdown data onto the product.
 * Filters out expired flash sales and products with zero stock.
 */
export async function fetchActiveFlashSaleProducts(): Promise<Product[]> {
  try {
    const [flashSalesList, productsList] = await Promise.all([
      fetchAllFlashSales(),
      rtdbList<any>('products').catch(() => [])
    ]);

    const productsMap = new Map<string, any>();
    productsList.forEach(p => {
      productsMap.set(p.id, { id: p.id, ...p.data });
    });

    const activeList: Product[] = [];
    const processedProductIds = new Set<string>();
    const now = Date.now();

    // 1. Process flash sales from the 'flashSales' table
    for (const fs of flashSalesList) {
      if (!isFlashSaleActive(fs)) continue;

      const rawProd = productsMap.get(fs.productId);
      if (!rawProd) continue;

      // Product must be active and have positive stock
      const prodStock = Number(rawProd.stock ?? rawProd.stockCount ?? 1);
      if (prodStock <= 0) continue;
      if (rawProd.status === 'Archived' || rawProd.status === 'Inactive' || rawProd.status === 'Deleted') continue;

      const normalized = normalizeProduct(rawProd, fs.productId);
      const regularPrice = Number(fs.regularPrice) || normalized.originalPrice || normalized.price || 0;
      const flashPrice = Number(fs.flashPrice) || normalized.price;
      const discountPercent = fs.discountPercent || (regularPrice > flashPrice ? Math.round(((regularPrice - flashPrice) / regularPrice) * 100) : 0);

      activeList.push({
        ...normalized,
        name: fs.productName || normalized.name,
        price: flashPrice,
        originalPrice: regularPrice > flashPrice ? regularPrice : normalized.originalPrice,
        discount: discountPercent > 0 ? discountPercent : normalized.discount,
        stock: Math.min(prodStock, Number(fs.stock) || prodStock),
        flashSale: {
          active: true,
          price: flashPrice,
          regularPrice: regularPrice,
          discount: discountPercent,
          stock: Number(fs.stock) || prodStock,
          startTime: fs.startTime,
          endTime: fs.endTime,
          isApproved: true,
          status: 'active'
        }
      });
      processedProductIds.add(fs.productId);
    }

    // 2. Also check any products that have embedded flashSale object
    for (const [pId, rawProd] of productsMap.entries()) {
      if (processedProductIds.has(pId)) continue;
      if (!rawProd || !rawProd.flashSale) continue;

      const fs = rawProd.flashSale;
      if (!isFlashSaleActive(fs)) continue;

      const prodStock = Number(rawProd.stock ?? rawProd.stockCount ?? 1);
      if (prodStock <= 0) continue;
      if (rawProd.status === 'Archived' || rawProd.status === 'Inactive' || rawProd.status === 'Deleted') continue;

      const normalized = normalizeProduct(rawProd, pId);
      const regularPrice = Number(fs.regularPrice) || normalized.originalPrice || normalized.price || 0;
      const flashPrice = Number(fs.price || fs.flashPrice) || normalized.price;
      const discountPercent = fs.discount || fs.discountPercent || (regularPrice > flashPrice ? Math.round(((regularPrice - flashPrice) / regularPrice) * 100) : 0);

      activeList.push({
        ...normalized,
        price: flashPrice,
        originalPrice: regularPrice > flashPrice ? regularPrice : normalized.originalPrice,
        discount: discountPercent > 0 ? discountPercent : normalized.discount,
        stock: Math.min(prodStock, Number(fs.stock) || prodStock),
        flashSale: {
          active: true,
          price: flashPrice,
          regularPrice: regularPrice,
          discount: discountPercent,
          stock: Number(fs.stock) || prodStock,
          startTime: fs.startTime,
          endTime: fs.endTime,
          isApproved: true,
          status: 'active'
        }
      });
      processedProductIds.add(pId);
    }

    // Sort by largest discount first
    activeList.sort((a, b) => (b.discount || 0) - (a.discount || 0));
    return activeList;
  } catch (err) {
    console.error('Error fetching active flash sale products:', err);
    return [];
  }
}

/**
 * Real-time subscription to active Flash Sale products.
 * Ticks every 1 second to drop products the exact moment their Flash Sale expires.
 */
export function subscribeToActiveFlashSaleProducts(callback: (products: Product[]) => void): () => void {
  let isMounted = true;
  let cachedProducts: Product[] = [];

  const refresh = async () => {
    if (!isMounted) return;
    const prods = await fetchActiveFlashSaleProducts();
    if (isMounted) {
      cachedProducts = prods;
      callback(prods);
    }
  };

  // Immediate fetch
  refresh();

  // RTDB subscriptions
  const unsubFlash = rtdbSubscribe('flashSales', () => {
    refresh();
  });
  const unsubProducts = rtdbSubscribe('products', () => {
    refresh();
  });

  // Second-level ticker to auto-evict expired sales without waiting for DB changes
  const interval = setInterval(() => {
    if (!isMounted) return;
    const now = Date.now();
    const stillActive = cachedProducts.filter(p => {
      const fs = p.flashSale;
      if (!fs) return false;
      if (fs.endTime && now >= fs.endTime) return false;
      return true;
    });

    if (stillActive.length !== cachedProducts.length) {
      cachedProducts = stillActive;
      callback(stillActive);
    }
  }, 1000);

  return () => {
    isMounted = false;
    clearInterval(interval);
    unsubFlash();
    unsubProducts();
  };
}

/**
 * Saves or updates a vendor Flash Sale request
 */
export async function saveFlashSale(item: Partial<FlashSaleItem> & { productId: string; vendorId: string }): Promise<string> {
  const now = Date.now();
  const id = item.id || `fs_${item.productId}_${now}`;

  const regularPrice = Number(item.regularPrice) || 0;
  const flashPrice = Number(item.flashPrice) || 0;
  const discountPercent = item.discountPercent || (regularPrice > flashPrice ? Math.round(((regularPrice - flashPrice) / regularPrice) * 100) : 0);

  const payload: FlashSaleItem = {
    id,
    productId: item.productId,
    productName: item.productName || 'Flash Sale Product',
    vendorId: item.vendorId,
    vendorName: item.vendorName || '',
    productImage: item.productImage || '',
    regularPrice,
    flashPrice,
    discountPercent,
    stock: Number(item.stock) || 10,
    soldCount: item.soldCount || 0,
    startTime: Number(item.startTime) || now,
    endTime: Number(item.endTime) || (now + 24 * 60 * 60 * 1000), // Default 24h
    status: item.status || 'active',
    isApproved: item.isApproved !== undefined ? item.isApproved : true,
    createdAt: item.createdAt || now,
    updatedAt: now
  };

  await rtdbSet(`flashSales/${id}`, payload);

  // Sync onto product in RTDB
  await rtdbUpdate(`products/${item.productId}`, {
    flashSale: {
      id,
      active: payload.status === 'active',
      price: payload.flashPrice,
      regularPrice: payload.regularPrice,
      discount: payload.discountPercent,
      stock: payload.stock,
      startTime: payload.startTime,
      endTime: payload.endTime,
      status: payload.status,
      isApproved: payload.isApproved
    }
  }).catch(() => {});

  return id;
}

/**
 * Toggles flash sale active / paused / ended status
 */
export async function updateFlashSaleStatus(id: string, productId: string, status: 'active' | 'ended' | 'rejected' | 'pending'): Promise<void> {
  await rtdbUpdate(`flashSales/${id}`, {
    status,
    updatedAt: Date.now()
  });

  await rtdbUpdate(`products/${productId}`, {
    'flashSale/active': status === 'active',
    'flashSale/status': status
  }).catch(() => {});
}

/**
 * Admin: Approves a Flash Sale
 */
export async function adminApproveFlashSale(id: string, productId: string): Promise<void> {
  await rtdbUpdate(`flashSales/${id}`, {
    status: 'active',
    isApproved: true,
    updatedAt: Date.now()
  });

  await rtdbUpdate(`products/${productId}`, {
    'flashSale/active': true,
    'flashSale/status': 'active',
    'flashSale/isApproved': true
  }).catch(() => {});
}

/**
 * Admin: Rejects a Flash Sale
 */
export async function adminRejectFlashSale(id: string, productId: string): Promise<void> {
  await rtdbUpdate(`flashSales/${id}`, {
    status: 'rejected',
    isApproved: false,
    updatedAt: Date.now()
  });

  await rtdbUpdate(`products/${productId}`, {
    'flashSale/active': false,
    'flashSale/status': 'rejected',
    'flashSale/isApproved': false
  }).catch(() => {});
}

/**
 * Deletes a Flash Sale
 */
export async function deleteFlashSale(id: string, productId: string): Promise<void> {
  await rtdbRemove(`flashSales/${id}`);
  await rtdbUpdate(`products/${productId}`, {
    flashSale: null
  }).catch(() => {});
}

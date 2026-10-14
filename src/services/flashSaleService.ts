import { rtdbGet, rtdbSet, rtdbUpdate, rtdbList, rtdbSubscribe } from '../lib/rtdb';

export interface FlashSaleData {
  active: boolean;
  flashPrice: number;
  regularPrice: number;
  discountPercent?: number;
  startTime: number | string;
  endTime: number | string;
  stock?: number;
  soldCount?: number;
  approved?: boolean;
  updatedAt?: number;
}

/**
 * Checks whether a product has a valid, currently active, admin-approved flash sale.
 * - Admin approved or not explicitly rejected
 * - Current time >= startTime and <= endTime
 * - Stock > 0
 */
export function isProductInActiveFlashSale(product: any): boolean {
  if (!product) return false;

  const now = Date.now();
  const fs: FlashSaleData | undefined = product.flashSale;

  if (fs) {
    // 1. Must be active
    if (fs.active === false || product.flashSaleActive === false) return false;

    // 2. Must be approved (defaults to true unless explicitly rejected/false)
    if (fs.approved === false || product.flashSaleApproved === false) return false;

    // 3. Timing checks
    const startTime = fs.startTime 
      ? new Date(fs.startTime).getTime() 
      : (product.flashSaleStartTime ? new Date(product.flashSaleStartTime).getTime() : 0);
      
    const endTime = fs.endTime 
      ? new Date(fs.endTime).getTime() 
      : (product.flashSaleEndTime ? new Date(product.flashSaleEndTime).getTime() : 0);

    if (startTime && !isNaN(startTime) && now < startTime) return false;
    if (endTime && !isNaN(endTime) && now > endTime) return false;

    // 4. Stock check
    const allocatedStock = fs.stock !== undefined ? Number(fs.stock) : Number(product.flashSaleStock ?? product.stock ?? 10);
    const overallStock = Number(product.stock ?? 10);

    if (allocatedStock <= 0 || overallStock <= 0) return false;

    return true;
  }

  // Fallback check for flat product properties
  if (product.flashSaleActive === true) {
    if (product.flashSaleApproved === false) return false;

    const start = product.flashSaleStartTime ? new Date(product.flashSaleStartTime).getTime() : 0;
    const end = product.flashSaleEndTime ? new Date(product.flashSaleEndTime).getTime() : 0;

    if (start && now < start) return false;
    if (end && now > end) return false;

    const stock = Number(product.flashSaleStock ?? product.stock ?? 10);
    if (stock <= 0) return false;

    return true;
  }

  // Fallback for deals marked as 'flash' with valid discount and stock
  if (product.deal === 'flash' || product.isFlashSale === true) {
    const stock = Number(product.stock ?? 10);
    if (stock <= 0) return false;

    if (product.flashSaleExpiresAt && now > Number(product.flashSaleExpiresAt)) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Returns normalized pricing, discount, stock, and timing for a flash sale product.
 */
export function getProductFlashSaleDetails(product: any) {
  const fs: FlashSaleData | undefined = product.flashSale;
  const now = Date.now();

  const regPrice = Number(
    fs?.regularPrice || 
    product.regularPrice || 
    product.originalPrice || 
    product.price || 
    0
  );

  let flashPrice = Number(
    fs?.flashPrice || 
    product.flashSalePrice || 
    product.salePrice || 
    product.price || 
    0
  );

  if (flashPrice >= regPrice && regPrice > 0) {
    flashPrice = Math.round(regPrice * 0.7); // Fallback sensible 30% discount if identical
  }

  const discountPercent = fs?.discountPercent || 
    (regPrice > flashPrice ? Math.round(((regPrice - flashPrice) / regPrice) * 100) : (product.discount || 0));

  const startTime = fs?.startTime 
    ? new Date(fs.startTime).getTime() 
    : (product.flashSaleStartTime ? new Date(product.flashSaleStartTime).getTime() : 0);

  // Default duration is 24 hours from today if not set
  const endTime = fs?.endTime 
    ? new Date(fs.endTime).getTime() 
    : (product.flashSaleEndTime ? new Date(product.flashSaleEndTime).getTime() : (now + 24 * 60 * 60 * 1000));

  const remainingMs = Math.max(0, endTime - now);
  const stock = fs?.stock !== undefined ? Number(fs.stock) : Number(product.flashSaleStock ?? product.stock ?? 10);
  const soldCount = fs?.soldCount !== undefined ? Number(fs.soldCount) : Number(product.soldCount ?? 0);

  return {
    isActive: isProductInActiveFlashSale(product),
    flashPrice,
    regularPrice: regPrice,
    discountPercent: discountPercent > 0 ? discountPercent : 20,
    startTime,
    endTime,
    remainingMs,
    stock,
    soldCount,
    totalQuota: stock + soldCount
  };
}

/**
 * Save or update a flash sale for a product
 */
export async function saveProductFlashSale(productId: string, vendorId: string, data: {
  flashPrice: number;
  regularPrice: number;
  discountPercent?: number;
  startTime: string | number;
  endTime: string | number;
  stock: number;
  active?: boolean;
}) {
  const flashSalePayload: FlashSaleData = {
    active: data.active !== false,
    flashPrice: Number(data.flashPrice),
    regularPrice: Number(data.regularPrice),
    discountPercent: data.discountPercent || Math.round(((data.regularPrice - data.flashPrice) / data.regularPrice) * 100),
    startTime: data.startTime,
    endTime: data.endTime,
    stock: Number(data.stock),
    soldCount: 0,
    approved: true,
    updatedAt: Date.now()
  };

  const productUpdates: Record<string, any> = {
    flashSale: flashSalePayload,
    flashSaleActive: flashSalePayload.active,
    flashSalePrice: flashSalePayload.flashPrice,
    flashSaleStartTime: flashSalePayload.startTime,
    flashSaleEndTime: flashSalePayload.endTime,
    flashSaleStock: flashSalePayload.stock,
    flashSaleApproved: true,
    updatedAt: Date.now()
  };

  // 1. Update in RTDB products
  await rtdbUpdate(`products/${productId}`, productUpdates);

  // 2. Also register in flash_sales node for fast index
  await rtdbSet(`flash_sales/${productId}`, {
    productId,
    vendorId,
    ...flashSalePayload
  });

  // 3. Sync to server API if available
  fetch(`/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productUpdates)
  }).catch(() => {});

  return flashSalePayload;
}

/**
 * Toggle flash sale active/inactive
 */
export async function toggleProductFlashSaleStatus(productId: string, active: boolean) {
  const updates = {
    'flashSale/active': active,
    flashSaleActive: active,
    updatedAt: Date.now()
  };
  await rtdbUpdate(`products/${productId}`, updates);
  await rtdbUpdate(`flash_sales/${productId}`, { active, updatedAt: Date.now() }).catch(() => {});
  
  fetch(`/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flashSaleActive: active })
  }).catch(() => {});
}

/**
 * Remove flash sale from product
 */
export async function removeProductFlashSale(productId: string) {
  const updates = {
    flashSale: null,
    flashSaleActive: false,
    flashSalePrice: null,
    flashSaleStartTime: null,
    flashSaleEndTime: null,
    flashSaleStock: null,
    updatedAt: Date.now()
  };
  await rtdbUpdate(`products/${productId}`, updates);
  await rtdbSet(`flash_sales/${productId}`, null).catch(() => {});

  fetch(`/api/products/${productId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flashSaleActive: false, flashSale: null })
  }).catch(() => {});
}

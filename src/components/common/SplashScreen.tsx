import React, { useEffect } from 'react';
import { getCachedMarketplaceProducts, subscribeToMarketplaceProducts } from '../../services/productService';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

/**
 * SplashScreen coordinator:
 * The visual animation is hardware-accelerated directly in the root HTML,
 * ensuring immediate 0ms launch, zero jank, and high-performance 60fps GPU rendering.
 * Product data loads simultaneously in the background so by the time the initial
 * animation finishes, product cards are ready to display immediately without delay.
 */
export default function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    let marked = false;
    const notifyReady = () => {
      if (marked) return;
      marked = true;
      if (typeof window !== 'undefined' && typeof (window as any).markAppReady === 'function') {
        (window as any).markAppReady();
      }
      if (onFinish) onFinish();
    };

    // If products are already in memory or localStorage cache, mark ready immediately
    const cachedProds = getCachedMarketplaceProducts();
    if (cachedProds && cachedProds.length > 0) {
      notifyReady();
    } else {
      // Otherwise, wait for the background product fetch to deliver items
      const unsubscribe = subscribeToMarketplaceProducts((liveProducts) => {
        if (liveProducts && liveProducts.length > 0) {
          notifyReady();
        }
      });

      // Safety fallback timer: guarantee dismissal after 3.2s so it never hangs if network fails
      const fallbackTimer = setTimeout(() => {
        notifyReady();
      }, 3200);

      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
        clearTimeout(fallbackTimer);
      };
    }
  }, [onFinish]);

  // Avoid duplicate DOM rendering to prevent hanging or duplicate logos
  return null;
}


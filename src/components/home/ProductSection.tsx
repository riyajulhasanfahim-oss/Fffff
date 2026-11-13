import React, { memo } from 'react';
import { ArrowRight, Flame, Sparkles, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard, { Product } from '../ui/ProductCard';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllLink?: string;
  bgWhite?: boolean;
  icon?: 'flame' | 'star' | 'sparkles' | 'clock';
  hasCountdown?: boolean;
  badge?: string;
  initialLimit?: number;
}

const ProductSection = memo(function ProductSection({ 
  title, 
  subtitle, 
  products, 
  viewAllLink, 
  bgWhite = true,
  icon,
  hasCountdown = false,
  badge,
  initialLimit
}: ProductSectionProps) {
  if (!products || products.length === 0) return null;

  const displayedProducts = products;

  return (
    <section className={`py-1 sm:py-2.5 lg:py-3.5 ${bgWhite ? 'bg-white' : 'bg-slate-50'} transition-colors`}>
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {icon === 'flame' && (
                <span className="p-1 rounded-lg bg-rose-100 text-rose-600 animate-pulse">
                  <Flame className="w-4 h-4 fill-rose-500" />
                </span>
              )}
              {icon === 'sparkles' && (
                <span className="p-1 rounded-lg bg-amber-100 text-amber-600">
                  <Sparkles className="w-4 h-4" />
                </span>
              )}
              {icon === 'clock' && (
                <span className="p-1 rounded-lg bg-sky-100 text-sky-600">
                  <Clock className="w-4 h-4" />
                </span>
              )}
              
              <h2 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {title}
              </h2>

              {badge && (
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-2xs">
                  {badge}
                </span>
              )}
            </div>

            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                {subtitle}
              </p>
            )}
          </div>

          {/* View All Link */}
          {viewAllLink && (
            <Link 
              to={viewAllLink}
              className="inline-flex items-center self-start sm:self-auto gap-1 text-xs sm:text-sm font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100/80 px-3.5 py-1.5 rounded-full transition-all group cursor-pointer shrink-0"
            >
              <span>সব দেখুন</span>
              <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {/* Responsive Product Grid: 2 cols on mobile, 3 on tablet, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {displayedProducts.map((product) => (
            <div key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
});

export default ProductSection;

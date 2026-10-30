import React from 'react';
import { ExternalLink, Play } from 'lucide-react';

interface YouTubeTutorialBannerProps {
  className?: string;
}

export default function YouTubeTutorialBanner({
  className = '',
}: YouTubeTutorialBannerProps) {
  const tutorialUrl = 'https://youtu.be/wghml925xKU?si=ReRPki2dB-EJOwhp';

  return (
    <a
      href={tutorialUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="YouTube Tutorial: কিভাবে রিসেলার একাউন্ট খুলবেন ও কাজ করবেন দেখুন"
      className={`group relative flex items-center justify-between gap-2 sm:gap-3 w-full rounded-xl bg-gradient-to-r from-red-500/[0.07] via-white to-red-500/[0.04] border border-red-200 hover:border-red-400 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-[0.99] cursor-pointer overflow-hidden ${className}`}
    >
      {/* Sleek top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-rose-500 to-red-500 opacity-90 group-hover:opacity-100 transition-opacity" />

      {/* Left: YouTube Red Logo + Bengali Text */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {/* Compact YouTube Red Icon */}
        <div className="shrink-0 flex items-center justify-center">
          <div className="w-7 h-5 sm:w-8 sm:h-5.5 rounded-[5px] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform bg-[#FF0000]">
            <svg
              viewBox="0 0 68 48"
              className="w-full h-full p-0.5"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M66.52 7.74C65.74 4.8 63.45 2.5 60.52 1.72 55.22.3 34 .3 34 .3S12.78.3 7.48 1.72C4.55 2.5 2.26 4.8 1.48 7.74.07 13.06 0 24 0 24s.07 10.94 1.48 16.26c.78 2.94 3.07 5.24 6 6.02C12.78 47.7 34 47.7 34 47.7s21.22 0 26.52-1.42c2.93-.78 5.22-3.08 6-6.02C67.93 34.94 68 24 68 24s-.07-10.94-1.48-16.26Z"
                fill="#FF0000"
              />
              <polygon points="27,14 45,24 27,34" fill="#FFFFFF" />
            </svg>
          </div>
        </div>

        {/* Bengali Text */}
        <p className="text-[11px] sm:text-[13px] font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug truncate">
          কিভাবে রিসেলার একাউন্ট খুলবেন ও কাজ করবেন দেখুন 👇
        </p>
      </div>

      {/* Right: Compact Watch Button */}
      <div className="shrink-0 flex items-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold text-white bg-red-600 group-hover:bg-red-700 shadow-2xs transition-colors">
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>ভিডিও দেখুন</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-80 hidden xs:inline" />
        </span>
      </div>
    </a>
  );
}

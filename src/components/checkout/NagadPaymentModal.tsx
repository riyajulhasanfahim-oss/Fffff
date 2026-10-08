import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ChevronLeft, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface NagadPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  amount: number;
  invoiceId: string;
  nagadNumber?: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onVerify: (transactionId: string) => void;
}

export default function NagadPaymentModal({
  isOpen,
  onClose,
  onBack,
  amount,
  invoiceId,
  nagadNumber = '01864670673',
  isSubmitting = false,
  errorMessage,
  onVerify
}: NagadPaymentModalProps) {
  const navigate = useNavigate();
  const [transactionId, setTransactionId] = useState('');
  const isProcessingRef = React.useRef(false);

  React.useEffect(() => {
    if (!isSubmitting) {
      isProcessingRef.current = false;
    }
  }, [isSubmitting]);

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(nagadNumber);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = nagadNumber;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('নম্বরটি কপি করা হয়েছে!');
    } catch {
      toast.success('নম্বরটি কপি করা হয়েছে!');
    }
  };

  const handleVerify = () => {
    if (isSubmitting || isProcessingRef.current) return;
    const trimmed = transactionId.trim();
    if (!trimmed) {
      toast.error('অনুগ্রহ করে আপনার Transaction ID লিখুন');
      return;
    }
    isProcessingRef.current = true;
    onVerify(trimmed);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[420px] sm:max-w-[440px] max-h-[96vh] sm:max-h-[92vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl border border-gray-100 my-auto relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center justify-between bg-white shadow-2xs mb-2 sm:mb-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-700 transition-colors touch-manipulation cursor-pointer"
            title="হোম পেজে যান"
          >
            <Home className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-700 transition-colors touch-manipulation cursor-pointer"
            title="পূর্বের মেনুতে ফিরে যান"
          >
            <div className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-full border border-gray-400 flex items-center justify-center">
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 stroke-[2.5] -ml-0.5" />
            </div>
          </button>
        </div>

        {/* Brand & Nagad Logo Row */}
        <div className="grid grid-cols-12 gap-2 sm:gap-2.5 mb-2 sm:mb-2.5 shrink-0">
          {/* Left Brand Card */}
          <div className="col-span-8 border border-gray-200 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 sm:gap-2.5 bg-white shadow-2xs">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-gray-100 shadow-2xs shrink-0 flex items-center justify-center p-0.5 bg-white">
              <img
                referrerPolicy="no-referrer"
                src="https://i.postimg.cc/02BC9ZMs/file-00000000c36881fa822edc96c75d817a.png"
                alt="RJ WORLD BD"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-gray-900 text-xs sm:text-sm tracking-wide leading-tight truncate">
                RJ WORLD BD
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#0066ff] font-semibold mt-0.5 truncate">
                Invoice ID : <span className="text-gray-600 font-medium">{invoiceId}</span>
              </p>
            </div>
          </div>

          {/* Right Nagad Logo Card */}
          <div className="col-span-4 border border-gray-200 rounded-xl p-1.5 sm:p-2 flex items-center justify-center bg-white shadow-2xs">
            <div className="flex items-center justify-center h-7 sm:h-8 w-full">
              <svg viewBox="0 0 110 38" className="h-6 sm:h-7.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Nagad Swirl Icon */}
                <circle cx="20" cy="19" r="14" fill="#f7941d" />
                <path d="M20 7C23 10 24.5 14.5 22 18C19.5 21.5 15.5 22.5 13 26C11 22 12 16.5 15 12C16.8 9.5 18.5 8 20 7Z" fill="#ffffff"/>
                <circle cx="21" cy="17" r="3.5" fill="#ee3124"/>
                
                {/* "নগদ" text in red bold script */}
                <text x="40" y="22" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="18" fill="#d60000">নগদ</text>
                <text x="40" y="30" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" fontSize="6.5" fill="#555555">ডাক বিভাগের ডিজিটাল লেনদেন</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Red Nagad Instruction Box */}
        <div className="bg-[#c80000] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white shadow-sm overflow-y-auto min-h-0 flex-1 overscroll-contain">
          {/* Box Header */}
          <h4 className="text-center font-bold text-white text-xs sm:text-sm mb-1.5 sm:mb-2 tracking-wide select-none">
            ট্রানজেকশন আইডি দিন
          </h4>

          {/* Input field */}
          <div className="mb-2 sm:mb-2.5">
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="ট্রানজেকশন আইডি দিন"
              className="w-full bg-white rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 text-center font-bold text-gray-800 text-xs sm:text-sm placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-yellow-300 shadow-xs touch-manipulation"
            />
            {errorMessage && (
              <div className="mt-1.5 p-1.5 bg-red-900/90 border border-yellow-300/60 rounded-lg text-yellow-100 text-[11px] font-bold text-center shadow-inner">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Instruction Bullet Points */}
          <div className="text-[10.5px] sm:text-[11.5px] font-medium leading-tight sm:leading-snug space-y-1 sm:space-y-1.5 select-none">
            {/* 1 */}
            <div className="border-b border-red-400/40 pb-1 sm:pb-1.5">
              <span className="font-bold mr-1">•</span>
              *167# ডায়াল করে আপনার NAGAD মোবাইল মেনুতে যান অথবা NAGAD অ্যাপে যান।
            </div>

            {/* 2 */}
            <div className="border-b border-red-400/40 pb-1 sm:pb-1.5">
              <span className="font-bold mr-1">•</span>
              <span className="text-[#ffd200] font-bold">"Send Money"</span> -এ ক্লিক করুন।
            </div>

            {/* 3: NAGAD Number with Copy Button */}
            <div className="border-b border-red-400/40 pb-1 sm:pb-1.5 flex flex-wrap items-center">
              <span className="font-bold mr-1">•</span>
              <span>প্রাপক নম্বর হিসেবে এই নম্বরটি লিখুনঃ&nbsp;</span>
              <span className="text-[#ffd200] font-extrabold tracking-wider">{nagadNumber}</span>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="ml-1.5 inline-flex items-center gap-1 bg-black/35 hover:bg-black/50 active:bg-black/60 active:scale-95 text-white text-[9.5px] sm:text-[10.5px] font-bold px-1.5 py-0.5 rounded transition-all shadow-2xs cursor-pointer touch-manipulation"
                title="নম্বর কপি করুন"
              >
                <Copy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Copy</span>
              </button>
            </div>

            {/* 4: Dynamic Amount */}
            <div className="border-b border-red-400/40 pb-1 sm:pb-1.5">
              <span className="font-bold mr-1">•</span>
              টাকার পরিমাণঃ <span className="text-[#ffd200] font-extrabold">৳{amount.toFixed(2)}</span>
            </div>

            {/* 5 */}
            <div className="border-b border-red-400/40 pb-1 sm:pb-1.5">
              <span className="font-bold mr-1">•</span>
              নিশ্চিত করতে এখন আপনার NAGAD মোবাইল মেনু পিন লিখুন।
            </div>

            {/* 6 */}
            <div className="border-b border-red-400/40 pb-1 sm:pb-1.5">
              <span className="font-bold mr-1">•</span>
              সবকিছু ঠিক থাকলে, আপনি NAGAD থেকে একটি নিশ্চিতকরণ বার্তা পাবেন।
            </div>

            {/* 7 */}
            <div className="pt-0.5">
              <span className="font-bold mr-1">•</span>
              এখন উপরের বক্সে আপনার <span className="text-[#ffd200] font-bold">Transaction ID</span> দিন এবং নিচের <span className="text-[#ffd200] font-bold">VERIFY</span> বাটনে ক্লিক করুন।
            </div>
          </div>
        </div>

        {/* VERIFY Button */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={isSubmitting}
          className="w-full bg-[#c80000] hover:bg-[#b00000] active:bg-[#900000] disabled:opacity-50 text-white font-black py-2.5 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-sm sm:text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center tracking-wider select-none touch-manipulation cursor-pointer min-h-[44px] sm:min-h-[48px] shrink-0 mt-2 sm:mt-2.5"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span>Verifying payment...</span>
            </span>
          ) : (
            'VERIFY'
          )}
        </button>
      </div>
    </div>
  );
}

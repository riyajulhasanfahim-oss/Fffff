import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Star, 
  UploadCloud, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  PackageCheck,
  Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitProductReview } from '../../services/reviewService';
import { StorageManager, uploadImageToHosting } from '../../services/storage/StorageManager';
import toast from 'react-hot-toast';
import { formatDirectImageUrl, handleProductImageError, PLACEHOLDER_PRODUCT_IMAGE } from '../../utils/imageUrl';

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productId: string;
  productName: string;
  productImage?: string;
  vendorId?: string;
  vendorName?: string;
  onSuccess?: (reviewId: string) => void;
}

const RATING_DESCRIPTIONS = [
  { stars: 1, labelBn: 'খুব খারাপ', labelEn: 'Poor', color: 'text-rose-500' },
  { stars: 2, labelBn: 'চলনসই', labelEn: 'Fair', color: 'text-amber-500' },
  { stars: 3, labelBn: 'ভালো', labelEn: 'Good', color: 'text-yellow-500' },
  { stars: 4, labelBn: 'খুব ভালো', labelEn: 'Very Good', color: 'text-lime-600' },
  { stars: 5, labelBn: 'অসাধারণ', labelEn: 'Excellent', color: 'text-emerald-600' }
];

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  productId,
  productName,
  productImage,
  vendorId,
  vendorName,
  onSuccess
}: ReviewModalProps) {
  const { user, userData } = useAuth();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeRating = hoverRating || rating;
  const ratingInfo = RATING_DESCRIPTIONS.find(r => r.stars === activeRating) || RATING_DESCRIPTIONS[4];
  const cleanOrderId = String(orderId || '').replace(/^#/, '');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      toast.error('সর্বোচ্চ ৪টি ছবি যুক্ত করতে পারবেন (Maximum 4 photos allowed)');
      return;
    }

    setUploadingImage(true);
    const toastId = toast.loading('ছবি হোস্টিং এ আপলোড হচ্ছে... (Uploading to hosting API...)');
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} সর্বোচ্চ ১০MB পর্যন্ত হতে পারে`);
          continue;
        }

        try {
          // 1. Primary: Upload to Image Hosting API (ImgBB / FreeImage API key)
          const hostedUrl = await uploadImageToHosting(file);
          if (hostedUrl) {
            newUrls.push(hostedUrl);
          }
        } catch (uploadErr) {
          console.warn('Image hosting API upload fallback:', uploadErr);
          // 2. Fallback via StorageManager
          try {
            const stored = await StorageManager.uploadProductImage(file);
            if (stored?.fileUrl) {
              newUrls.push(stored.fileUrl);
            }
          } catch (smErr) {
            console.error('All image upload providers failed:', smErr);
            toast.error(`${file.name} আপলোড ব্যর্থ হয়েছে`);
          }
        }
      }

      if (newUrls.length > 0) {
        setImages(prev => [...prev, ...newUrls].slice(0, 4));
        toast.success(`${newUrls.length}টি ছবি সফলভাবে হোস্টিং করা হয়েছে!`, { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('ছবি আপলোড করতে ব্যর্থ হয়েছে', { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('রিভিউ দিতে দয়া করে লগইন করুন (Please log in to submit a review)');
      return;
    }

    if (!rating || rating < 1) {
      toast.error('রেটিং নির্বাচন করুন (Please select a star rating)');
      return;
    }

    if (!reviewText.trim()) {
      toast.error('অনুগ্রহ করে পণ্যের সম্পর্কে আপনার মন্তব্য লিখুন (Please share your feedback)');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitProductReview({
        orderId,
        productId,
        productName,
        productImage,
        userId: user.uid,
        reviewerName: userData?.name || user.displayName || 'সম্মানিত ক্রেতা',
        reviewerPhoto: userData?.photo || user.photoURL || '',
        rating,
        text: reviewText.trim(),
        images,
        vendorId,
        vendorName,
        accountType: userData?.accountType || (userData as any)?.role
      });

      if (result.success && result.reviewId) {
        toast.success(result.message || 'ধন্যবাদ! আপনার রিভিউ সফলভাবে জমা হয়েছে।', {
          duration: 4000,
          icon: '⭐'
        });
        if (onSuccess) {
          onSuccess(result.reviewId);
        }
        onClose();
      } else {
        toast.error(result.error || 'রিভিউ সাবমিট করতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      toast.error(err?.message || 'রিভিউ সাবমিট করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[94dvh] my-auto"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-primary-main/10 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Star className="w-4 h-4 fill-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Write a Product Review
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Delivered Order #{cleanOrderId}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Delivered Product Card */}
          <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
              <img
                src={formatDirectImageUrl(productImage) || PLACEHOLDER_PRODUCT_IMAGE}
                referrerPolicy="no-referrer"
                alt={productName}
                onError={(e) => handleProductImageError(e)}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                Delivered
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-1 mt-0.5">
                {productName}
              </p>
              <p className="text-[11px] text-slate-500">
                Verified Purchase Review
              </p>
            </div>
          </div>

          {/* Star Rating Section */}
          <div className="text-center py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 p-3 sm:p-4">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              আপনার রেটিং নির্বাচন করুন (Select Star Rating)
            </label>
            <div className="flex items-center justify-center gap-1.5 sm:gap-3">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = star <= activeRating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 sm:p-1.5 transition-transform active:scale-90 hover:scale-110 cursor-pointer focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300 fill-transparent hover:text-amber-200'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs font-bold transition-all">
              <span className={ratingInfo.color}>
                {ratingInfo.stars}★ {ratingInfo.labelBn} ({ratingInfo.labelEn})
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                আপনার মতামত লিখুন (Your Review) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {reviewText.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="প্রোডাক্টের মান কেমন? প্যাকেজিং ও ডেলিভারি কেমন ছিল? আপনার বাস্তব অভিজ্ঞতা বিস্তারিত লিখুন..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
              required
            />
          </div>

          {/* Photo Attachments with Image Hosting */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800">
                প্রোডাক্টের ছবি যুক্ত করুন (Add Photos - Optional)
              </label>
              <span className="text-[10px] text-emerald-600 font-medium">
                Cloud Hosted
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Image Previews */}
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-xs group"
                >
                  <img
                    src={formatDirectImageUrl(img) || img}
                    referrerPolicy="no-referrer"
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Prominent Remove Button for Mobile & Desktop */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-rose-600 hover:bg-rose-700 active:scale-90 text-white rounded-full flex items-center justify-center shadow-md cursor-pointer z-10 transition-transform"
                    title="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              {images.length < 4 && (
                <label className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 flex flex-col items-center justify-center text-slate-400 hover:text-amber-600 transition-all cursor-pointer shrink-0">
                  {uploadingImage ? (
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-bold">+Photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingImage}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              সর্বোচ্চ ৪টি ছবি যুক্ত করতে পারেন (Images hosted directly via API)
            </p>
          </div>

          {/* Notice */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>এক ক্রয়ে একটি রিভিউ:</strong> শুধুমাত্র সফলভাবে ডেলিভারি হওয়া পণ্যের জন্য ১টি রিভিউ দেওয়া যাবে। একবার রিভিউ দিলে এই অর্ডারের জন্য রিভিউ সংরক্ষিত হয়ে যাবে।
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-center"
            >
              বাতিল (Cancel)
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage || !reviewText.trim()}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>জমা হচ্ছে... (Submitting...)</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 fill-white" />
                  <span>Submit Review (রিভিউ জমা দিন)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


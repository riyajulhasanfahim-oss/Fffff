import React, { useRef, useState } from 'react';
import { 
  Building2, 
  X, 
  Printer, 
  Download,
  ShieldCheck, 
  Award, 
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useLanguage } from '../common/LanguageProvider';

export interface CertificateData {
  certificateNumber: string;
  shareholderName: string;
  guardianName?: string;
  address?: string;
  shareholderId: string;
  approvedSharePercentage: number;
  verifiedPurchaseAmount: number;
  shareUnits: number;
  issueDate: number;
  signatoryTitle: string;
  companyName: string;
  authorizedSignatory: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateData | null;
}

export default function OfficialShareCertificateModal({ isOpen, onClose, certificate }: Props) {
  const { language } = useLanguage();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !certificate) return null;

  const formattedDate = certificate.issueDate 
    ? new Date(certificate.issueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'N/A';

  // Direct high-resolution PDF download (works on mobile Android & desktop)
  const handleDownloadPdf = async () => {
    if (!certificateRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const element = certificateRef.current;

      // Render crisp high-DPI image of the pure certificate node
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2.5,
        backgroundColor: '#FAF8F5',
        cacheBust: true,
      });

      // Construct A4 PDF document (210 x 297 mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10; // 10mm margins
      const maxContentWidth = pdfWidth - margin * 2; // 190mm
      const maxContentHeight = pdfHeight - margin * 2; // 277mm

      let finalWidth = maxContentWidth;
      let finalHeight = (imgProps.height * finalWidth) / imgProps.width;

      if (finalHeight > maxContentHeight) {
        finalHeight = maxContentHeight;
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
      }

      // Center horizontally and vertically on A4 page
      const posX = (pdfWidth - finalWidth) / 2;
      const posY = (pdfHeight - finalHeight) / 2;

      pdf.addImage(dataUrl, 'PNG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');

      const cleanCertNo = (certificate.certificateNumber || 'RJ-CERT').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`RJ_WORLD_BD_Certificate_${cleanCertNo}.pdf`);

      toast.success(
        language === 'bn' 
          ? 'শেয়ার সার্টিফিকেট PDF ডাউনলোড সম্পন্ন হয়েছে' 
          : 'Share Certificate PDF downloaded successfully'
      );
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error(
        language === 'bn'
          ? 'সরাসরি PDF ডাউনলোড ব্যর্থ হয়েছে, প্রিন্ট মোড চালু করা হচ্ছে...'
          : 'Direct PDF download failed, launching print preview...'
      );
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dedicated Browser Print / Save as PDF handler
  const handlePrint = () => {
    document.body.classList.add('printing-shareholder-certificate');
    const cleanup = () => {
      document.body.classList.remove('printing-shareholder-certificate');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 2000);
    }, 150);
  };

  return (
    <div 
      id="certificate-modal-overlay" 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div 
        id="certificate-modal-container" 
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]"
      >
        {/* Modal Top Bar - Hidden during print */}
        <div className="bg-slate-900 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between text-white border-b border-slate-800 gap-3 print:hidden no-print">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-bold text-xs sm:text-base text-white tracking-wide">
                {language === 'bn' ? 'অফিসিয়াল শেয়ার সার্টিফিকেট' : 'Official Share Certificate'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono break-all">
                {certificate.certificateNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Direct High-Resolution PDF Download Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
              title="Download high quality PDF file directly"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'তৈরি হচ্ছে...' : 'Saving PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>{language === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF'}</span>
                </>
              )}
            </button>

            {/* Browser Print / Save as PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Print or Save via Browser dialog"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Preview & Print Container */}
        <div className="p-2 sm:p-5 md:p-8 overflow-y-auto bg-slate-100/70 print:p-0 print:bg-white flex justify-center">
          {/* Certificate Inner Frame - Complete Document from Top to Bottom */}
          <div 
            id="official-shareholder-certificate"
            ref={certificateRef}
            className="w-full max-w-[760px] bg-[#FAF8F5] text-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-8 md:p-10 border-4 sm:border-6 md:border-8 border-double border-[#8B7355] relative shadow-lg print:shadow-none print:border-8 print:m-0 print:p-8 box-border"
          >
            {/* Corner Decorative Accents */}
            <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 border-t-2 border-l-2 border-[#8B7355]"></div>
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 border-t-2 border-r-2 border-[#8B7355]"></div>
            <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 border-b-2 border-l-2 border-[#8B7355]"></div>
            <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2 w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 border-b-2 border-r-2 border-[#8B7355]"></div>

            {/* Subtle Watermark Emblem */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
              <Building2 className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 text-slate-900" />
            </div>

            {/* Header / Brand */}
            <div className="text-center relative z-10 mb-5 sm:mb-8 border-b-2 border-[#8B7355]/30 pb-4 sm:pb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-sky-900 to-slate-900 text-sky-300 shadow-md mb-2 sm:mb-3 border border-amber-300/40">
                <Building2 className="w-7 h-7 sm:w-9 sm:h-9" />
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-serif font-black tracking-wider text-slate-900 uppercase">
                {certificate.companyName}
              </h1>
              <p className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-widest text-[#8B7355] uppercase mt-1">
                Corporate Equity & Shareholder Registry
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-slate-600 font-mono">
                <span>Certificate No: <strong className="text-slate-900 break-all">{certificate.certificateNumber}</strong></span>
                <span className="hidden sm:inline">•</span>
                <span>Shareholder ID: <strong className="text-slate-900 break-all">{certificate.shareholderId}</strong></span>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center mb-4 sm:mb-6 relative z-10">
              <span className="inline-block px-4 sm:px-6 py-1 rounded-full bg-amber-100/80 border border-amber-300/70 text-amber-900 text-[11px] sm:text-xs md:text-sm font-serif font-bold uppercase tracking-widest shadow-2xs">
                Certificate of Company Share Ownership
              </span>
            </div>

            {/* Legal Certification Statement */}
            <div className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-xs sm:text-sm md:text-base leading-relaxed text-slate-700 relative z-10 font-serif">
              <p>
                This certifies that following verified financial contribution and board ratification,
              </p>
              <div className="py-1 sm:py-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 font-sans tracking-wide underline decoration-[#8B7355]/40 underline-offset-4 sm:underline-offset-8 break-words">
                  {certificate.shareholderName}
                </h3>
                {certificate.guardianName && (
                  <p className="text-[11px] sm:text-xs text-slate-600 font-sans mt-1 sm:mt-1.5">
                    Care of / Guardian: <strong className="text-slate-800">{certificate.guardianName}</strong>
                  </p>
                )}
                {certificate.address && (
                  <p className="text-[11px] sm:text-xs text-slate-500 font-sans mt-0.5">
                    {certificate.address}
                  </p>
                )}
              </div>
              <p>
                is the recorded beneficial holder of{' '}
                <strong className="text-slate-950 font-sans font-black text-base sm:text-lg md:text-xl text-primary-main">
                  {certificate.approvedSharePercentage}%
                </strong>{' '}
                ({certificate.shareUnits} Equity Units) of ordinary equity shares in{' '}
                <strong className="text-slate-950">{certificate.companyName}</strong>, representing a fully verified purchase consideration of{' '}
                <strong className="text-slate-950 font-sans font-bold">
                  ৳{certificate.verifiedPurchaseAmount?.toLocaleString()} BDT
                </strong>.
              </p>
            </div>

            {/* Official Metrics Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-white/85 backdrop-blur-xs rounded-xl p-3 sm:p-4 border border-[#8B7355]/30 mb-6 sm:mb-8 text-center relative z-10 shadow-2xs">
              <div className="border-r border-[#8B7355]/20 last:border-0 p-1">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Share Percentage</div>
                <div className="text-sm sm:text-base md:text-lg font-black text-primary-main mt-0.5">{certificate.approvedSharePercentage}%</div>
              </div>
              <div className="sm:border-r border-[#8B7355]/20 last:border-0 p-1">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Share Units</div>
                <div className="text-sm sm:text-base md:text-lg font-black text-slate-900 mt-0.5">{certificate.shareUnits} Unit(s)</div>
              </div>
              <div className="border-r border-[#8B7355]/20 last:border-0 p-1">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verified Capital</div>
                <div className="text-sm sm:text-base md:text-lg font-black text-emerald-700 mt-0.5">৳{certificate.verifiedPurchaseAmount?.toLocaleString()}</div>
              </div>
              <div className="p-1">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ratification Date</div>
                <div className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-800 mt-0.5">{formattedDate}</div>
              </div>
            </div>

            {/* Signatory Footer */}
            <div className="pt-4 sm:pt-6 border-t-2 border-[#8B7355]/30 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 relative z-10 text-xs">
              {/* Seal Stamp */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-dashed border-[#8B7355] flex flex-col items-center justify-center text-[#8B7355] text-center p-1 shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 mb-0.5" />
                  <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-tighter">Verified Seal</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800 font-mono text-[10px] sm:text-[11px]">RJ WORLD BD EQUITY</div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">Official Electronic Record</div>
                </div>
              </div>

              {/* Authorized Signatory Info */}
              <div className="text-center sm:text-right">
                <div className="font-serif italic text-sm sm:text-base md:text-lg text-slate-900 font-bold mb-1 tracking-wide">
                  Rj World Bd Executive Committee
                </div>
                <div className="h-0.5 w-36 sm:w-44 bg-slate-400 mx-auto sm:ml-auto mb-1"></div>
                <div className="font-bold text-slate-800 text-[10px] sm:text-[11px]">{certificate.authorizedSignatory}</div>
                <div className="text-[9px] sm:text-[10px] text-slate-500">{certificate.signatoryTitle}</div>
              </div>
            </div>

            {/* Statutory Disclaimer at bottom */}
            <div className="mt-4 sm:mt-6 pt-2.5 sm:pt-3 border-t border-slate-200/80 text-center text-[9px] sm:text-[10px] text-slate-500 leading-normal">
              Notice: This certificate acknowledges shareholder equity records in RJ WORLD BD. Corporate dividends are contingent upon annual audited profit performance and are not guaranteed.
            </div>

          </div>
        </div>

        {/* Modal Bottom Close Action Bar - Hidden during print */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between print:hidden no-print">
          <span className="text-[11px] sm:text-xs text-slate-500">
            {language === 'bn' 
              ? 'হাই-কোয়ালিটি PDF ডাউনলোড করতে উপরের বাটনে ক্লিক করুন।' 
              : 'Click "Download PDF" above to save a crisp, high-quality document.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="sm:hidden px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {language === 'bn' ? 'PDF' : 'PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

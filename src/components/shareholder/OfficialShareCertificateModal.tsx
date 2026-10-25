import React, { useRef } from 'react';
import { 
  Building2, 
  X, 
  Printer, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  Hash, 
  Percent, 
  Lock
} from 'lucide-react';
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
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = certificate.issueDate 
    ? new Date(certificate.issueDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white tracking-wide">
                {language === 'bn' ? 'অফিসিয়াল শেয়ার সার্টিফিকেট' : 'Official Share Certificate'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {certificate.certificateNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'bn' ? 'সার্টিফিকেট প্রিন্ট / PDF' : 'Print / Save PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Area */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-100/70 print:p-0 print:bg-white" ref={printRef}>
          {/* Certificate Inner Frame */}
          <div className="bg-[#FAF8F5] text-slate-900 rounded-2xl p-6 sm:p-10 border-8 border-double border-[#8B7355] relative shadow-lg print:shadow-none print:border-8 print:m-0 print:p-8">
            
            {/* Corner Decorative Accents */}
            <div className="absolute top-2 left-2 w-7 h-7 border-t-2 border-l-2 border-[#8B7355]"></div>
            <div className="absolute top-2 right-2 w-7 h-7 border-t-2 border-r-2 border-[#8B7355]"></div>
            <div className="absolute bottom-2 left-2 w-7 h-7 border-b-2 border-l-2 border-[#8B7355]"></div>
            <div className="absolute bottom-2 right-2 w-7 h-7 border-b-2 border-r-2 border-[#8B7355]"></div>

            {/* Subtle Watermark Emblem */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
              <Building2 className="w-96 h-96 text-slate-900" />
            </div>

            {/* Header / Brand */}
            <div className="text-center relative z-10 mb-8 border-b-2 border-[#8B7355]/30 pb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-900 to-slate-900 text-sky-300 shadow-md mb-3 border border-amber-300/40">
                <Building2 className="w-9 h-9" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-serif font-black tracking-wider text-slate-900 uppercase">
                {certificate.companyName}
              </h1>
              <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#8B7355] uppercase mt-1">
                Corporate Equity & Shareholder Registry
              </p>
              <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-600 font-mono">
                <span>Certificate No: <strong className="text-slate-900">{certificate.certificateNumber}</strong></span>
                <span>•</span>
                <span>Shareholder ID: <strong className="text-slate-900">{certificate.shareholderId}</strong></span>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center mb-6 relative z-10">
              <span className="inline-block px-6 py-1 rounded-full bg-amber-100/80 border border-amber-300/70 text-amber-900 text-xs sm:text-sm font-serif font-bold uppercase tracking-widest">
                Certificate of Company Share Ownership
              </span>
            </div>

            {/* Legal Certification Statement */}
            <div className="text-center max-w-2xl mx-auto space-y-4 mb-8 text-sm sm:text-base leading-relaxed text-slate-700 relative z-10 font-serif">
              <p>
                This certifies that following verified financial contribution and board ratification,
              </p>
              <div className="py-2">
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-wide underline decoration-[#8B7355]/40 underline-offset-8">
                  {certificate.shareholderName}
                </h3>
                {certificate.guardianName && (
                  <p className="text-xs text-slate-600 font-sans mt-1.5">
                    Care of / Guardian: <strong className="text-slate-800">{certificate.guardianName}</strong>
                  </p>
                )}
                {certificate.address && (
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    {certificate.address}
                  </p>
                )}
              </div>
              <p>
                is the recorded beneficial holder of{' '}
                <strong className="text-slate-950 font-sans font-black text-lg sm:text-xl text-primary-main">
                  {certificate.approvedSharePercentage}%
                </strong>{' '}
                ({certificate.shareUnits} Equity Units) of ordinary equity shares in{' '}
                <strong>{certificate.companyName}</strong>, representing a fully verified purchase consideration of{' '}
                <strong className="text-slate-950 font-sans font-bold">
                  ৳{certificate.verifiedPurchaseAmount?.toLocaleString()} BDT
                </strong>.
              </p>
            </div>

            {/* Official Metrics Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 backdrop-blur-xs rounded-xl p-4 border border-[#8B7355]/30 mb-8 text-center relative z-10 shadow-2xs">
              <div className="border-r border-[#8B7355]/20 last:border-0 p-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Share Percentage</div>
                <div className="text-base sm:text-lg font-black text-primary-main mt-0.5">{certificate.approvedSharePercentage}%</div>
              </div>
              <div className="border-r border-[#8B7355]/20 last:border-0 p-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Share Units</div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{certificate.shareUnits} Unit(s)</div>
              </div>
              <div className="border-r border-[#8B7355]/20 last:border-0 p-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verified Capital</div>
                <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">৳{certificate.verifiedPurchaseAmount?.toLocaleString()}</div>
              </div>
              <div className="p-1">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Ratification Date</div>
                <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">{formattedDate}</div>
              </div>
            </div>

            {/* Signatory Footer */}
            <div className="pt-6 border-t-2 border-[#8B7355]/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10 text-xs">
              {/* Seal Stamp */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#8B7355] flex flex-col items-center justify-center text-[#8B7355] text-center p-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 mb-0.5" />
                  <span className="text-[8px] font-bold uppercase tracking-tighter">Verified Seal</span>
                </div>
                <div>
                  <div className="font-bold text-slate-800 font-mono text-[11px]">RJ WORLD BD EQUITY</div>
                  <div className="text-[10px] text-slate-500">Official Electronic Record</div>
                </div>
              </div>

              {/* Authorized Signatory Info */}
              <div className="text-center sm:text-right">
                <div className="font-serif italic text-base sm:text-lg text-slate-900 font-bold mb-1 tracking-wide">
                  Rj World Bd Executive Committee
                </div>
                <div className="h-0.5 w-44 bg-slate-400 mx-auto sm:ml-auto mb-1"></div>
                <div className="font-bold text-slate-800 text-[11px]">{certificate.authorizedSignatory}</div>
                <div className="text-[10px] text-slate-500">{certificate.signatoryTitle}</div>
              </div>
            </div>

            {/* Statutory Disclaimer at bottom */}
            <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500">
              Notice: This certificate acknowledges shareholder equity records in RJ WORLD BD. Corporate dividends are contingent upon annual audited profit performance and are not guaranteed.
            </div>

          </div>
        </div>

        {/* Modal Bottom Close Action */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500">
            {language === 'bn' ? 'ব্রাউজার ডায়ালগ থেকে সরাসরি প্রিন্ট বা সেভ করতে পারেন।' : 'You can print or save as PDF using the print button above.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

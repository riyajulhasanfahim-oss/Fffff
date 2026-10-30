import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '../common/LanguageProvider';

function TikTokIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-8 pb-16 md:pb-6 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              RJ <span className="text-primary-main">WORLD BD</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              {t('Your one-stop destination for premium products. Experience the best shopping journey with us.')}
            </p>
            <div className="flex space-x-2.5 pt-1">
              <a 
                href="https://www.facebook.com/rjworldbd" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Facebook" 
                className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-main hover:text-white transition-colors text-slate-300"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://www.tiktok.com/@rjworldbd.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="TikTok" 
                className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-main hover:text-white transition-colors text-slate-300"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
              <a 
                href="https://www.instagram.com/rjworldbd" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Instagram" 
                className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-main hover:text-white transition-colors text-slate-300"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://youtube.com/@rjworldbd_com" 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="YouTube" 
                className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary-main hover:text-white transition-colors text-slate-300"
              >
                <Youtube className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-sm sm:text-base font-bold text-white mb-2.5">{t('Quick Links')}</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li><Link to="/about" className="text-slate-400 hover:text-primary-main transition-colors">{t('About Us')}</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-primary-main transition-colors">{t('Contact Us')}</Link></li>
              <li><Link to="/products" className="text-slate-400 hover:text-primary-main transition-colors">{t('All Products')}</Link></li>
              <li><Link to="/faq" className="text-slate-400 hover:text-primary-main transition-colors">{t('FAQ')}</Link></li>
              <li><Link to="/blog" className="text-slate-400 hover:text-primary-main transition-colors">{t('Blog')}</Link></li>
              <li><Link to="/reseller/apply" className="text-slate-400 hover:text-primary-main transition-colors">{t('Reselling')}</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="col-span-1">
            <h3 className="text-sm sm:text-base font-bold text-white mb-2.5">{t('Customer Service')}</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              <li><Link to="/account" className="text-slate-400 hover:text-primary-main transition-colors">{t('My Account')}</Link></li>
              <li><Link to="/track-order" className="text-slate-400 hover:text-primary-main transition-colors">{t('Track Order')}</Link></li>
              <li><Link to="/returns" className="text-slate-400 hover:text-primary-main transition-colors">{t('Returns & Exchanges')}</Link></li>
              <li><Link to="/shipping" className="text-slate-400 hover:text-primary-main transition-colors">{t('Shipping Info')}</Link></li>
              <li><Link to="/privacy" className="text-slate-400 hover:text-primary-main transition-colors">{t('Privacy Policy')}</Link></li>
              <li><Link to="/company-share" className="text-slate-400 hover:text-primary-main transition-colors">{t('Share / Company Share')}</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-2 sm:col-span-1 md:col-span-1">
            <h3 className="text-sm sm:text-base font-bold text-white mb-2.5">{t('Contact Info')}</h3>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li className="flex items-center">
                <MapPin className="h-4 w-4 text-primary-main mr-2.5 shrink-0" />
                <span>{t('Bangladesh')}</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 text-primary-main mr-2.5 shrink-0" />
                <a href="tel:+8809638969026" className="hover:text-white transition-colors">+8809638969026</a>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 text-primary-main mr-2.5 shrink-0" />
                <a href="mailto:support.rjworld@gmail.com" className="break-all hover:text-white transition-colors">support.rjworld@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            &copy; {new Date().getFullYear()} RJ WORLD BD. {t('All rights reserved.')}
          </p>
          <div className="flex space-x-3 text-xs">
            <Link to="/terms" className="text-slate-500 hover:text-white transition-colors">{t('Terms of Service')}</Link>
            <span className="text-slate-700">|</span>
            <Link to="/privacy" className="text-slate-500 hover:text-white transition-colors">{t('Privacy Policy')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

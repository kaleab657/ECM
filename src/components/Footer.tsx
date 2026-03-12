import React from 'react';
import { Mail, Phone, MapPin, Send, Instagram, Facebook } from 'lucide-react';
import { Page } from '../types';
import { useAppContext } from '../context/AppContext';

// Simple TikTok icon since Lucide doesn't have one
const TikTokIcon = ({ size = 24, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

interface FooterProps {
  setPage: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ setPage }) => {
  const { t } = useAppContext();
  const handleLinkClick = (e: React.MouseEvent, page: Page) => {
    e.preventDefault();
    setPage(page);
    window.scrollTo(0, 0);
  };

  const socialLinks = [
    { icon: Send, url: 'https://t.me/ethiocars18', label: 'Telegram' },
    { icon: TikTokIcon, url: 'https://www.tiktok.com/@ethi.ocars', label: 'TikTok' },
    { icon: Instagram, url: 'https://www.instagram.com/@ethi.ocars', label: 'Instagram' },
    { icon: Facebook, url: 'https://www.facebook.com/share/18Aad51wxS/', label: 'Facebook' },
  ];

  return (
    <footer className="bg-zinc-950 dark:bg-black text-zinc-500 pt-20 pb-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <p className="text-sm leading-relaxed max-w-xs">
              {t('hero.subtitle')}
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a 
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-400 hover:bg-brand hover:text-white transition-all"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">{t('footer.quickLinks')}</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" onClick={(e) => handleLinkClick(e, 'browse')} className="hover:text-brand transition-colors">{t('footer.browseInventory')}</a></li>
              <li><a href="#" onClick={(e) => handleLinkClick(e, 'valuation')} className="hover:text-brand transition-colors">{t('footer.valuation')}</a></li>
              <li><a href="#" onClick={(e) => handleLinkClick(e, 'chat')} className="hover:text-brand transition-colors">{t('footer.messages')}</a></li>
              <li><a href="#" onClick={(e) => handleLinkClick(e, 'saved')} className="hover:text-brand transition-colors">{t('footer.selectedVehicles')}</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-zinc-900 flex flex-col items-center justify-center text-[10px] font-bold uppercase tracking-widest text-center">
          <p>&copy; {new Date().getFullYear()} EthioCars. {t('footer.rights') || 'All rights reserved.'}</p>
        </div>
      </div>
    </footer>
  );
};

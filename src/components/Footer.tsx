import React from 'react';
import { Send, Instagram, Facebook } from 'lucide-react';
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
  
  const socialLinks = [
    { icon: Send, url: 'https://t.me/ethiocars18', label: 'Telegram' },
    { icon: TikTokIcon, url: 'https://www.tiktok.com/@ethi.ocars', label: 'TikTok' },
    { icon: Instagram, url: 'https://www.instagram.com/@ethi.ocars', label: 'Instagram' },
    { icon: Facebook, url: 'https://www.facebook.com/share/18Aad51wxS/', label: 'Facebook' },
  ];

  return (
    <footer className="bg-transparent pb-8 pt-4">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="flex gap-4">
            {socialLinks.map((social) => (
              <a 
                key={social.label}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-brand hover:text-white transition-all shadow-sm"
                aria-label={social.label}
              >
                <social.icon size={18} />
              </a>
            ))}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 text-center">
            <p>&copy; {new Date().getFullYear()} EthioCars. {t('footer.rights') || 'All rights reserved.'}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

